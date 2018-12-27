import { definitions }  from '../data/graphScheme.json';
import * as colorSchemes from 'd3-scale-chromatic';
import {
    isArray,
    merge,
    isObject,
    cloneDeep,
    isNumber,
    isString,
    keys,
    entries,
    isEmpty,
    assign,
    fromPairs,
    defaults,
    pick
} from 'lodash-bound';
import {JSONPath, getClassName, getRefs} from "./utils";

/**
 *  The class defining common methods for all resources
 * @class
 * @property id
 * @property name
 * @property class
 * @property JSON
 * @property assign
 * @property interpolate
 *
 */
export class Resource{

    /**
     * @ignore
     */
    constructor() {
        this::merge(this.constructor.Model.defaultValues);
    }

    /**
     * Creates a resource from JSON specification
     * @param json - resource definition
     * @param modelClasses - map of class names vs implementation of ApiNATOMY resources
     * @param entitiesByID - map of resources in the global model
     * @returns {Resource} - ApiNATOMY resource
     */
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
            if (!res.id) { res.id = "new_" + entitiesByID::keys().length; }
            if ( res.id::isNumber()){ res.id = res.id.toString(); }

            if (entitiesByID[res.id]) {
                if (entitiesByID[res.id] !== res){
                    console.warn("Resources IDs are not unique: ", entitiesByID[res.id], res);
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
     * Model schema properties
     * @constructor
     */
    static get Model() {
        /**
         * Recursively applies a given operation to the classes in schema definitions
         * @param className - initial class
         * @param handler - function to apply to the current class
         */
        const recurseSchema = (className, handler) => {
            let stack = [className];
            let i = 0;
            while (stack[i]){
                let clsName = stack[i];
                if (definitions[clsName] && definitions[clsName].$extends){
                    let refs = getRefs(definitions[clsName].$extends);
                    (refs||[]).forEach(ref => {
                        stack.push(ref.substr(ref.lastIndexOf("/") + 1).trim());
                    })
                }
                i++;
            }
            while (stack.length > 0){
                let clsName = stack.pop();
                handler(clsName);
            }
        };

        /**
         * Returns recognized class properties from the specification with default values
         * @param className
         */
        const getFieldDefaultValues = (className) => {
            const getDefault = (specObj) => specObj.type ?
                specObj.type === "string" ? "" : specObj.type === "boolean" ? false : specObj.type === "number" ? 0 : null
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
         * Determines if given schema references extend a certain class
         * @param refs  - schema references
         * @param value - class name
         * @returns {boolean} - returns true if at least one reference extends the given class
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
                        /** @namespace def.$extends */
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
        model.properties        = model.fields.filter(([key, ]) => !model.relationships.find(([key2, ]) => key2 === key));

        model.fieldMap          = model.fields::fromPairs();
        model.propertyMap       = model.properties::fromPairs();
        model.relationshipMap   = model.relationships::fromPairs();

        //Names only
        model.fieldNames        = model.fields.map(([key, ]) => key);
        model.propertyNames     = model.properties.map(([key, ]) => key);
        model.relationshipNames = model.relationships.map(([key, ]) => key);

        model.relClassNames     = model.relationships.map(([key, spec]) => [key, getClassName(spec)])::fromPairs();
        model.isRelationship    = (key) => model.relationshipNames.includes(key);

        //Create, Update, Delete (CUD) fields
        model.cudFields         = model.fields       .filter(([key, spec]) => !spec.readOnly);
        model.cudProperties     = model.properties   .filter(([key, spec]) => !spec.readOnly);
        model.cudRelationships  = model.relationships.filter(([key, spec]) => !spec.readOnly);

        model.filteredRelNames     = (clsNames) => {
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
                    console.warn("Duplicate resource definition:", value, entitiesByID[value.id]);
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
                        console.warn("Cannot assign to a resource with unknown class", e);
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
                                console.info(`Created relationship via dynamic assignment: `, key, e.id, newValue[key]);
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
            console.error(`Failed to process assignment statement ${this.assign} for ${this.id}`, err);
        }
    };

    assignPathProperties(modelClasses){
        if (!this.assign){ return;  }
        //Filter the value to assign only valid class properties
        try{
            [...(this.assign||[])].forEach(({path, value}) => {
                if (!path || !value) { return;}
                let entities = (JSONPath({json: this, path: path}) || []).filter(e => !!e);
                entities.forEach(e => {
                    if (!modelClasses[e.class]){
                        console.warn("Cannot assign to a resource with unknown class", e);
                    } else {
                        let propNames = modelClasses[e.class].Model.propertyNames.filter(e => e !== "id");
                        e::merge(value::pick(propNames));
                    }
               });
            })
        } catch (err){
            console.error(`Failed to process assignment statement ${this.assign} for ${this.id}`, err);
        }
    };

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
    }

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

    /**
     *
     * @param key
     * @param {{relatedTo:string}} spec
     * @param modelClasses
     */
    syncRelationship(key, spec, modelClasses){
        let res = this;
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
                if (!obj || !obj::isObject()) {
                    return;
                }
                if (otherSpec.type === "array") {
                    if (!obj[key2]) {
                        obj[key2] = [];
                    }
                    if (!obj[key2]::isArray()) {
                        console.warn(`Object's property '${key2}' should contain an array:`, obj);
                    } else {
                        if (!obj[key2].find(obj2 => obj2 === res)) {
                            obj[key2].push(res);
                        }
                    }
                } else {
                    if (!obj[key2]) {
                        obj[key2] = res;
                    }
                    else {
                        if (obj[key2] !== res) {
                            console.warn(`Property "${key2}" of the first resource (${obj.class}) should match the resource:`,
                                obj[key2], res, obj[key2].id, res.id);
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

    syncRelationships(modelClasses, entitiesByID){
        entitiesByID::keys().forEach(id => {
            if (!entitiesByID[id].class){ return; }
             let refFields = modelClasses[entitiesByID[id].class].Model.cudRelationships;
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
}

