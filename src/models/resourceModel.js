import { definitions }  from '../data/graphScheme.json';
export const JSONPath = require('JSONPath');
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
    fromPairs,
    defaults,
    pick
} from 'lodash-bound';

/**
 * Assign properties for the entities in JSON path
 * @param assign  - assignment array
 * @param parent  - parent (root) object
 */
export function assignPropertiesToJSONPath(assign, parent){
    [...(assign||[])].forEach(({path, value}) => {
        if (!path || !value) { return;}
        try{
            let entities = (JSONPath({json: parent, path: path}) || []).filter(e => !!e);
            console.log("Value applied to", value, entities);
            entities.forEach(e => {
                e::merge(value);
            });
        } catch (err){
            console.error(`Failed to assign properties to the JSON Path ${path} of:`, parent, err);
        }
    })
}

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

export class Resource{
    constructor() {
        this::merge(this.constructor.Model.defaultValues);
    }

    static fromJSON(json, modelClasses = {}, entitiesByID = null){

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
            if (!res.id) { res.id = "new_" + entitiesByID::keys().length; }
            if ( res.id::isNumber()){ res.id = res.id.toString(); }

            if (entitiesByID[res.id]) {
                if (entitiesByID[res.id] !== res){
                    console.warn("Resources IDs are not unique: ", entitiesByID[res.id], res);
                }
                //
            } else {
                entitiesByID[res.id] = res;
                res.reviseWaitingList(entitiesByID.waitingList);
                res.replaceIDs(modelClasses, entitiesByID);
                res.assignPathProperties(modelClasses);
            }
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

        model.relationshipMap   = model.relationships::fromPairs();

        //Names only
        model.fieldNames        = model.fields.map(([key, ]) => key);
        model.propertyNames     = model.properties.map(([key, ]) => key);
        model.relationshipNames = model.relationships.map(([key, ]) => key);
        model.relClassNames     = model.relationships.map(([key, spec]) => [key, getClassName(spec)])::fromPairs();

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

        model.getRelNameByClsName  = (clsName) => {
            let relFields = model.relClassNames;
            let relNames = relFields::entries().filter(([key, cls]) => cls === clsName).map(([key, ]) => key);
            if (relNames && relNames[0]){ return relNames[0]; }
        };

        return model;
    }

    /**
     * Replace IDs with object references
     * @param modelClasses - recognized entity classes
     * @param entitiesByID - map of all entities
     */
    replaceIDs(modelClasses, entitiesByID){

        const skip = (value) => !value || value::isEmpty() || value.class && (value instanceof modelClasses[value.class]);
        const createObj = (res, key, value, spec) => {
            if (skip(value)) { return value; }
            if (value::isNumber()) { value = value.toString(); }

            let clsName = getClassName(spec);
            if (!clsName || !definitions[clsName]){
                console.warn("Cannot extract the object class: property specification does not imply a reference",
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
                    console.warn("Duplicate resource definition:", res, key, value.id, value, entitiesByID[value.id]);
                }
                return entitiesByID[value.id];
            }

            //value is an object and it is not in the map
            if (definitions[clsName].abstract ){
                if (value.class) {
                    clsName = value.class;
                    if (!modelClasses[clsName]){
                        console.error("Failed to find class definition", value.class, value);
                    }
                } else {
                    console.error("An abstract relationship field expects a reference to an existing resource " +
                        " or 'class' field in its value definition: ", value);
                    return null;
                }
            }
            return modelClasses[clsName].fromJSON(value, modelClasses, entitiesByID);
        };

        //Replace IDs with model object references
        let refFields = modelClasses[this.class].Model.cudRelationships;
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

    assignPathProperties(modelClasses){
        let assign = [...(this.assign||[])].map(({path, value}) =>
            value::pick(modelClasses[this.class].Model.propertyNames));
        assignPropertiesToJSONPath(assign, this);
    };

    reviseWaitingList(waitingList){
        //Revise waitingList
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
                    obj[key] = res
                }
            }}
        );
        delete waitingList[this.id];
    }

    syncRelationships(modelClasses, entitiesByID){
        entitiesByID::entries().forEach(([id, res]) => {
            if (id === "waitingList") { return; }
            let refFields = modelClasses[res.class].Model.cudRelationships;
            (refFields || []).forEach(([key, spec]) => {
                if (!res[key]) { return; }
                let key2 = spec.relatedTo;
                if (key2) {
                    let otherClassName = getClassName(spec);
                    if (!otherClassName) {
                        console.error("Class not defined: ", spec);
                        return;
                    }

                    let otherSpec = modelClasses[otherClassName].Model.relationshipMap[key2];
                    if (!otherSpec) {
                        console.error(`Property specification '${key2}' is not found in class:`, otherClassName);
                        return;
                    }

                    const syncProperty = (obj) => {
                        if (!obj || !obj::isObject()) { return; }
                        if (otherSpec.type === "array") {
                            if (!obj[key2]) { obj[key2] = []; }
                            if (!obj[key2]::isArray()) {
                                console.error(`Object's property '${key2}' should contain an array:`, obj);
                                return;
                            }
                            if (!obj[key2].find(obj2 => (obj2 === res || obj2 === res.id))) {
                                obj[key2].push(res);
                            }
                        } else {
                            if (!obj[key2]) { obj[key2] = res; }
                            else {
                                if (obj[key2] !== res && obj[key2] !== res.id) {
                                    console.warn(`Property "${key2}" of the first resource (${obj.class}) should match the resource:`,
                                        obj[key2], res);
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
            })
        })
    }

}

