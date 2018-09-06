import { merge, mergeWith, isObject, isArray, entries, keys, assign, cloneDeep } from 'lodash-bound';
import { definitions } from '../data/graphScheme.json';
import { SpriteText2D } from 'three-text2d';
import { assignPropertiesToJSONPath, copyCoords, noOverwrite, JSONPath } from './utils.js';
import * as colorSchemes from 'd3-scale-chromatic';

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


const isNestedObj = (spec) => (spec.type === "object" && spec.properties) || spec.items && isNestedObj(spec.items);

const getClassDefinition = (spec) => spec.$ref || (spec.oneOf || spec.anyOf || []).find(obj => obj.$ref) || spec;

const getClassName = (spec) => {
    let classDef = getClassDefinition(spec);
    if (!classDef) { return; }
    if (classDef.$ref){ classDef = classDef.$ref;}
    return classDef.substr(classDef.lastIndexOf("/") + 1).trim();
};

const isReference = (spec) => spec.$ref || spec.oneOf || spec.anyOf || spec.items && isReference(spec.items);

const replaceReferences = (res, modelClasses, entitiesByID) => {

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

        let clsName = getClassName(spec);
        if (!clsName){
            console.warn("Cannot extract the object class: property specification does not imply a reference", spec, value);
            return objValue;
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
            }
        } else {
            //If the object does not need to be instantiated, we leave it unchanged but replace its inner references
            let refFields = definitions[clsName].properties::entries().filter(([key, spec]) => isReference(spec));
            (refFields||[]).forEach(f => replaceRefs(objValue, f));
        }
        return objValue;
    };

    const replaceRefs = (res, [key, spec]) => {
        if (!res[key] || spec.readOnly){ return; }
        if (res[key].class && (res[key] instanceof modelClasses[res[key].class])) { return; }

        let typeSpec = spec.items || spec;
        if (res[key]::isArray()){
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
    };

    const syncRelationships = (res, [key, spec]) => {
        if (!res[key]){ return; }
        if (!res[key]::isObject()){
            console.warn("Object ID has not been replaced with references", res[key]);
            return;
        }
        let key2 = spec.relatedTo;
        if (key2){
            let typeSpec = spec.items || spec;
            let otherClassName = getClassName(typeSpec);
            if (!otherClassName) {
                console.error("Class not defined: ", typeSpec);
                return;
            }

            let otherTypeSpec = definitions[otherClassName].properties[key2];
            if (!otherTypeSpec){
                console.error(`Property specification '${key2}' is not found in class:`, otherClassName);
                return;
            }

            const syncProperty = (obj) => {
                if (otherTypeSpec.type === "array"){
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
                            console.warn(`First object's value of '${key}' should match second object's value of '${key2}'`,
                                res, obj[key2]);
                        }
                    }
                }
            };

            if (res[key]::isArray()){
                res[key].forEach(obj => syncProperty(obj))
            } else {
                syncProperty(res[key]);
            }
        }
    };

    let refFields = definitions[res.class].properties::entries().filter(([key, spec]) => isReference(spec));

    //Replace ID's with model object references
    refFields.forEach(f => replaceRefs(res, f));

    assignPathProperties(res, modelClasses, entitiesByID);

    //Cross-reference objects from related properties, i.e. Link.hostedNodes <-> Node.host
    refFields.forEach(f => syncRelationships(res, f));

    //Interpolation schemes do not contain IDs/references, so it is easier to process them in the expanded model
    interpolatePathProperties(res);
};

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
                    let needsUpdate = false;
                    value::keys().forEach(key => {
                        let spec = definitions[e.class];
                        if (spec && spec.properties[key] && isReference(spec.properties[key])){
                            needsUpdate  = true;
                            return;
                        }
                    });
                    if (needsUpdate){ replaceReferences(e, modelClasses, entitiesByID); }
                })
            }
        );
    }
};

const colorPathEntities = (entities, {scheme, length, reversed = false, offset}) => {
    if (!colorSchemes[scheme]) {
        console.warn("Unrecognized color scheme: ", scheme);
        return;
    }
    if (!length) { length = entities.length; }
    if (!offset) { offset = 0; }

    const getColor = i => colorSchemes[scheme](((reversed)? 1 - offset - i / length : offset + i / length));
    const assignColor = items => {
        (items||[]).forEach((item, i) => {
            if (!item::isObject()) {
                console.warn("Cannot assign color to a non-object value");
                return;
            }
            //If entity is an array, the schema is applied to each of it's items (e.g. to handle layers of lyphs in a group)
            if (item::isArray()){
                assignColor(item);
            } else {
                item.color = getColor(i);
            }
        });
    };
    assignColor(entities);
};

const interpolatePathProperties = (parent) => {
    (parent.interpolate||[]).forEach(({path, offset, color}) => {
        let entities = path? JSONPath({json: parent, path: path}): parent.nodes || [];
        if (offset){
            offset::mergeWith({
                "start": 0,
                "end": 1,
                "step": (offset.end - offset.start) / (entities.length + 1)
            }, noOverwrite);
            entities.forEach((e, i) => e.offset = offset.start + offset.step * ( i + 1 ) );
        }
        if (color){
            colorPathEntities(entities, color);
        }
    })
};


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

const initProperties = {"viewObjects": {}, "labels": {}};

export class Entity {
    constructor(id) {
        this.id = id;
        const className = this.constructor.name;
        const handler = (currName) => this::merge(...getSchemaProperties(currName));
        recurseSchema(className, handler);
        this::merge(initProperties);
    }

    static fromJSON(json, modelClasses = {}, entitiesByID = null) {
        //Do not expand templates
        json.class = json.class || this.name;
        const cls = this || modelClasses[json.class];
        const res = new cls(json.id);

        //spec
        let specProperties = initProperties::keys();
        const handler = (currName) => specProperties = [...specProperties,
            ...definitions[currName].properties::keys()];
        recurseSchema(this.name, handler);

        let difference = json::keys().filter(x => !specProperties.find(y => y === x));
        if (difference.length > 0) {
            console.warn(`Unknown parameter(s) in class ${this.name} may be ignored: `, difference.join(","));
        }

        res::assign(json);

        if (entitiesByID){
            //Exclude just created entity from being ever created again in the following recursion
            if (!res.id) {
                if (res.class !== "Border"){ console.warn("An entity without ID has been found: ", res); }
            } else {
                if (!entitiesByID[res.id]){ console.info("Added new entity to the global map: ", res.id); }
                entitiesByID[res.id] = res; //Update the entity map
            }

            replaceReferences(res, modelClasses, entitiesByID);
        }

        return res;
    }

    get isVisible(){
        return !this.hidden;
    }

    get polygonOffsetFactor() {
        return 0;
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

    updateLabels(labelKey, isVisible, position){
        if (this.skipLabel) { return; }
        if (this.labels[labelKey]){
            this.viewObjects['label'] = this.labels[labelKey];
            this.viewObjects["label"].visible = isVisible;
            copyCoords(this.viewObjects["label"].position, position);
        } else {
            delete this.viewObjects['label'];
        }
    }

}