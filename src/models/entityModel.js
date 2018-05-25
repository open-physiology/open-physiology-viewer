import { merge, isObject, entries, pick, keys, assign, cloneDeep } from 'lodash-bound';
import { types, relationships} from '../data/manifest.json';
import { SpriteText2D } from 'three-text2d';
import { copyCoords } from '../three/utils';

/**
 * Intercepts setters for given properties to update bidirectional relationships
 * @param obj
 * @param propKeys
 * @returns {*}
 */
export function tracePropAccess(obj, propKeys) {
    const propKeySet = new Set(propKeys);
    return new Proxy(obj, {
        set(target, propKey, value, receiver) {
            if (propKeySet.has(propKey)) {
                if (obj.syncRelationship){ obj.syncRelationship(propKey, value, target[propKey]) }
            }
            return Reflect.set(target, propKey, value, receiver);
        },
    });
}

const initValue = (specObj) => specObj.default
    ? (specObj::isObject()
        ? specObj.default::cloneDeep()
        : specObj.default)
    : (specObj.type
        ? specObj.type.startsWith("String")
            ? ""
            : specObj.type.startsWith("Boolean")
                ? false
                : specObj.type.startsWith("Number")
                    ? 0
                    :null
        :null);

/**
 * Returns recognized class properties from the specification
 * @param className
 */
const getObjSpec = className => types[className].properties::entries().map(([key, value]) => ({[key]: initValue(value)}));


export class Entity {
    constructor(id) {
        this::assign(...getObjSpec("Entity"));
        this.id = id;
        const className = this.constructor.name;
        if (types[className]){
            this::merge(...getObjSpec(className));
        }
    }

    static fromJSON(json, modelClasses = {}, entitiesByID = null) {
        json.class = json.class || this.name;
        const cls = this || modelClasses[json.class];
        const res = new cls(json.id);

        //spec
        let difference = json::keys().filter(x => !res::keys().find(y => y === x));
        if (difference.length > 0) {
            console.warn(`Unknown parameter(s) in class ${this.name} may be ignored: `, difference.join(","));
            //TODO remove warning for properties with private names: nodes -> _nodes, links -> _links, etc.
        }

        res::assign(json);

        const createObj = (value, spec) => {
            let type = spec.type.substr(spec.type.indexOf("|") + 1).trim();
            let objValue = value;
            if (typeof value === "string") {
                if (entitiesByID[value]) {
                    objValue = entitiesByID[value];
                } else {
                    console.warn("Cannot instantiate an object with unknown ID:", value);
                    return objValue;
                }
            }
            if (types[type] && types[type].abstract){ return objValue; }

            if (modelClasses[type]) {
                if (!(objValue instanceof modelClasses[type])) {
                    //console.log("Creating object given JSON:", spec, value);
                    if (!(entitiesByID[objValue.id] instanceof modelClasses[type])) {
                        objValue = modelClasses[type].fromJSON(objValue, modelClasses, entitiesByID);
                        entitiesByID[objValue.id] = objValue;
                    } else {
                        objValue = entitiesByID[objValue.id]
                    }
                }
            } else {
                console.error(`Cannot create object of unknown class: `, spec, value);
            }
            return objValue;
        };

        if (entitiesByID){
            //Exclude just created entity from being ever created again in the following recursion
            if (!res.id) {
                console.warn("An entity without ID has been found: ", res);
            } else {
                if (!entitiesByID[res.id]){
                    console.info("Added new entity to the global map: ", res.id);
                }
                entitiesByID[res.id] = res; //Update the entity map
            }

            //Replace ID's with references to the model classes
            let refFields = types[this.name].properties::entries().filter(([key, value]) => value.type && value.type.startsWith("String:ID|"));
            refFields.forEach(([key, spec]) => {
                if (!res[key]){ return; }
                if (Array.isArray(res[key])){
                    if (spec.modality.indexOf("*") < 0){
                        console.warn("Model parameter does not expect multiple values: ", key, res[key]);
                        return;
                    }
                    res[key] = res[key].map(value => createObj(value, spec) ||  value);
                } else {
                    res[key] = createObj(res[key], spec) || res[key];
                    if (spec.modality.indexOf("*") > 0){
                        //The spec allows multiple values, replace object with array of objects
                        res[key] = [res[key]];
                    }
                }
            })
        }

        //TODO unify: host, internalLyphs, internalNodes, belongsToLyph, content, container, linkInLyph
        //TODO for 'offset' property, use a uniform system to determine inner nodes positions

        return res;
    }

    //TODO write a test
    syncRelationship(key, value, oldValue){
        let r = relationships.find(r => r.types[0] === this.class && r.keys[0]=== key);
        if (!r) { return; }

        if (r.modality[1].indexOf("*") > -1 ){
            //one to many relationship
            if (value && (r.types[1] === value.class)){
                if (!value[r.keys[1]]){ value[r.keys[1]] = []; }
                if (!value[r.keys[1]].find(entity2 => entity2.id === this.id)){ value[r.keys[1]].push(this); }
            }
            if (oldValue && r.types[1] === oldValue.class){
                const index = oldValue[r.keys[1]].indexOf(entity2 => entity2.id === this.id);
                oldValue[r.keys[1]].splice(index, 1);
            }
        }
    }

    createLabels(labelKey, fontParams){
        if (this.skipLabel) { return; }
        this.labels = this.labels || {};

        if (!this.labels[labelKey] && this[labelKey]) {
            this.labels[labelKey] = new SpriteText2D(this[labelKey], fontParams);
        }

        if (this.labels[labelKey]){
            this.viewObjects["label"] = this.labels[labelKey];
        } else {
            delete this.viewObjects["label"];
        }
    }

    updateLabels(labelKey, visibility, position){
        if (this.skipLabel) { return; }
        if (this.labels[labelKey]){
            this.viewObjects['label'] = this.labels[labelKey];
            this.viewObjects["label"].visible = visibility;
            copyCoords(this.viewObjects["label"].position, position);
        } else {
            delete this.viewObjects['label'];
        }
    }

}