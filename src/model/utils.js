import {
    cloneDeep,
    entries,
    fromPairs,
    isObject,
    isString,
    isNumber,
    isEmpty,
    merge,
    keys,
    flatten, isArray, unionBy, mergeWith, sample
} from "lodash-bound";
import * as colorSchemes from 'd3-scale-chromatic';
import schema from "./graphScheme";
import {$LogMsg, logger} from "./logger";

const colors = [...colorSchemes.schemePaired, ...colorSchemes.schemeDark2];

export const $SchemaType = {
    ARRAY  : "array",
    OBJECT : "object",
    STRING : "string",
    NUMBER : "number",
    BOOLEAN: "boolean"
};

export const ModelType = {
    GRAPH  : "Graph",
    SCAFFOLD : "Scaffold",
};

/**
 * @property IdentifierScheme
 * @property IdentifierScheme
 * @property RGBColorScheme
 * @property InterpolateColorScheme
 * @property GroupColorScheme
 * @property CurieMapping
 * @property Point2Scheme
 * @property Point3Scheme
 * @property ProcessTypeScheme
 * @property Resource
 * @property External
 * @property Reference
 * @property OntologyTerm
 * @property VarianceSpec
 * @property VisualResource
 * @property Vertice
 * @property Node
 * @property Edge
 * @property Link
 * @property Material
 * @property Border
 * @property Shape
 * @property Lyph
 * @property Region
 * @property Anchor
 * @property Wire
 * @property Component
 * @property Group
 * @property GroupTemplate
 * @property GroupAnnotation
 * @property Coalescence
 * @property Chain
 * @property Channel
 * @property Tree
 * @property Villus
 * @property Scaffold
 * @property State
 * @property Snapshot
 * @property Graph
 */
export const $SchemaClass = schema.definitions::keys().map(schemaClsName => [schemaClsName, schemaClsName])::fromPairs();
export const $Field = $SchemaClass::keys().map(className => schema.definitions[className].properties::keys().map(property => [property, property]))::flatten()::fromPairs();

export const EDGE_GEOMETRY        = schema.definitions.EdgeGeometryScheme.enum.map(r => [r.toUpperCase(), r])::fromPairs();
export const WIRE_GEOMETRY        = schema.definitions[$SchemaClass.Wire].properties[$Field.geometry].anyOf[1].enum.map(r => [r.toUpperCase(), r])::fromPairs()::merge(EDGE_GEOMETRY);
export const LINK_GEOMETRY        = schema.definitions[$SchemaClass.Link].properties[$Field.geometry].anyOf[1].enum.map(r => [r.toUpperCase(), r])::fromPairs()::merge(EDGE_GEOMETRY);
export const EDGE_STROKE          = schema.definitions[$SchemaClass.Edge].properties[$Field.stroke].enum.map(r => [r.toUpperCase(), r])::fromPairs();
export const PROCESS_TYPE         = schema.definitions[$SchemaClass.ProcessTypeScheme].enum.map(r => [r.toUpperCase(), r])::fromPairs();
export const LYPH_TOPOLOGY        = schema.definitions[$SchemaClass.Lyph].properties[$Field.topology].enum.map(r => [r.toUpperCase(), r])::fromPairs();
export const COALESCENCE_TOPOLOGY = schema.definitions[$SchemaClass.Coalescence].properties[$Field.topology].enum.map(r => [r.toUpperCase(), r])::fromPairs();
/**
 * @property BASAL
 * @property ABSENT
 * @property OBSERVED
 */
export const VARIANCE_PRESENCE    = schema.definitions[$SchemaClass.VarianceSpec].properties[$Field.presence].enum.map(r => [r.toUpperCase(), r])::fromPairs();

export const $Color = {
    Anchor       : "#ccc",
    Wire         : "#000",
    Link         : "#000",
    Node         : "#000",
    Region       : "#c0c0c0",
    InternalNode : "#ccc"
};

