import * as colorSchemes from 'd3-scale-chromatic';
import {
    isArray,
    merge,
    isObject,
    keys,
    assign,
    defaults,
    pick,
    difference
} from 'lodash-bound';

import JSONPath from 'JSONPath';
import {
    $Field,
    getNewID,
    getFullID,
    $SchemaType,
    getClassName,
    $SchemaClass,
    mergeWithModel,
    getRefNamespace,
    assignEntityByID,
    schemaClassModels,
    getRefID,
    genResource
} from "./utils";
import {logger, $LogMsg} from './logger';

/**
 * The class defining common methods for all resources
 * @class
 * @property {string} id
 * @property {string} fullID
 * @property {string} name
 * @property {string} class
 * @property {string} namespace
 * @property {Boolean} generated
 * @property {Object} infoFields
 * @property {Object} JSON
 * @property {Array<Object>} assign
 * @property {Array<Object>} interpolate
 * @property {Object} generatedFrom
 * @property {Array<Reference>} references
 * @property {Array<OntologyTerm>} ontologyTerms
 * @property {Array<External>} external
 * @property {boolean} imported
 */
export class Resource{
    constructor(id, clsName) {
        this::merge(schemaClassModels[clsName].defaultValues);
        this.id = id;
        this.class = clsName;
    }

    /**
     * Creates a Resource object from its JSON specification
     * @param   {Object} json                          - resource definition
     * @param   {Object} [modelClasses]                - map of class names vs implementation of ApiNATOMY resources
     * @param   {Map<string, Resource>} [entitiesByID] - map of resources in the global model
     * @param   {string} namespace
     * @returns {Resource} - ApiNATOMY resource
     */
    static fromJSON(json, modelClasses = {}, entitiesByID, namespace){

        let clsName = json.class;
        const cls = modelClasses[clsName] || this;
        const res = new cls(json.id, clsName);

        if (!json.id){
            json.id = getNewID(entitiesByID);
            logger.warn($LogMsg.RESOURCE_NO_ID,"Generated ID to proceed: " + json.id, json, clsName);
        }

        //spec
        let difference = json::keys().filter(x => !(x.indexOf("ByID") > -1) && !schemaClassModels[clsName].fieldNames.find(y => y === x))
            .filter(x => !["_inactive"].includes(x));

        if (difference.length > 0) {
            logger.warn($LogMsg.RESOURCE_IGNORE_FIELDS, this.name, difference.join(","));
        }

        json.namespace = getRefNamespace(json, namespace);
        json.fullID = getFullID(json.namespace, json.id);

        res::assign(json);
        assignEntityByID(res, entitiesByID, namespace, modelClasses);

        return res;
    }

    static createResource(ref, clsName, model, modelClasses, entitiesByID, namespace, castingMethod){
        let e = undefined;
        const nm = getRefNamespace(ref, namespace);

        if (castingMethod) {
            e = castingMethod({
                [$Field.id]        : getRefID(ref),
                [$Field.class]     : clsName,
                [$Field.namespace] : nm,
                [$Field.generated] : true
            });
        } else {
            try {
                e = modelClasses[clsName].fromJSON(genResource({
                    [$Field.id]: getRefID(ref),
                    [$Field.namespace]: nm
                },"resourceModel.createResource (" + clsName + ") in " + nm),
                modelClasses, entitiesByID, nm);
            } catch {
                logger.error("Failed to create resource:", id, clsName, namespace);
            }
        }

        //Do not show labels for generated visual resources
        if (e?.prototype instanceof modelClasses.VisualResource){
            e.skipLabel = true;
        }
        mergeWithModel(e, clsName, model);
        e.fullID = e.fullID || getFullID(e.namespace, e.id);
        entitiesByID[e.fullID] = e;

        return e;
    }

