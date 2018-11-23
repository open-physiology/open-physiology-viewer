import { definitions }  from '../data/graphScheme.json';
import { assignPropertiesToJSONPath, JSONPath } from './utils.js';
import * as colorSchemes from 'd3-scale-chromatic';
import {
    isArray,
    merge,
    entries,
    isObject,
    cloneDeep,
    isNumber,
    isString,
    keys,
    isEmpty,
    assign,
    defaults
} from 'lodash-bound';
import {SpriteText2D} from "three-text2d";
import {copyCoords} from "./utils";

/**
 * Extracts class name from the schema definition
 * @param spec - schema definition
 */
export const getClassName = (spec) => {
    let ref = null;
    if (spec::isString()) {
        ref = spec;
    } else {
        let refs = getRefs(spec);
        ref = refs && refs[0];
    }
    if (ref){ return ref.substr(ref.lastIndexOf("/") + 1).trim(); }
};

const getRefs = (spec) => {
    if (!spec){ return null; }
    if (spec.$ref) { return [spec.$ref]; }
    if (spec.items) { return getRefs(spec.items); }
    let expr = spec.oneOf || spec.anyOf || spec.allOf;
    if ( expr ){
        return expr.filter(e => e.$ref).map(e => e.$ref);
    }
};

/**
 * Assigns specified properties to the entities defined by the JSONPath expression
 * @param parent - root entity to which the JSONPath expression applies to
 * @param modelClasses - a map of entity class names and their implementations
 * @param entitiesByID - a map of all entities in the model
 */
const assignPathProperties = (parent, modelClasses, entitiesByID) => {
    //Do not process template assignment, this has been done at preprocessing stage
    if (parent.isTemplate) { return; }

    if (parent.assign) {
        if (!parent.assign::isArray()){
            console.warn("Cannot assign path properties: ", parent.assign);
            return;
        }
        parent.assign.forEach(({path, value}) => {
            assignPropertiesToJSONPath({path, value}, parent, (e) => {
                //Replace assigned references
                if (value::keys().find(key => modelClasses[e.class].Model.relationshipNames.includes(key))){
                    replaceIDs(e, modelClasses, entitiesByID);
                }
            })
        });
    }
};

/**
 * Assigns properties that can be set using interpolation functions allowed by the schema
 * @param parent
 */