export const $Prefix = {
    node        : "node",   //generated node
    source      : "s",      //source node
    target      : "t",      //target node
    link        : "lnk",    //generated link (edge)
    lyph        : "lyph",   //generated lyph
    group       : "group",  //generated group
    instance    : "inst",   //instance
    chain       : "chain",  //chain
    tree        : "tree",   //tree
    channel     : "ch",     //channel
    coalescence : "cls",    //coalescence instance
    border      : "b",      //lyph border
    villus      : "vls",    //villus template
    layer       : "layer",  //generated lyph layer
    internal    : "int",    //generated internal lyph
    template    : "ref",    //from lyph template
    material    : "mat",    //from material reference
    clone       : "clone",  //node clone
    join        : "join",   //joint node
    anchor      : "p",      //anchor point
    wire        : "wire",   //wire
    query       : "query",  //dynamic query
    default     : "default", //default group ID
    autoLinks   : "autoLinks", //AUto-generated links
    force       : "force"
};

export const $Default = {
    EDGE_LENGTH: 10
}

export const getNewID = entitiesByID => "new-" +
    (entitiesByID? entitiesByID::keys().length : Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5));


export const getRefID = ref => {
    let id = getID(ref);
    if (!id || !(id::isString())) return "";
    if (id.startsWith("http")) return ref;
    return id.substr(id.lastIndexOf(":") + 1);
}

export const isDefined = value => value && value::isArray() && value.length > 0;

//Exclude namespace from local arguments which are often given IDs that could be defined with namespace
export const getGenID = (...args) => args.filter(arg => arg !== null).map(arg => arg::isNumber()? arg: getRefID(arg)).join("_");

export const getFullID = (namespace, ref) => {
    if (!ref){ return ref; }
    let id = getID(ref);
    if (id && id::isString() && id.indexOf(":") > -1) {
        return id;
    }
    const nm = (ref::isObject() && ref.namespace)? ref.namespace: namespace;
    return (nm? nm + ":" : "") + id;
};

export const getRefNamespace = (ref, namespace= undefined) => {
    if (ref::isObject() && ref.namespace){
        return ref.namespace;
    }
    let id = getID(ref);
    if (!id) return namespace;
    if (id.startsWith("http")) return undefined;
    let idx = id.lastIndexOf(":");
    if (idx > -1) {
        return id.substr(0, idx);
    }
    return namespace;
}

export const getGenName = (...args) => args.join(" ");

/**
 * Get resource ID
 * @param e - resource or its identifier
 * @returns {*} resource identifier
 */
export const getID  = (e) => e::isObject()? e.id : e;

/**
 * Compares resources
 * @param e1 - identifier or a reference of the first resource
 * @param e2 - identifier or a reference of the second resource
 * @returns {boolean} true if resource identifier match, false otherwise
 */
export const compareResources  = (e1, e2) => getID(e1) === getID(e2);

/**
 * Merge resource schema.definitions
 * @param a - first resource or resource list
 * @param b - second resource or resource list
 * @returns {Resource} merged resource or a union of resource lists where resources with the same id have been merged
 */
//FIXME Merge only resources from the same namespace???
export function mergeResources(a, b) {
    if (a === undefined) {
        return b;
    }
    if (b === undefined){
        return a;
    }
    if (a::isArray()){
        if (b::isArray()) {
            let ab = [];
            a.forEach(aEl => aEl && ab.push(aEl));
            b.forEach(bEl => bEl && !ab.find(x => getRefID(x) === getRefID(bEl)) && ab.push(bEl));
            return ab;
        } else {
            return a.push(b);
        }
    } else {
        if (a::isObject()){
            return b::isObject()? a::mergeWith(b, mergeResources): a;
        } else {
            return a;
        }
    }
}

/**
 * Include generated resource into corresponding model resource list
 * @param resource - generated resource
 * @param clsName - class of the generated resource
 * @param parentGroup - parent group that contains all resources
 */
export function mergeWithModel(resource, clsName, parentGroup){
    const clsToProp = {
        [$SchemaClass.External]    : $Field.external,
        [$SchemaClass.OntologyTerm]: $Field.ontologyTerms,
        [$SchemaClass.Reference]   : $Field.references,
        [$SchemaClass.Lyph]        : $Field.lyphs,
        [$SchemaClass.Material]    : $Field.materials,
        [$SchemaClass.Link]        : $Field.links,
        [$SchemaClass.Node]        : $Field.nodes,
        [$SchemaClass.Chain]       : $Field.chains,
        [$SchemaClass.Tree]        : $Field.trees,
        [$SchemaClass.Channel]     : $Field.channels,
        [$SchemaClass.Coalescence] : $Field.coalescences,
        [$SchemaClass.Group]       : $Field.groups,
        [$SchemaClass.Scaffold]    : $Field.scaffolds,
        [$SchemaClass.Anchor]      : $Field.anchors,
        [$SchemaClass.Region]      : $Field.regions,
        [$SchemaClass.Wire]        : $Field.wires,
        [$SchemaClass.Component]   : $Field.components
    }
    let prop = clsToProp[clsName];
    if (prop){
        parentGroup[prop] = parentGroup[prop] || [];
        if (!parentGroup[prop].find(x => x && resource && x.id === resource.id)) {
            parentGroup[prop].push(resource);
        }
    }
}

