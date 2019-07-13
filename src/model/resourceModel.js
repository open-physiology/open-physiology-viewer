import * as colorSchemes from 'd3-scale-chromatic';
import {
    isArray,
    merge,
    isObject,
    isNumber,
    isString,
    keys,
    isEmpty,
    assign,
    defaults,
    pick,
    difference
} from 'lodash-bound';

import {JSONPath, getClassName, schemaClassModels, isClassAbstract, getNewID} from "./utils";
import {logger} from './logger';

/**
 * The class defining common methods for all resources
 * @class
 * @property {string} id
 * @property {string} name
 * @property {string} class
 * @property {Object} JSON
 * @property {Array<Object>} assign
 * @property {Array<Object>} interpolate
 *
 */
export class Resource{

    constructor(id) {
        this::merge(this.constructor.Model.defaultValues);
        this.id = id;
    }

    /**
     * Creates a Resource object from its JSON specification
     * @param   {Object} json                          - resource definition
     * @param   {Object} [modelClasses]                - map of class names vs implementation of ApiNATOMY resources
     * @param   {Map<string, Resource>} [entitiesByID] - map of resources in the global model
     * @returns {Resource} - ApiNATOMY resource
     */
    static fromJSON(json, modelClasses = {}, entitiesByID ){

        let clsName = json.class || this.name;
        const cls = this || modelClasses[clsName];
        const res = new cls(json.id);
        res.class = clsName;
        //spec
        let difference = json::keys().filter(x => !cls.Model.fieldNames.find(y => y === x));
        if (difference.length > 0) {
            logger.warn(`Unknown parameter(s) in class ${this.name} may be ignored: `, difference.join(","));
        }

        res::assign(json);

        if (entitiesByID){
            if (!res.id) { res.id = getNewID(entitiesByID); }
            if (res.id::isNumber()){
                res.id = res.id.toString();
                logger.warn(`Converted numeric ID ${res.id} to string`);
            }

            if (entitiesByID[res.id]) {
                if (entitiesByID[res.id] !== res){
                    logger.warn("Resources IDs are not unique: ", entitiesByID[res.id], res);
                }
            } else {
                entitiesByID[res.id] = res;
                res.reviseWaitingList(entitiesByID.waitingList);
                res.replaceIDs(modelClasses, entitiesByID);
            }
        }
        return res;
    }

    static get Model(){
        return schemaClassModels[this.name];
    }

    /**
     * Replace IDs with object references
     * @param {Object} modelClasses - map of class names vs implementation of ApiNATOMY resources
     * @param {Map<string, Resource>} entitiesByID - map of resources in the global model
     */
    replaceIDs(modelClasses, entitiesByID){
        const skip = (value) => !value || value::isObject() && value::isEmpty() || value.class && (value instanceof modelClasses[value.class]);

        const createObj = (res, key, value, spec) => {
            if (skip(value)) { return value; }

            if (value::isNumber()) {
                value = value.toString();
                logger.warn(`Converted numeric value ${value} of resource's ${res.id} field ${key} to string`);
            }

            let clsName = getClassName(spec);
            if (!clsName){
                logger.warn("Cannot extract the object class: property specification does not imply a reference",
                    spec, value);
                return value;
            }

            if (value && value::isString()) {
                if (!entitiesByID[value]) {
                    //put to a wait list instead
                    entitiesByID.waitingList[value] = entitiesByID.waitingList[value] || [];
                    entitiesByID.waitingList[value].push([res, key]);
                    return value;
                } else {
                    return entitiesByID[value];
                }
            }

            if (value.id && entitiesByID[value.id]) {
                if (value !== entitiesByID[value.id]) {
                    logger.warn("Duplicate resource definition:", value, entitiesByID[value.id]);
                }
                return entitiesByID[value.id];
            }

            //value is an object and it is not in the map
            if (isClassAbstract(clsName)){
                if (value.class) {
                    clsName = value.class;
                    if (!modelClasses[clsName]){
                        logger.error("Failed to find class definition", value.class, value);
                    }
                } else {
                    logger.error("An abstract relationship field expects a reference to an existing resource " +
                        " or 'class' field in its value definition: ", value);
                    return null;
                }
            }
            return modelClasses[clsName].fromJSON(value, modelClasses, entitiesByID);
        };

        if (!modelClasses[this.class]){
            logger.error("Class definitions not passed to resource constructor:", modelClasses, this.class);
            return;
        }

        let refFields = modelClasses[this.class].Model.relationships;
        let res = this;
        refFields.forEach(([key, spec]) => {
            if (skip(res[key])) { return; }
            if (res[key]::isArray()){
                res[key] = res[key].map(value => createObj(res, key, value, spec));
            } else {
                res[key] = createObj(res, key, res[key], spec);
                if (spec.type === "array"){//The spec expects multiple values, replace an object with an array of objects
                    res[key] = [res[key]];
                }
            }
        });
    };

