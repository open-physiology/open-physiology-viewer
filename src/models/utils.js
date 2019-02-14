import {cloneDeep, entries, fromPairs, isObject, isString, merge} from "lodash-bound";
import * as colorSchemes from 'd3-scale-chromatic';
import {definitions} from "./graphScheme";

export {definitions};

/**
 * Copy coordinates from source object to target
 * @param target
 * @param source
 */
export function copyCoords(target, source){
    if (!source) { return; }
    if (!target) { return; }
    ["x", "y", "z"].forEach(dim => {
        if (source.hasOwnProperty(dim)) {
            target[dim] = source[dim] || 0
        }
    });
}

const colors = [...colorSchemes.schemePaired, ...colorSchemes.schemeDark2];

/**
 * Add color to the visual resources in the list that do not have color assigned yet
 * @param resources - list of resources
 * @param defaultColor - optional default color
 */
export const addColor = (resources, defaultColor) => (resources||[]).filter(e => e::isObject() && !e.color)
    .forEach((e, i) => { e.color = e.supertype && e.supertype.color ? e.supertype.color: (defaultColor || colors[i % colors.length]) });

/**
 * JSON Path validator
 * @type {JSONPath}
 */
export const JSONPath = require('JSONPath');

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
    if (ref){
        let clsName = ref.substr(ref.lastIndexOf("/") + 1).trim();
        if (!definitions[clsName]) { return null; }
        return clsName;
    }
};

/**
 * Returns a list of references in the schema type specification
 * @param spec - schema definition
 * @returns {*} - list of references
 */
export const getRefs = (spec) => {
    if (!spec){ return null; }
    if (spec.$ref) { return [spec.$ref]; }
    if (spec.items) { return getRefs(spec.items); }
    let expr = spec.oneOf || spec.anyOf || spec.allOf;
    if ( expr ){
        return expr.filter(e => e.$ref).map(e => e.$ref);
    }
};

/**
 * Indicates whether schema class definition is abstract
 * @type {boolean} Returns true if the class is abstract
 */
export const isClassAbstract = (clsName) => definitions[clsName].abstract;

const schemaClassModels = {};

/**
 * @param schemaClsName - name of the class in JSON Schema
 * @returns {*} Helper object with convenient access to field subgroups
 */
export const getSchemaClassModel = (schemaClsName) => {

    if ( schemaClassModels[schemaClsName]) {
        return schemaClassModels[schemaClsName];
    }

    /**
     * Recursively applies a given operation to the classes in schema definitions
     * @param {string} className - initial class
     * @param {function} handler - function to apply to the current class
     */
    const recurseSchema = (className, handler) => {
        let stack = [className];
        let i = 0;
        while (stack[i]){
            let clsName = stack[i];
            if (definitions[clsName]){
                let refs = getRefs(definitions[clsName]);
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
     * @param {string} className
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
     * @param {Array<string>} refs  - schema references
     * @param {string} value        - class name
     * @returns {boolean}           - returns true if at least one reference extends the given class
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
                    res = res || def && extendsClass(getRefs(def), value);
                }
            }
        });
        return res;
    };

    let model = {};
    if (!definitions[schemaClsName]) {
        console.error("Failed to find schema definition for class: ", schemaClsName);
        return model;
    }
    model.schema            = definitions[schemaClsName];
    model.extendsClass      = (clsName) => (clsName === schemaClsName)
        || extendsClass(getRefs(model.schema), clsName);
    model.defaultValues     = (() => { //object
        let res = {};
        recurseSchema(schemaClsName, (currName) => res::merge(...getFieldDefaultValues(currName)));
        return res;
    })(); // {key: value}
    model.fields            = (() => {
        let res = {};
        recurseSchema(schemaClsName, (currName) =>
            //res::merge(...definitions[currName].properties::entries().map(([key, value]) => ({[key]: value})))
            res::merge(definitions[currName].properties)
        );
        return res::entries();
    })(); // [key, spec]

    model.relationships     = model.fields.filter(([key, spec]) =>  extendsClass(getRefs(spec), "Resource"));
    model.properties        = model.fields.filter(([key, ]) => !model.relationships.find(([key2, ]) => key2 === key));

    model.fieldMap          = model.fields::fromPairs();
    model.propertyMap       = model.properties::fromPairs();
    model.relationshipMap   = model.relationships::fromPairs();

    //Names only
    model.fieldNames        = model.fields.map(([key, ]) => key);
    model.propertyNames     = model.properties.map(([key, ]) => key);
    model.relationshipNames = model.relationships.map(([key, ]) => key);

    model.relClassNames     = model.relationships.map(([key, spec]) => [key, getClassName(spec)])::fromPairs();

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
    model.selectedRelNames  = (clsName) => {
        let relFields = model.relClassNames;
        return (relFields::entries()||[]).filter(([key, cls]) => cls === clsName).map(([key, ]) => key);
    };

    model.groupClsNames = ["Group", "Graph"]; //TODO automate if more group types need to be defined

    //TODO add subclasses, superclass

    schemaClassModels[schemaClsName] = model;

    return model;
};