/**
 * Add color to the visual resources in the list that do not have color assigned yet
 * @param resources - list of resources
 * @param defaultColor - optional default color
 */
export const addColor = (resources, defaultColor) => (resources||[])
    .forEach((e, i) => {
        if (e::isObject() && !e.color){
            e.color = e.supertype?.color || e.cloneOf?.color || defaultColor || colors[i % colors.length];
        }
    });

export function pickColor(){
  return colors::sample();
}

/**
 * Extracts class name from the schema definition
 * @param spec - schema definition
 */
export const getClassName = (spec) => {
    let ref;
    if (spec::isString()) {
        ref = spec;
    } else {
        let refs = getClassRefs(spec);
        ref = refs && refs[0];
    }
    if (ref){
        let clsName = ref.substr(ref.lastIndexOf("/") + 1).trim();
        if (!schema.definitions[clsName]) { return null; }
        return clsName;
    }
};

export const getSchemaClass = (spec) => schema.definitions[getClassName(spec)];

/**
 * Places a given node on a given border
 * @param border
 * @param nodeID
 */
export const addBorderNode = (border, nodeID) => {
    if (!border){ return; }
    border.hostedNodes = border.hostedNodes || [];
    if (!border.hostedNodes.find(n => n === nodeID || (n && n.id === nodeID))) {
        border.hostedNodes.push(nodeID);
    }
};

/**
 * Find resource in a list with a given id. If the reference is a resource, it is returned straightaway.
 * @param eArray - list of resources
 * @param ref - resource or resource identifier to look for
 * @param namespace - namespace
 * @returns {*|void}
 */
export const findResourceByID = (eArray, ref, namespace = undefined) => {
    return ref::isObject() ? ref : (eArray || []).find(x => ref && x?.id === getRefID(ref) && (!namespace || !x.namespace || x.namespace === namespace));
}

/**
 * Check if a given resource in a list, accounting for namespace
 * @param eArray - list of resources
 * @param ref
 * @param namespace
 */
export const isIncluded = (eArray, ref, namespace = undefined) =>
    eArray.find(x => getFullID(namespace, x) === getFullID(namespace, ref));

/**
 * Find resource index in a list, accounting for namespace
 * @param eArray - list of resources
 * @param ref - resource or resource identifier to look for
 * @param namespace
 * @returns {number}
 */
export const findIndex = (eArray, ref, namespace = undefined) =>
    (eArray||[]).findIndex(x => getFullID(namespace, x) === getFullID(namespace, ref));

/**
 * Find resource object given its reference (identifier)
 * @param ref - reference to resource (objet, identifier or full identifier)
 * @param parentGroup - group that the reference is used in
 * @param prop - group field that is supposed to contain the referred resource
 * @param generate - flag indicating whether to generate resource if it is not found
 * @returns {undefined|*}
 */
export const refToResource = (ref, parentGroup, prop, generate = false) => {
    if (!ref) return undefined;
    if (ref::isObject()){
        return ref;
    }
    let res;
    if (parentGroup[prop + "ByID"]) {
        res = parentGroup[prop + "ByID"][getFullID(parentGroup.namespace, ref)];
    }
    if (parentGroup.entitiesByID){
        res = res || parentGroup.entitiesByID[getFullID(parentGroup.namespace, ref)];
    }
    //Look for generated resources in the parent group
    res = res || findResourceByID(parentGroup[prop], ref, getRefNamespace(ref, parentGroup.namespace));
    if (res) {
        res.namespace = res.namespace || getRefNamespace(ref, parentGroup.namespace);
    }
    if (!res && generate) {
        res = genResource({
            [$Field.id]: getID(ref),
            [$Field.namespace]: getRefNamespace(ref, parentGroup.namespace)
        }, "utils.refToResource");
        res.fullID = getFullID(res.namespace, res.id);
        parentGroup[prop] = parentGroup[prop] || [];
        parentGroup[prop].push(res);
    }
    return res;
}

