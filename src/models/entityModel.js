import { merge, isObject, entries, pick, keys, assign, cloneDeep } from 'lodash-bound';
import { definitions, relationships} from '../data/manifest.json';
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
        ? specObj.type.startsWith("string")
            ? ""
            : specObj.type.startsWith("boolean")
                ? false
                : specObj.type.startsWith("number")
                    ? 0
                    :null
        :null);

/**
 * Returns recognized class properties from the specification
 * @param className
 */
const getSchemaProperties = className => definitions[className].properties::entries().map(([key, value]) => ({[key]: initValue(value)}));

/**
 * Recursively applies a given operation to the classes in schema definitions
 * @param className - initial class
 * @param handler - function to apply to the current class
 */
const recurseSchema = (className, handler) => {
    let currName = className;
    while (definitions[currName]){
        handler(currName);
        if (definitions[currName].extends){
            let ref = definitions[currName].extends["$ref"];
            currName = ref.substr(ref.lastIndexOf("/") + 1).trim();
        } else {
            currName = null;
        }
    }
};

export class Entity {
    constructor(id) {
        this.id = id;
        const className = this.constructor.name;
        const handler = (currName) => this::merge(...getSchemaProperties(currName));
        recurseSchema(className, handler);
    }

    static fromJSON(json, modelClasses = {}, entitiesByID = null) {
        json.class = json.class || this.name;
        const cls = this || modelClasses[json.class];
        const res = new cls(json.id);

        //spec
        let specProperties = [];
        const handler = (currName) => specProperties = [...specProperties, ...definitions[currName].properties::keys()];
        recurseSchema(this.name, handler);

        let difference = json::keys().filter(x => !specProperties.find(y => y === x));
        if (difference.length > 0) {
            console.warn(`Unknown parameter(s) in class ${this.name} may be ignored: `, difference.join(","));
        }

        res::assign(json);

        const createObj = (value, spec) => {
            let objValue = value;
            if (typeof value === "string") {
                if (entitiesByID[value]) {
                    objValue = entitiesByID[value];
                } else {
                    console.warn("Cannot instantiate an object with unknown ID:", value, spec);
                    return objValue;
                }
            }

            let classDef = spec["$ref"] || spec.oneOf.find(obj => obj["$ref"]);
            if (!classDef){
                console.warn("Cannot extract the object class: property specification does not imply a reference", spec, value);
                return objValue;
            }

            let type = classDef["$ref"].substr(classDef["$ref"].lastIndexOf("/") + 1).trim();

            if (definitions[type] && definitions[type].abstract){ return objValue; }

            if (modelClasses[type]) {
                if (!(objValue instanceof modelClasses[type])) {
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
            let refFields = definitions[this.name].properties::entries().filter(([key, value]) =>
                value.oneOf || value.items && (value.items.oneOf));

            //TODO note that references in fields that do not match this pattern (such as lyph.border.borders) remain untouched
            //TODO it may be a good idea to convert them to object references as well

            refFields.forEach(([key, spec]) => {
                if (!res[key]){ return; }
                let typeSpec = spec.items || spec;
                if (Array.isArray(res[key])){
                    if (spec.type !== "array"){
                        console.warn("Model parameter does not expect multiple values: ", key, res[key]);
                        return;
                    }
                    res[key] = res[key].map(value => createObj(value, typeSpec) ||  value);
                } else {
                    res[key] = createObj(res[key], typeSpec) || res[key];
                    if (spec.type === "array"){
                        //The spec allows multiple values, replace object with array of objects
                        res[key] = [res[key]];
                    }
                }
            })
        }
        return res;
    }

    //TODO write a test
    syncRelationship(key, value, oldValue){
        let r = relationships.find(r => r.definitions[0] === this.class && r.keys[0]=== key);
        if (!r) { return; }

        if (r.type === "array" ){
            //one to many relationship
            if (value && (r.definitions[1] === value.class)){
                if (!value[r.keys[1]]){ value[r.keys[1]] = []; }
                if (!value[r.keys[1]].find(entity2 => entity2.id === this.id)){ value[r.keys[1]].push(this); }
            }
            if (oldValue && r.definitions[1] === oldValue.class){
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