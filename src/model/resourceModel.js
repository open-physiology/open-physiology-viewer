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

import JSONPath from 'JSONPath';
import {getClassName, schemaClassModels, isClassAbstract, getNewID, getID, $Field, $SchemaType} from "./utils";
import {logger, $LogMsg} from './logger';
/**
 * JSON Path validator
 * @type {JSONPath}
 */


/**
 * The class defining common methods for all resources
 * @class
 * @property {string} id
 * @property {string} name
 * @property {string} class
 * @property {Object} JSON
 * @property {Array<Object>} assign
 * @property {Array<Object>} interpolate
 * @property {Object} generatedFrom
 */
export class Resource{
    static get Model(){return schemaClassModels[this.name]};

    constructor(id) {
        this::merge(schemaClassModels[this.constructor.name].defaultValues);
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
        let difference = json::keys().filter(x => !modelClasses[clsName].Model.fieldNames.find(y => y === x)).filter(x => !["_inactive"].includes(x));
        if (difference.length > 0) {
            logger.warn(`Unknown parameter(s) in class ${this.name} may be ignored: `, difference.join(","));
        }

        res::assign(json);

        if (entitiesByID){
            if (!res.id) { res.id = getNewID(entitiesByID); }
            if (res.id::isNumber()){
                res.id = res.id.toString();
                logger.warn($LogMsg.RESOURCE_NUM_ID_TO_STR, res.id);
            }

            if (entitiesByID[res.id]) {
                if (entitiesByID[res.id] !== res){
                    logger.warn($LogMsg.RESOURCE_NOT_UNIQUE, entitiesByID[res.id], res);
                }
            } else {
                entitiesByID[res.id] = res;
                res.reviseWaitingList(entitiesByID.waitingList);
                res.replaceIDs(modelClasses, entitiesByID);
            }
        }
        return res;
    }

    /**
     * Replace IDs with object references
     * @param {Object} modelClasses - map of class names vs implementation of ApiNATOMY resources
     * @param {Map<string, Resource>} entitiesByID - map of resources in the global model
     */
    replaceIDs(modelClasses, entitiesByID){
        const skip = value => !value || value::isObject() && value::isEmpty() || value.class && (value instanceof modelClasses[value.class]);

        const createObj = (res, key, value, spec) => {
            if (skip(value)) { return value; }

            if (value::isNumber()) {
                value = value.toString();
                logger.warn($LogMsg.RESOURCE_NUM_VAL_TO_STR, value, res.id, key);
            }

            let clsName = getClassName(spec);
            if (!clsName){
                logger.warn($LogMsg.RESOURCE_NO_CLASS,
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
                    logger.warn($LogMsg.RESOURCE_DUPLICATE, res.id, key, value, entitiesByID[value.id]);
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

        let refFields = this.constructor.Model.relationships;
        let res = this;
        refFields.forEach(([key, spec]) => {
            if (skip(res[key])) { return; }
            if (res[key]::isArray()){
                res[key] = res[key].map(value => createObj(res, key, value, spec));
            } else {
                res[key] = createObj(res, key, res[key], spec);
                if (spec.type === $SchemaType.ARRAY){ //The spec expects multiple values, replace an object with an array of objects
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
                //TODO - fix me: we may need to call JSONPath asynchronously and race with the timer as JSONPath may get stuck
                let entities = (JSONPath({json: this, path: path}) || []).filter(e => !!e);
                entities.forEach(e => {
                    if (!modelClasses[e.class]){
                        logger.warn($LogMsg.RESOURCE_CLASS_UNKNOWN, e);
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
                                logger.info($LogMsg.RESOURCE_JSON_PATH, key, e.id);
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
            logger.error(`Failed to process assignment statements for ${this.id}`, this.assign);
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
                        let propNames = modelClasses[e.class].Model.propertyNames.filter(e => e !== $Field.id);
                        e::merge(value::pick(propNames));
                    }
               });
            })
        } catch (err){
            logger.error(`Failed to process assignment statements for ${this.id}`, this.assign);
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
                    logger.warn($LogMsg.RESOURCE_COLOR_UNKNOWN, scheme);
                    return;
                }
                if (!length) { length = resources.length; }
                if (!offset) { offset = 0; }

                const getColor = i => colorSchemes[scheme](((reversed)? 1 - offset - i / length : offset + i / length));
                const assignColor = items => {
                    (items||[]).forEach((item, i) => {
                        if (!item::isObject()) {
                            logger.warn($LogMsg.RESOURCE_COLOR_NO_OBJECT);
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
                if (otherSpec.type === $SchemaType.ARRAY) {
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
                            logger.warn(`Resource property cannot refer to two distinct resources:`, obj.id, key2, obj[key2].id, res.id);
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
             let refFields = entitiesByID[id].constructor.Model.relationships;
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
     * @param depth     - depth of nested objects in the recursive calls
     */
    toJSON(depth = 1, inlineResources = {}){
        /**
         * Converts a resource object into serializable JSON.
         * May fail to serialize recursive objects which are not instances of Resource
         * @param value - resource object
         * @param depth - depth of nested resources to output
         * @returns {*} JSON object without circular references         *
         */
        function valueToJSON(value, depth) { return (value instanceof Resource)? value.toJSON(depth-1, inlineResources): value }

        /**
         * Serializes field value: array or object
         * @param value - resource field value
         * @param depth - depth of nested resources to output
         * @returns {*} JSON object or an array of JSON objects without circular references
         */
        function fieldToJSON(value, depth) { return value::isArray()? value.filter(e => !!e).map(e => valueToJSON(e, depth)): valueToJSON(value, depth); }

        if (depth <= 0) {
            return this.id? this.id: null;
        }

        let res = {};
        const omitKeys = (this::keys())::difference(this.constructor.Model.fieldNames).concat([$Field.viewObjects, $Field.infoFields, $Field.labels]);
        this::keys().filter(key => !!this[key] && !omitKeys.includes(key)).forEach(key => {
            res[key] = fieldToJSON(this[key], (inlineResources[key] || depth) - 1);
        });
        return res;
    }

    isGeneratedFrom(id){
        return (this.id === id || this.generatedFrom && this.generatedFrom.id === id);
    }

    /**
     * Checks if the current resource is derived from
     * The method makes more sense for lyphs, but it is useful to be able to test any resource, this simplifies filtering
     * @param supertypeID
     * @returns {boolean}
     */
    isSubtypeOf(supertypeID){
        let res = false;
        if (this.id === supertypeID) { res = true; }
        if (!res && this.supertype) {
            res = this.supertype.isSubtypeOf(supertypeID)
        }
        if (!res && this.cloneOf) {
            res = this.cloneOf.isSubtypeOf(supertypeID)
        }
        if (!res && this.layerIn) {
            res = this.layerIn.isSubtypeOf(supertypeID)
        }
        return res;
    }

    /**
     * Checks if the current resource carries a material.
     * The method makes more sense for lyphs, but it is useful to be able to test any resource, this simplifies filtering
     * @param materialID
     * @returns {*|void}
     */
    containsMaterial(materialID){
        let res = false;
        if (this.id === materialID) { res = true; }
        if (!res){
            res = (this.materials || []).find(e => e.containsMaterial(materialID));
        }
        if (!res && this.supertype) {
            res = this.supertype.containsMaterial(materialID)
        }
        if (!res && this.cloneOf) {
            res = this.cloneOf.containsMaterial(materialID)
        }
        if (!res && this.generatedFrom) {
            res = this.generatedFrom.containsMaterial(materialID)
        }
        return res;
    }
}

export class External extends Resource {}