export const refsToResources = (eArray, parentGroup, prop, generate = false) => {
    return (eArray||[]).map(e => refToResource(e, parentGroup, prop, generate));
}

/**
 * Returns a list of references in the schema type specification
 * @param spec - schema definition
 * @returns {*} - list of references
 */
const getClassRefs = (spec) => {
    if (!spec){ return null; }
    if (spec.$ref) { return [spec.$ref]; }
    if (spec.items) { return getClassRefs(spec.items); }
    let expr = spec.oneOf || spec.anyOf || spec.allOf;
    if (expr){
        return expr.filter(e => e.$ref && !e.$ref.endsWith("Scheme")).map(e => e.$ref);
    }
};

/**
 * Indicates whether schema class definition is abstract
 * @type {boolean} Returns true if the class is abstract
 */
export const isClassAbstract = (clsName) => schema.definitions[clsName].abstract;

export const genResource = (json, caller) => {
    // Uncomment to trace who created a certain resource
    // if (json.id === ID) {
    //     console.error(caller, JSON.stringify(json));
    // }
    json.generated = true;
    return json;
}

/**
 * Add a given resource to a given group and a parent group if it does not exist
 * @param group - a group to add resources to
 * @param parentGroup - parent group
 * @param resource - resource
 * @param prop - property in the group
 */
export const mergeGenResource = (group, parentGroup, resource, prop) => {
    if (!resource) { return; }

    let nm = getRefNamespace(resource, parentGroup?.namespace);

    if (resource::isObject()){
        resource.id === resource.id || getNewID();
        resource.namespace = nm;
        resource.fullID = resource.fullID || getFullID(nm, resource.id);
    }

    if (group){
        group[prop] = group[prop] || [];
        if (resource::isObject()){
            if (!isIncluded(group[prop], resource.id, nm)){
                group[prop].push(resource.fullID);
            }
            resource.hidden = group.hidden;
        } else {
            if (!isIncluded(group[prop], resource, nm)){
                group[prop].push(getFullID(nm, resource));
            }
        }
    }
    if (parentGroup && resource::isObject()){
        parentGroup[prop] = parentGroup[prop] || [];
        if (!isIncluded(parentGroup[prop], resource.id, nm)){
            parentGroup[prop].push(resource);
            if (parentGroup[prop + "ByID"]) {
                parentGroup[prop + "ByID"][resource.fullID] = resource;
            }
        }
    }
};

/**
 * @param group - a group to add resources to
 * @param parentGroup - parent group
 * @param edge - an array with a link, target node, and conveying lyph
 */
export const mergeGenResources = (group, parentGroup, edge) => {
    let [lnk, trg, lyph] = edge;
    mergeGenResource(group, parentGroup, lnk, $Field.links);
    mergeGenResource(group, parentGroup, trg, $Field.nodes);
    mergeGenResource(group, parentGroup, lyph, $Field.lyphs);
};

/**
 * Sets visibility properties for given set of resource groups
 * @param groups
 * @param ids
 */
export const showGroups = (groups, ids) => {
    if (!ids) {return;}
    let groupsToShow = new Set();
    (groups||[]).forEach(g => {
        g.hide();
        if (ids.find(id => g.isGeneratedFrom(id))){
            groupsToShow.add(g);
        }
    });
    [...groupsToShow].forEach(g => g.show());
};

/**
 * Prepares JSON input model for export to Excel
 * @param inputModel - graph or scaffold model
 * @param prop - container property for nested resources, i., groups or components
 * @param propNames - valid resource schema properties mapped to the main sheet
 * @param sheetNames - valid resource schema properties converted to Excel sheets
 */