    /**
     * Create relationships defined with the help of JSONPath expressions in the resource 'assign' statements
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
                        let relNames = schemaClassModels[e.class].relationshipNames;
                        let relMaps  = schemaClassModels[e.class].relationshipMap;
                        let newValue = value::pick(relNames);
                        newValue::keys().forEach(key => {
                            if (relMaps[key]) {
                                if (newValue[key]::isArray()) {
                                    newValue[key] = newValue[key].map(id => entitiesByID[getFullID(this.namespace,id)])
                                } else {
                                    newValue[key] = entitiesByID[getFullID(this.namespace, newValue[key])];
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
            logger.error($LogMsg.RESOURCE_JSON_PATH_ERROR, this.id, this.assign);
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
                        logger.warn($LogMsg.RESOURCE_CLASS_UNKNOWN, e);
                    } else {
                        let propNames = schemaClassModels[e.class].propertyNames.filter(e => e !== $Field.id);
                        e::merge(value::pick(propNames));
                    }
               });
            })
        } catch (err){
            logger.error($LogMsg.RESOURCE_JSON_PATH_ERROR, this.id, this.assign);
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
                    "end"  : 1,
                    "step" : (offset.end - offset.start) / (resources.length + 1)
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
     * Synchronize a relationship field of the resource with its counterpart (auto-fill a field that is involved into a bi-directional relationship based on its partial definition, i.e., A.child = B yields B.parent = A).
     * @param {string} key    - property field that points to the related resource
     * @param {{relatedTo: String}} spec   - JSON schema specification of the relationship field
     * @param {Object} modelClasses -  map of class names vs implementation of ApiNATOMY resources
     *
     */
    syncRelationship(key, spec, modelClasses){
        let res = this;
        let key2 = spec.relatedTo;
        if (key2) {
            let otherClassName = getClassName(spec);
            if (!otherClassName) {
                logger.error($LogMsg.RESOURCE_NO_REL_CLASS, spec);
                return;
            }

            let otherSpec = schemaClassModels[otherClassName].relationshipMap[key2];
            if (!otherSpec) {
                logger.error($LogMsg.RESOURCE_NO_REL_PROPERTY, key2, otherClassName);
                return;
            }

            const syncProperty = (obj) => {
                if (!obj || !obj::isObject()) { return; }
                if (otherSpec.type === $SchemaType.ARRAY) {
                    if (!obj[key2]) { obj[key2] = []; }
                    if (!(obj[key2]::isArray())) {
                        logger.warn($LogMsg.RESOURCE_ARRAY_EXPECTED, key2, obj, typeof(obj));
                        obj[key2] = [obj[key2]];
                    }
                    if (!obj[key2].find(obj2 => obj2 === res)) {
                        obj[key2].push(res);
                    }
                } else {
                    if (!obj[key2]) {
                        obj[key2] = res;
                    } else {
                        if (obj[key2] !== res) {
                            logger.warn($LogMsg.RESOURCE_DOUBLE_REF, obj.fullID, key2, obj[key2].fullID, res.fullID);
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
        entitiesByID::keys().forEach(entityID => {
             if (!entitiesByID[entityID].class){ return; }
             let refFields = schemaClassModels[entitiesByID[entityID].class].relationships;
             (refFields || []).forEach(([key, spec]) => {
                 if (!entitiesByID[entityID][key]) { return; }
                 entitiesByID[entityID].syncRelationship(key, spec, modelClasses);
             });
        });

        entitiesByID::keys().forEach(entityID => {
            if (!entitiesByID[entityID].class){ return; }
            entitiesByID[entityID].assignPathRelationships(modelClasses, entitiesByID);
        });

        //Assign visual properties to a complete map
        entitiesByID::keys().forEach(entityID => {
            if (!entitiesByID[entityID].class){ return; }
            entitiesByID[entityID].assignPathProperties(modelClasses);
            entitiesByID[entityID].interpolatePathProperties();
        });
    }

    /**
     * Prepare a circular resource object to be serialized in JSON.
     * @param depth - number of nested objects that are exported in full, helps to output resources with recursive dependencies
     * @param inlineResources - a set of properties that refer to inline resources that should not be replaced with their identifiers
     * @returns JSON object with serializable properties of current the resource
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
        function fieldToJSON(value, depth) { return value::isArray()? value.map(e => valueToJSON(e, depth)): valueToJSON(value, depth); }

        if (depth <= 0) {
            return this.fullID || this.id || null;
        }

        let res = {};
        const omitKeys = (this::keys())::difference(schemaClassModels[this.class].fieldNames).concat([$Field.viewObjects, $Field.infoFields, $Field.labels]);
        this::keys().filter(key => this[key] !== undefined && !omitKeys.includes(key)).forEach(key => {
            res[key] = fieldToJSON(this[key], (inlineResources[key] || depth) - 1);
        });
        return res;
    }

    isGeneratedFrom(id){
        return (this.id === id || this.generatedFrom && this.generatedFrom.id === id);
    }

    /**
     * Checks if the current resource is derived from a given resource
     * @param supertypeID
     * @returns {boolean}
     */
    isSubtypeOf(supertypeID){
        return false;
    }

    /**
     * Checks if the current resource carries a material.
     * @param materialID
     * @returns {*|void}
     */
    containsMaterial(materialID){
        return false;
    }

    /**
     * A stub to make sure call for includeRelated on misclassified resource does not cause exception
     * @param group
     */
    includeRelated(group){
        logger.error($LogMsg.CLASS_ERROR_RESOURCE, "includeRelated", this.id, this.class);
    }
}

/**
 * @property uri
 * @property type
 * @property externalTo
 */
export class External extends Resource {
    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
          json.class = json.class || $SchemaClass.External;
          return super.fromJSON(json, modelClasses, entitiesByID, namespace);
    }
}

/**
 * @property documents
 * @property parent
 * @property children
 */
export class Reference extends External {
    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
          json.class = json.class || $SchemaClass.Reference;
          return super.fromJSON(json, modelClasses, entitiesByID, namespace);
    }
}

/**
 * @property annotates
 * @property cladeInVariances
 */
export class OntologyTerm extends External {
    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
          json.class = json.class || $SchemaClass.OntologyTerm;
          return super.fromJSON(json, modelClasses, entitiesByID, namespace);
    }
}