import {
    cloneDeep,
    entries,
    fromPairs,
    isObject,
    isString,
    merge,
    keys,
    isPlainObject,
    defaults,
    intersection, isArray
} from "lodash-bound";
import * as colorSchemes from 'd3-scale-chromatic';
import {definitions} from "./graphScheme";
import {logger} from './logger';

const colors = [...colorSchemes.schemePaired, ...colorSchemes.schemeDark2];

export const getNewID = entitiesByID => "new_" +
    (entitiesByID? entitiesByID::keys().length : Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5));

/**
 * Add color to the visual resources in the list that do not have color assigned yet
 * @param resources - list of resources
 * @param defaultColor - optional default color
 */
export const addColor = (resources, defaultColor) => (resources||[]).filter(e => e::isObject() && !e.color)
    .forEach((e, i) => { e.color = e.supertype && e.supertype.color
        ? e.supertype.color
        : (e.cloneOf && e.cloneOf.color)
            ? e.cloneOf.color
            :(defaultColor || colors[i % colors.length]) });

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
 * Finds a resource object in the parent group given an object or an ID
 * @param eArray
 * @param e
 * @returns {*|void|T}
 */
export const findResourceByID = (eArray, e) => e::isPlainObject()? e: (eArray||[]).find(x => !!e && x.id === e);

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

/**
 * Add a given resource to a given group and a parent group if it does not exist
 * @param group - a group to add resources to
 * @param parentGroup - parent group
 * @param resource - resource
 * @param prop - property in the group
 */
export const mergeGenResource = (group, parentGroup, resource, prop) => {
    if (!resource) { return; }
    if (group){
        group[prop] = group[prop] || [];
        if (resource::isPlainObject()){
            if (resource.id){
                if (!group[prop].find(x => x === resource.id || x.id === resource.id)){
                    group[prop].push(resource.id);
                }
            }
        } else {
            if (!group[prop].includes(resource)){ group[prop].push(resource); }
        }
    }
    if (parentGroup && resource.id){
        parentGroup[prop] = parentGroup[prop] || [];
        if (!parentGroup[prop].find(x => x === resource.id || x.id === resource.id)){ parentGroup[prop].push(resource); }
    }
};

/**
 * @param group - a group to add resources to
 * @param parentGroup - parent group
 * @param [lnk,trg, lyph]  - link, target node, conveyed lyph
 */
export const mergeGenResources = (group, parentGroup, [lnk, trg, lyph]) => {
    mergeGenResource(group, parentGroup, lnk, "links");
    mergeGenResource(group, parentGroup, trg, "nodes");
    mergeGenResource(group, parentGroup, lyph, "lyphs");
};

/**
 * @param schemaClsName - name of the class in JSON Schema
 * @returns {*} Helper object with convenient access to field subgroups
 */
const getSchemaClassModel = (schemaClsName) => {

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
        logger.error("Failed to find schema definition for class: ", schemaClsName);
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

    return model;
};

export const schemaClassModels = {};
definitions::keys().forEach(schemaClsName => { schemaClassModels[schemaClsName] = getSchemaClassModel(schemaClsName); } );