export const prepareForExport = (inputModel, prop, propNames, sheetNames) => {
    let modelProps = {}
    inputModel::keys().forEach(key => {
        //Group properties for "main" page
        if (propNames.find(y => y === key)) {
            modelProps[key] = inputModel[key];
            delete inputModel[key];
        } else {
            //Remove properties that are not relationships
            if (!sheetNames.find(y => y === key)) {
                delete inputModel[key];
            }
        }
    })
    inputModel.main = [modelProps];
    for (let i = 0; i < (inputModel[prop]||[]).length; i++){
        let group = inputModel[prop][i];
        group::keys().forEach(key => {
            //Cannot convert nested resources, flatten the model
            if (group[key]::isObject() && group[key].id){
                if (sheetNames.includes(key)){
                    inputModel[key] = inputModel[key] || [];
                    inputModel[key].push(group[key]::cloneDeep());
                    group[key] = group[key].id;
                }
            }
        })
    }
    inputModel::keys().forEach(key => {
        const objToStr = obj => obj::isObject()? (obj.id ? obj.id : JSON.stringify(obj)): obj;
        (inputModel[key]||[]).forEach(resource => {
            if (resource.levels){
                resource.levelTargets = [];
                (resource.levels||[]).forEach((level, i) => {
                    if (level && level.target){
                        resource.levelTargets.push(i + ":" + getID(level.target))
                    }
                })
                resource.levelTargets = resource.levelTargets.join(", ");
                delete resource.levels;
            }
            if (resource.border){
                const borderNames = ["inner", "radial1", "outer", "radial2"];
                if (resource.border.borders){
                    for (let i = 0; i < 4; i++){
                        if (resource.border.borders[i] && resource.border.borders[i].hostedNodes) {
                            resource[borderNames[i]] = resource.border.borders[i].hostedNodes.join(", ");
                        }
                    }
                }
                delete resource.border;
            }
            resource::keys().forEach(prop => {
                if (resource[prop]::isArray()) {
                    resource[prop] = resource[prop].map(value => objToStr(value)).join(", ");
                } else {
                    if (resource[prop]::isObject()) {
                        //Replace resource objects with IDs, stringify simple objects (i.e., "layout")
                        resource[prop] = objToStr(resource[prop]);
                    }
                }
            })
        })
    })
}

/**
 * Recursively merges objects from the given object fields
 * @param obj - object to process
 * @param key - property to recurse
 * @param props - properties toc merge
 * @param msg - logging message
 */
export const mergeRecursively = (obj, key, props, msg) => {
    if (obj._processed){
        return;
    }
    (obj[key]||[]).forEach(obj2 => {
        if (obj2.id === obj.id) {
            logger.warn(msg, obj.id, obj2.id);
            return;
        }
        if (obj2[key]){
            mergeRecursively(obj2, key, props, msg);
        }
    });
    (obj[key]||[]).forEach(obj2 => {
        if (obj2.id !== obj.id) {
            (props||[]).forEach(prop => {
                if (obj2[prop]::isArray()) {
                    obj[prop] = (obj[prop] || [])::unionBy(obj2[prop], $Field.fullID);
                    obj[prop] = obj[prop].filter(x => x && x.class);
                }
            });
        }
    });
    obj._processed = true;
}

/**
 * Removes a given field from an object recursively
 * @param obj - object to modify
 * @param key - property to recurse
 * @param prop - property to delete
 */
export function deleteRecursively(obj, key, prop){
    delete obj[prop];
    (obj[key]||[]).forEach(obj2 => deleteRecursively(obj2, key, prop));
}

/**
 * Creates maps of resources defined in the input model groups
 * @param json - input model
 * @param relFieldNames - resource properties to process
 * @param groupProp - property name to classify resources (e.g., "group" or "component")
 */
export function collectNestedResources(json, relFieldNames = [], groupProp){
    relFieldNames.forEach(prop => {
        let mapProp = [prop + "ByID"];
        if (!json[mapProp]){
            json[mapProp] = {};
        }
        if (json[prop]::isArray()){
            (json[prop]||[]).forEach( r => {
                if (r::isObject()) {
                    r.id = r.id || getNewID();
                    r.namespace = r.namespace || getRefNamespace(r.id, json.namespace);
                    r.fullID = r.fullID || getFullID(r.namespace, r.id);
                    if (!json[mapProp][r.fullID]) {
                        json[mapProp][r.fullID] = r;
                    } else {
                        logger.error($LogMsg.RESOURCE_DUPLICATE, r.fullID, r.id);
                    }
                }
            })
        }
        (json[groupProp]||[]).forEach(g => {
            if ( g::isObject()) {
                g[mapProp] = json[mapProp];
            }
        });
    });
    (json[groupProp]||[]).forEach(g => g::isObject() && collectNestedResources(g, relFieldNames, groupProp));
}

/**
 * Determines if at least one of the given schema references extend a certain class
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
                let def = schema.definitions[clsName];
                res = res || def && extendsClass(getClassRefs(def), value);
            }
        }
    });
    return res;
};

/**
 * Returns recognized class properties from the specification with default values
 * @param {string} className
 */