const interpolatePathProperties = (parent) => {
    (parent.interpolate||[]).forEach(({path, offset, color}) => {
        let resources = path? JSONPath({json: parent, path: path}) || []: parent.nodes || [];
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
                console.warn("Unrecognized color scheme: ", scheme);
                return;
            }
            if (!length) { length = resources.length; }
            if (!offset) { offset = 0; }

            const getColor = i => colorSchemes[scheme](((reversed)? 1 - offset - i / length : offset + i / length));
            const assignColor = items => {
                (items||[]).forEach((item, i) => {
                    if (!item::isObject()) {
                        console.warn("Cannot assign color to a non-object value");
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
};

/**
 * Replace IDs with object references
 * @param modelClasses - recognized entity classes
 * @param entitiesByID - map of all entities
 */
const replaceIDs = (res, modelClasses, entitiesByID) => {

    const skip = (value) => !value || value::isEmpty() || value.class && (value instanceof modelClasses[value.class]);
    const replaceRefs = (res2, [key, spec]) => {

        const createObj = (value, spec) => {
            if (value::isNumber()) { value = value.toString(); }

            let objValue = value;
            let clsName = getClassName(spec);
            if (!clsName){
                console.warn("Cannot extract the object class: property specification does not imply a reference",
                    spec, value);
                return objValue;
            }


            if (value && value::isString()) {
                if (!entitiesByID[value]) {
                    entitiesByID[value] = {"id": value};
                    //console.info(`Auto-created new ${clsName} for ID: `, value);
                }
                objValue = entitiesByID[value];
            }

            if (!definitions[clsName] || definitions[clsName].abstract){ return objValue; }
            if (modelClasses[clsName]) {
                if (!(objValue instanceof modelClasses[clsName])) {
                    if (!(entitiesByID[objValue.id] instanceof modelClasses[clsName])) {
                        objValue = modelClasses[clsName].fromJSON(objValue, modelClasses, entitiesByID);
                        entitiesByID[objValue.id] = objValue;
                    } else {
                        objValue = entitiesByID[objValue.id]
                    }
                } else {
                    //If the object does not need to be instantiated, we leave it unchanged but replace its inner references
                    let refFields = modelClasses[clsName].Model.cudRelationships;
                    (refFields || []).forEach(f => replaceRefs(objValue, f));
                }
            } else {
                console.error("Unknown class: ",clsName);
            }
            return objValue;
        };

        if (skip(res2[key])) {
            return;
        }

        if (res2[key]::isArray()){
            res2[key] = res2[key].map(value => {
                if (skip(value)) { return value; }
                return createObj(value, spec);
            });

        } else {
            res2[key] = createObj(res2[key], spec);
            if (spec.type === "array"){
                //The spec allows multiple values, replace object with array of objects
                res2[key] = [res2[key]];
            }
        }

        return res2;
    };

    //Replace IDs with model object references
    let refFields = modelClasses[res.class].Model.cudRelationships;

    refFields.forEach(f => replaceRefs(res, f));

    assignPathProperties(res, modelClasses, entitiesByID);

    //Cross-reference objects from related properties, i.e. Link.hostedNodes <-> Node.hostedByLink
    refFields.forEach(f => syncRelationships(res, f));
};

/**
 * Auto-complete the model with bidirectional references
 * @param key  - property to auto-complete
 * @param spec - property specification
 */
const syncRelationships = (res, [key, spec]) => {
    if (!res[key]){ return; }

    if (!res[key]::isObject()){
        console.warn("Object ID has not been replaced with a reference", res[key]);
        return;
    }
    let key2 = spec.relatedTo;
    if (key2){
        let otherClassName = getClassName(spec);
        if (!otherClassName) {
            console.error("Class not defined: ", spec);
            return;
        }

        let otherSpec = definitions[otherClassName].properties[key2];
        if (!otherSpec){
            console.error(`Property specification '${key2}' is not found in class:`, otherClassName);
            return;
        }

        const syncProperty = (obj) => {
            if (otherSpec.type === "array"){
                if (!obj[key2]) { obj[key2] = []; }
                if (!obj[key2]::isArray()){
                    console.error(`Object's property '${key2}' should contain an array:`, obj);
                    return;
                }
                if (!obj[key2].find(obj2 => obj2 === obj || obj2 === obj.id)){ obj[key2].push(res); }
            } else {
                if (!obj[key2]) { obj[key2] = res; }
                else {
                    if (obj[key2] !== res && obj[key2] !== res.id){
                        console.warn(`First object should match second object:`,
                            obj.class, key2, obj[key2], res);
                    }
                }
            }
        };

        if (res[key]::isArray()){
            res[key].forEach(obj => {
                syncProperty(obj);
            })
        } else {
            syncProperty(res[key]);
        }
    }
};

export class Resource{
    constructor() {
        this::merge(this.constructor.Model.defaultValues);
    }

    static fromJSON(json, modelClasses, entitiesByID){
        let clsName = json.class || this.name;
        const cls = this || modelClasses[clsName];
        const res = new cls(json.id);
        res.class = clsName;
        res.JSON = json;
        //spec
        let difference = json::keys().filter(x => !this.Model.fieldNames.find(y => y === x));
        if (difference.length > 0) {
            console.warn(`Unknown parameter(s) in class ${this.name} may be ignored: `, difference.join(","));
        }

        res::assign(json);

        if (entitiesByID){
            //Exclude just created entity from being ever created again in the following recursion
            if (!res.id) {
                if (modelClasses[res.class].Model.extendsClass("Entity")){
                    console.warn("An entity without ID has been found: ", this.name, res);
                }
                res.id = "new_" + entitiesByID::keys().length;
            }
            if (res.id::isNumber()){ res.id = res.id.toString(); }
            //if (!entitiesByID[res.id]){ console.info("Added new entity to the global map: ", res.id); }
            entitiesByID[res.id] = res; //Update the entity map

            replaceIDs(res, modelClasses, entitiesByID);
        }
        interpolatePathProperties(res);

        return res;
    }

    //Model schema properties
    static get Model() {
        /**
         * Recursively applies a given operation to the classes in schema definitions
         * @param className - initial class
         * @param handler - function to apply to the current class
         */
        const recurseSchema = (className, handler) => {
            let queue = [className];
            let i = 0;
            while (queue[i]){
                let clsName = queue[i];
                if (definitions[clsName] && definitions[clsName].$extends){
                    let refs = getRefs(definitions[clsName].$extends);
                    (refs||[]).forEach(ref => {
                        queue.push(ref.substr(ref.lastIndexOf("/") + 1).trim());
                    })
                }
                i++;
            }
            queue.forEach(clsName => {
                handler(clsName);
            });
        };

        /**
         * Returns recognized class properties from the specification with default values
         * @param className
         */
        const getFieldDefaultValues = (className) => {
            const getDefault = (specObj) => specObj.type ?
                specObj.type == "string" ? "" : specObj.type === "boolean" ? false : specObj.type === "number" ? 0 : null
                : null;
            const initValue = (specObj) => {
                return specObj.default?
                    (specObj.default::isObject()
                        ? specObj.default::cloneDeep()
                        : specObj.default )
                    : getDefault(specObj);
            };

            return definitions[className].properties::entries().map(([key, value]) => ({[key]: initValue(value)}));
        };

        /**
         * Selects schema definitions which contain as an option a reference to a model object
         * @param spec - schema definition
         */
        const extendsClass = (refs, value) => {
            if (!refs) { return false; }
            let res = false;
            (refs||[]).forEach(ref => {
                let clsName = getClassName(ref);
                if (clsName) {
                    if (clsName === value) {
                        res = true;
                    } else {
                        let def = definitions[clsName];
                        res = res || def && extendsClass(getRefs(def.$extends), value);
                    }
                }
            });
            return res;
        };

        let model = {};
        if (!definitions[this.name]) {
            console.error("Failed to find schema definition for class: ", this.name);
            return model;
        }
        model.schema            = definitions[this.name];
        model.extendsClass      = (clsName) => (clsName === this.name)
            || extendsClass(getRefs(model.schema.$extends), clsName);
        model.defaultValues     = (() => { //object
            let res = {};
            recurseSchema(this.name, (currName) => res::merge(...getFieldDefaultValues(currName)));
            return res;
        })(); // {key: value}
        model.fields            = (() => {
            let res = {};
            recurseSchema(this.name, (currName) => res::merge(...definitions[currName].properties::entries()
                .map(([key, value]) => ({[key]: value})))
            );
            return res::entries();
        })(); // [key, spec]
        model.relationships     = model.fields.filter(([key, spec]) =>  extendsClass(getRefs(spec), Resource.name));
        model.properties        = model.fields.filter(([key, spec]) => !model.relationships.find(([key2, ]) => key2 === key));

        //Names only
        model.fieldNames        = model.fields.map(([key, ]) => key);
        model.propertyNames     = model.properties.map(([key, ]) => key);
        model.relationshipNames = model.relationships.map(([key, ]) => key);

        model.isRelationship   = (key) => model.relationshipNames.includes(key);

        //Create, Update, Delete (CUD) fields
        model.cudFields         = model.fields       .filter(([key, spec]) => !spec.readOnly);
        model.cudProperties     = model.properties   .filter(([key, spec]) => !spec.readOnly);
        model.cudRelationships  = model.relationships.filter(([key, spec]) => !spec.readOnly);

        model.filteredRelNames  = (clsNames) => {
            let relFields = model.relationships;
            return (relFields||[])
                .filter(([key, spec]) => !clsNames.includes(getClassName(spec)))
                .map(([key, ]) => key);
        };

        return model;
    }

}