    /**
     * Create relationships defined with the help of JSON path expressions in the resource 'assign' statements
     * @param {Object} modelClasses - map of class names vs implementation of ApiNATOMY resources
     * @param {Map<string, Resource>} entitiesByID - map of resources in the global model
     */
    assignPathRelationships(modelClasses, entitiesByID){
        if (!this.assign){ return;  }
        //Filter the value to assign only valid class properties
        try{
            [...(this.assign||[])].forEach(({path, value}) => {
                if (!path || !value) { return;}
                //TODO create a timer here as JSONPath can get stuck?
                let entities = (JSONPath({json: this, path: path}) || []).filter(e => !!e);
                entities.forEach(e => {
                    if (!modelClasses[e.class]){
                        logger.warn("Cannot create a relationship: unknown resource class", e);
                    } else {
                        let relNames = modelClasses[e.class].Model.relationshipNames;
                        let relMaps  = modelClasses[e.class].Model.relationshipMap;
                        let newValue = value::pick(relNames);
                        newValue::keys().forEach(key => {
                            if (relMaps[key]) {
                                if (newValue[key]::isArray()) {
                                    newValue[key] = newValue[key].map(id => entitiesByID[id])
                                } else {
                                    newValue[key] = entitiesByID[newValue[key]];
                                }
                                logger.info(`Created relationship via dynamic assignment: `, key, e.id, newValue[key]);
                            }
                        });
                        e::merge(newValue);
                        newValue::keys().forEach(key => {
                            if (relMaps[key]) {
                                e.syncRelationship(key, relMaps[key], modelClasses);
                            }
                        });
                    }
                });
            })
        } catch (err){
            logger.error(`Failed to process assignment statement ${this.assign} for ${this.id}`, err);
        }
    };

    /**
     * Assign properties to the objects specified with the help of JSON path expressions in the resource 'assign' statements
     * @param {Object} modelClasses - map of class names vs implementation of ApiNATOMY resources
     */
    assignPathProperties(modelClasses){
        if (!this.assign){ return;  }
        //Filter the value to assign only valid class properties
        try{
            [...(this.assign||[])].forEach(({path, value}) => {
                if (!path || !value) { return;}
                let entities = (JSONPath({json: this, path: path}) || []).filter(e => !!e);
                entities.forEach(e => {
                    if (!modelClasses[e.class]){
                        logger.warn("Cannot assign a property: unknown resource class", e);
                    } else {
                        let propNames = modelClasses[e.class].Model.propertyNames.filter(e => e !== "id");
                        e::merge(value::pick(propNames));
                    }
               });
            })
        } catch (err){
            logger.error(`Failed to process assignment statement ${this.assign} for ${this.id}`, err);
        }
    };