const getFieldDefaultValues = (className) => {
    const initValue = (specObj) => {
        return specObj.default?
            (specObj.default::isObject()
                ? specObj.default::cloneDeep()
                : specObj.default )
            : undefined;
    }
    return schema.definitions[className].properties::entries().map(([key, value]) => ({[key]: initValue(value)}));
};

/**
 * Recursively applies a given operation to the classes in schema schema.definitions
 * @param {string} className - initial class
 * @param {function} handler - function to apply to the current class
 */
const recurseSchema = (className, handler) => {
    let stack = [className];
    let i = 0;
    while (stack[i]){
        let clsName = stack[i];
        if (schema.definitions[clsName]){
            let refs = getClassRefs(schema.definitions[clsName]);
            (refs||[]).forEach(ref => {
                stack.push(ref.substr(ref.lastIndexOf("/") + 1).trim());
            });
        }
        i++;
    }
    while (stack.length > 0){
        let clsName = stack.pop();
        handler(clsName);
    }
};

/**
 * A class that provides helper properties for schema-based resource classes
 * @class
 * @property schema
 * @property schemaClassName
 * @property defaultValues
 * @property fields
 * @property relationships
 * @property relClassNames
 */
export class SchemaClass {
    schemaClsName;
    defaultValues = {};
    relClassNames = {};
    fields = [];
    relationships = [];

    constructor(schemaClsName) {
        this.schemaClsName = schemaClsName;
        if (!schema.definitions[schemaClsName]) {
            throw new Error("Failed to find schema definition for class: " + schemaClsName);
        } else {
            this.schema = schema.definitions[this.schemaClsName];

            let res = {};
            recurseSchema(this.schemaClsName, (currName) => res::merge(...getFieldDefaultValues(currName)));
            this.defaultValues = res;

            let res2 = {};
            recurseSchema(this.schemaClsName, (currName) => res2::merge(schema.definitions[currName].properties));
            this.fields = res2::entries();

            this.relationships = this.fields.filter(([, spec]) => extendsClass(getClassRefs(spec), $SchemaClass.Resource));
            this.properties = this.fields.filter(([key,]) => !this.relationships.find(([key2,]) => key2 === key));
            this.fieldMap = this.fields::fromPairs();
            this.propertyMap = this.properties::fromPairs();
            this.relationshipMap = this.relationships::fromPairs();
            this.fieldNames = this.fields.map(([key,]) => key);
            this.propertyNames = this.properties.map(([key,]) => key);
            this.relationshipNames = this.relationships.map(([key,]) => key);
            this.relClassNames = this.relationships.map(([key, spec]) => [key, getClassName(spec)])::fromPairs();

            this.cudFields = this.fields.filter(([, spec]) => !spec.readOnly);
            this.cudProperties = this.properties.filter(([, spec]) => !spec.readOnly);
            this.cudRelationships = this.relationships.filter(([, spec]) => !spec.readOnly);
        }
    }

    /**
     * Check whether the resource extends a given class
     * @param clsName - class name
     * @returns {boolean}
     */
    extendsClass(clsName) {
        return (clsName === this.schemaClsName) || extendsClass(getClassRefs(this.schema), clsName);
    }

    /**
     * Get relationships that point to resources with given class names
     * @param clsNames - resource class names
     * @returns {any[]}
     */
    filteredRelNames(clsNames = []){
        return (this.relationships||[]).filter(([, spec]) => !clsNames.includes(getClassName(spec))).map(([key, ]) => key);
    }

    /**
     * Get relationship names that point to resources of a given class
     * @param clsName - resource class name
     * @returns {any[]}
     */
    selectedRelNames(clsName){
        return (this.relClassNames::entries()||[]).filter(([, cls]) => cls === clsName).map(([key, ]) => key);
    }
}

/**
 * Definition of all schema-based resource classes
 */

export const assignEntityByID = (res, entitiesByID, namespace, modelClasses) => {
    if (entitiesByID){
        if (!res.id) { res.id = getNewID(entitiesByID); }
        if (res.id::isNumber()){
            res.id = res.id.toString();
            logger.warn($LogMsg.RESOURCE_NUM_ID_TO_STR, res.id);
        }

        if (entitiesByID[res.fullID]){
            if (entitiesByID[res.fullID] !== res) {
                logger.warn($LogMsg.RESOURCE_NOT_UNIQUE, entitiesByID[res.fullID], res);
            }
        } else {
            entitiesByID[res.fullID] = res;
            reviseWaitingList(entitiesByID.waitingList, res);
            replaceIDs(modelClasses, entitiesByID, res);
        }
    }
};


/**
 * Waiting list keeps objects that refer to unresolved model resources.
 * When a new resource definition is found or created, all resources that referenced this resource by ID get the
 * corresponding object reference instead
 * @param {Map<string, Array<Resource>>} waitingList - associative array that maps unresolved IDs to the list of resource definitions that refer to it
 * @param context - resource that will replace identifier references to it in the waiting list
 */
export const reviseWaitingList = (waitingList, context) => {
    let res = context;
    (waitingList[res.fullID]||[]).forEach(([obj, key, clsName]) => {
        if (obj[key]::isArray()) {
            obj[key].forEach((e, i) => {
                if (e === res.id || e === res.fullID){
                    if (!schemaClassModels[res.class].extendsClass(clsName)){
                        logger.error($LogMsg.RESOURCE_TYPE_MISMATCH, obj.id, key, res.id, clsName, res.class);
                    }
                    obj[key][i] = res;
                }
            });
        } else {
            if (obj[key] === res.id || obj[key] === res.fullID){
                if (!schemaClassModels[res.class].extendsClass(clsName)){
                    logger.error($LogMsg.RESOURCE_TYPE_MISMATCH, obj.id, key, res.id, clsName, res.class);
                }
                obj[key] = res;
            }
        }
    });
    delete waitingList[res.fullID];
};

/**
/**
 * Replace IDs with object references
 * @param {Object} modelClasses - map of class names vs implementation of ApiNATOMY resources
 * @param {Map<string, Resource>} entitiesByID - map of resources in the global model
 * @param res - resource to update
 */
export const replaceIDs = (modelClasses, entitiesByID, res) => {
    const skip = value => !value || value::isObject() && value::isEmpty() || value.class && (value instanceof modelClasses[value.class]);

    const createObj = (res, key, value, spec) => {
        if (skip(value)) { return value; }

        if (value::isNumber()) {
            value = value.toString();
            logger.warn($LogMsg.RESOURCE_NUM_VAL_TO_STR, value, res.fullID, key);
        }

        let clsName = getClassName(spec);
        if (!clsName){
            logger.warn($LogMsg.RESOURCE_NO_CLASS,
                spec, value);
            return value;
        }

        if (value && value::isString()) {
            let fullValueID = getFullID(res.namespace, value);
            if (!entitiesByID[fullValueID]) {
                //put to a waiting list instead
                entitiesByID.waitingList[fullValueID] = entitiesByID.waitingList[fullValueID] || [];
                entitiesByID.waitingList[fullValueID].push([res, key, clsName]);
                return value;
            } else {
                return entitiesByID[fullValueID];
            }
        }

        if (value.id) {
            value.fullID = value.fullID || getFullID(res.namespace, value.id);
            if (entitiesByID[value.fullID]) {
                if (value !== entitiesByID[value.fullID]) {
                    //FIXME the condition hides warning for generated resources as it is often erroneously triggered by node clones in multi-namespace models
                    if (!value.generated || !entitiesByID[value.fullID].generated) {
                        logger.warn($LogMsg.RESOURCE_DUPLICATE, res.fullID, key, value, entitiesByID[value.fullID]);
                    }
                }
                return entitiesByID[value.fullID];
            }
        }

        //value is an object and it is not in the map
        if (isClassAbstract(clsName)){
            if (value.class) {
                clsName = value.class;
                if (!modelClasses[clsName]){
                    logger.error($LogMsg.RESOURCE_NO_CLASS_DEF, value.class, value);
                }
            } else {
                logger.error($LogMsg.RESOURCE_NO_ABSTRACT_CLASS, value);
                return null;
            }
        }
        return modelClasses[clsName].fromJSON(value, modelClasses, entitiesByID, res.namespace);
    };

    if (!modelClasses[res.class]){
        logger.error($LogMsg.RESOURCE_NO_CLASS_DEF, modelClasses, this.class);
        return;
    }

    let refFields = schemaClassModels[res.class].relationships;
    // let res = this;
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
export const schemaClassModels = schema.definitions::keys().map(schemaClsName => [schemaClsName, new SchemaClass(schemaClsName)])::fromPairs();