    /**
     * Assign properties to resources specified with the help of JSON path expressions in the resource 'interpolate'
     * statements
     */
    interpolatePathProperties(){
        [...(this.interpolate||[])].forEach(({path, offset, color}) => {

            let resources = path? JSONPath({json: this, path: path}) || []: [];
            if (offset){
                offset::defaults({
                    "start": 0,
                    "end": 1,
                    "step": (offset.end - offset.start) / (resources.length + 1)
                });
                resources.forEach((e, i) => e.offset = offset.start + offset.step * ( i + 1 ) );
            }
            if (color){
                let {scheme, length, reversed = false, offset} = color;
                if (!colorSchemes[scheme]) {
                    logger.warn("Unrecognized color scheme: ", scheme);
                    return;
                }
                if (!length) { length = resources.length; }
                if (!offset) { offset = 0; }

                const getColor = i => colorSchemes[scheme](((reversed)? 1 - offset - i / length : offset + i / length));
                const assignColor = items => {
                    (items||[]).forEach((item, i) => {
                        if (!item::isObject()) {
                            logger.warn("Cannot assign color to a non-object value");
                            return;
                        }
                        //If entity is an array, the schema is applied to each of it's items
                        if (item::isArray()){
                            assignColor(item);
                        } else {
                            item.color = getColor(i);
                        }
                    });
                };
                assignColor(resources);
            }
        })
    }

    /**
     * Waiting list keeps objects that refer to unresolved model resources.
     * When a new resource definition is found or created, all resources that referenced this resource by ID get the
     * corresponding object reference instead
     * @param {Map<string, Array<Resource>>} waitingList - associative array that maps unresolved IDs to the list of resource definitions that refer to it
     */
    reviseWaitingList(waitingList){
        let res = this;
        (waitingList[res.id]||[]).forEach(([obj, key]) => {
            if (obj[key]::isArray()){
                obj[key].forEach((e, i) => {
                   if (e === res.id){
                       obj[key][i] = res;
                   }
                });
            } else {
                if (obj[key] === res.id){
                    obj[key] = res;
                }
            }
        });
        delete waitingList[this.id];
    }

    /**
     * Synchronize a relationship field of the resource with its counterpart (auto-fill a field that is involved into a bi-directional relationship based on its partial definition, i.e., A.child = B yields B.parent = A).
     * @param {string} key    - property field that points to the related resource
     * @param {Object} spec   - JSON schema specification of the relationship field
     * @param {Object} modelClasses -  map of class names vs implementation of ApiNATOMY resources
     */
    syncRelationship(key, spec, modelClasses){
        let res = this;
        let key2 = spec.relatedTo;
        if (key2) {
            let otherClassName = getClassName(spec);
            if (!otherClassName) {
                logger.error("Class not defined: ", spec);
                return;
            }

            let otherSpec = modelClasses[otherClassName].Model.relationshipMap[key2];
            if (!otherSpec) {
                logger.error(`Property specification '${key2}' is not found in class:`, otherClassName);
                return;
            }

            const syncProperty = (obj) => {
                if (!obj || !obj::isObject()) { return; }
                if (otherSpec.type === "array") {
                    if (!obj[key2]) { obj[key2] = []; }
                    if (!(obj[key2]::isArray())) {
                        logger.warn(`Object's property '${key2}' should contain an array:`, obj);
                        obj[key2] = [obj[key2]];
                    }
                    if (!obj[key2].find(obj2 => obj2 === res)) {
                        obj[key2].push(res);
                    }
                } else {
                    if (!obj[key2]) {
                        obj[key2] = res;
                    }
                    else {
                        if (obj[key2] !== res) {
                            logger.warn(`Property "${key2}" of the first resource (${obj.class}) should match the second resource:`,
                                obj, res, obj[key2].id, res.id);
                        }
                    }
                }
            };

            if (res[key]::isArray()) {
                res[key].forEach(obj => syncProperty(obj))
            } else {
                syncProperty(res[key]);
            }
        }
    }

    /**
     * Synchronize all relationship properties of the resource
     * @param {Object} modelClasses - map of class names vs implementation of ApiNATOMY resources
     * @param {Map<string, Resource>} entitiesByID - map of resources in the global model
     */
    syncRelationships(modelClasses, entitiesByID){
        entitiesByID::keys().forEach(id => {
            if (!entitiesByID[id].class){ return; }
             let refFields = modelClasses[entitiesByID[id].class].Model.relationships;
             (refFields || []).forEach(([key, spec]) => {
                 if (!entitiesByID[id][key]) { return; }
                 entitiesByID[id].syncRelationship(key, spec, modelClasses);
             });
        });

        entitiesByID::keys().forEach(id => {
            if (!entitiesByID[id].class){ return; }
            entitiesByID[id].assignPathRelationships(modelClasses, entitiesByID);
        });

        //Assign visual properties to a complete map
        entitiesByID::keys().forEach(id => {
            if (!entitiesByID[id].class){ return; }
            entitiesByID[id].assignPathProperties(modelClasses);
            entitiesByID[id].interpolatePathProperties();
        });
    }

    /**
     * Prepare a circular resource object to be serialized in JSON.
     * @param depth     - remaining depth of nested objects in the recursive calls
     * @param initDepth - depth of nested objects to serialize (called with depth = 0 for resource map, depth = 1 for the main model)
     */
    toJSON(depth = 0, initDepth = depth){

        /**
         * Converts a resource object into serializable JSON.
         * May fail to serialize recursive objects which are not instances of Resource
         * @param value - resource object
         * @param depth - depth of nested resources to output
         * @param initDepth - initial depth of nested resources used in a recursive call to compute the remaining depth
         * @returns {*} JSON object without circular references         *
         */
        function valueToJSON(value, depth, initDepth) { return (value instanceof Resource)? ((depth > 0)? value.toJSON(depth - 1, initDepth): value.id): value.id? value.id: value }

        /**
         * Serializes field value: array or object
         * @param value - resource field value
         * @param depth - depth of nested resources to output
         * @param initDepth - initial depth of nested resources used in a recursive call to compute the remaining depth
         * @returns {*} JSON object or an array of JSON objects without circular references
         */
        function fieldToJSON(value, depth, initDepth) { return value::isArray()? value.filter(e => !!e).map(e => valueToJSON(e, depth, initDepth)): valueToJSON(value, depth, initDepth); }

        let omitKeys = this::keys()::difference(this.constructor.Model.fieldNames).concat(["viewObjects", "infoFields", "labels"]);
        let res = {};
        this::keys().filter(key => !!this[key] && !omitKeys.includes(key)).forEach(key => {
            let fieldDepth = (key === "border" || key === "borders")? initDepth: depth;
            res[key] = fieldToJSON(this[key], fieldDepth, initDepth);
        });
        return res;
    }

    /**
     * Checks if the current resource is derived from
     * The method makes more sense for lyphs, but it is useful to be able to test any resource, this simplifies filtering
     * @param supertypeID
     * @returns {boolean}
     */
    isSubtypeOf(supertypeID){
        let res = false;
        if (this.id === supertypeID){ res = true; }
        if (!res && this.supertype) { res = this.supertype.isSubtypeOf(supertypeID)}
        if (!res && this.cloneOf) { res = this.cloneOf.isSubtypeOf(supertypeID)}
        if (!res && this.layerIn) { res = this.layerIn.isSubtypeOf(supertypeID)}
        return res;
    }

    /**
     * Checks if the current resource carries a material.
     * The method makes more sense for lyphs, but it is useful to be able to test any resource, this simplifies filtering
     * @param materialID
     * @returns {*|void}
     */
    containsMaterial(materialID){
        let res = (this.materials||[]).find(e => e.id === materialID);
        if (!res && this.supertype) { res = this.supertype.containsMaterial(materialID)}
        if (!res && this.cloneOf) { res = this.cloneOf.containsMaterial(materialID)}
        if (!res && this.generatedFrom) { res = this.generatedFrom.containsMaterial(materialID)}
        return res;
    }
}

export class External extends Resource {}

