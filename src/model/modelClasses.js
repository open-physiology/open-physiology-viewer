import {GroupTemplate} from './groupTemplateModel';
import {Chain}   from './chainModel';
import {Tree}    from './treeModel';
import {Channel} from './channelModel';
import {Villus}  from './villusModel';
import {Group}   from './groupModel';
import {Component} from './componentModel';
import {Graph}   from './graphModel';
import {Scaffold} from './scaffoldModel';
import {Resource, External, Reference, OntologyTerm} from './resourceModel';
import {VisualResource, Material} from './visualResourceModel';
import {Vertice, Anchor, Node} from './verticeModel';
import {Edge, Wire, Link} from './edgeModel';
import {Shape, Lyph, Region, Border} from './shapeModel'
import {Coalescence}  from './coalescenceModel';
import {State, Snapshot} from "./snapshotModel";
import {isString, isObject, isArray, isNumber, isEmpty, keys, assign} from "lodash-bound";
import * as schema from "./graphScheme";
import {logger} from "./logger";

import * as XLSX from 'xlsx';

import * as jsonld from "jsonld/dist/node6/lib/jsonld";

import { entries, mergeWith } from 'lodash-bound';

import {
    $Field,
    $SchemaClass,
    getNewID,
    getFullID,
    getClassName,
    isClassAbstract,
    schemaClassModels, getRefNamespace, mergeWithModel
} from "./utils";
import {removeDisconnectedObjects} from "../view/render/autoLayout";

export const modelClasses = {
    /*Abstract */
    [$SchemaClass.Resource]       : Resource,
    [$SchemaClass.VisualResource] : VisualResource,
    [$SchemaClass.GroupTemplate]  : GroupTemplate,
    [$SchemaClass.Shape]          : Shape,
    [$SchemaClass.Edge]           : Edge,
    [$SchemaClass.Vertice]        : Vertice,

    /*Resources */
    [$SchemaClass.External]       : External,
    [$SchemaClass.Reference]      : Reference,
    [$SchemaClass.OntologyTerm]   : OntologyTerm,
    [$SchemaClass.Coalescence]    : Coalescence,
    [$SchemaClass.Channel]        : Channel,
    [$SchemaClass.Chain]          : Chain,
    [$SchemaClass.Tree]           : Tree,
    [$SchemaClass.Villus]         : Villus,
    [$SchemaClass.Group]          : Group,
    [$SchemaClass.Graph]          : Graph,
    [$SchemaClass.Component]      : Component,
    [$SchemaClass.Scaffold]       : Scaffold,

    /*Visual resources */
    [$SchemaClass.Anchor]         : Anchor,
    [$SchemaClass.Wire]           : Wire,
    [$SchemaClass.Node]           : Node,
    [$SchemaClass.Link]           : Link,

    /* Shapes */
    [$SchemaClass.Material]       : Material,
    [$SchemaClass.Region]         : Region,
    [$SchemaClass.Lyph]           : Lyph,
    [$SchemaClass.Border]         : Border,

    /* Scaffold */
    [$SchemaClass.State]          : State,
    [$SchemaClass.Snapshot]       : Snapshot,
};

/**
 * Parses input specification in XLSX (Excel file) or JSON format
 * @param content   - input model content
 * @param name      - file name
 * @param extension - file extension
 * @param isBinary  - Boolean flag that indicates whether the input model is in binary format
 */
export function loadModel(content, name, extension, isBinary = true){
    logger.clear();
    let newModel = {};
    if (extension === "xlsx"){
        let excelModel = {};
        const wb = isBinary? XLSX.read(content, {type: "binary"}): content;
        wb.SheetNames.forEach(sheetName => {
            let roa = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {header:1});
            if(roa.length) { excelModel[sheetName] = roa; }
        });
        excelModel[$Field.id] = excelModel[$Field.id] || name;
        newModel = excelToJSON(excelModel);
    } else {
        if (extension === "json") {
            if (content::isString()){
                newModel = JSON.parse(content);
            } else {
                newModel = content;
            }
        }
    }
    newModel[$Field.name] = newModel[$Field.name] || name;
    return newModel;
}

/**
 * Determines whether the given JSON specification defines a scaffold
 * @param inputModel
 * @returns {boolean}
 */
export function isScaffold(inputModel){
    return !!(inputModel.components || inputModel.anchors || inputModel.wires);
}

/**
 * Determines whether the given JSON specification defines a snapshot model
 * @param inputModel
 * @returns {boolean}
 */
export function isSnapshot(inputModel){
    return !!(inputModel.model && inputModel.states);
}

/**
 * Determines whether the given JSON specification defines a connectivity model
 * @param inputModel
 * @returns {boolean}
 */
export function isGraph(inputModel){
    return !!(inputModel.lyphs || inputModel.links || inputModel.nodes);
}

/**
 * Convert model from Excel template to JSON input specification
 * @param inputModel - Excel input specification of connectivity model or scaffold
 * @returns {*}
 */
export function excelToJSON(inputModel) {
    if (isScaffold(inputModel)){
        return Scaffold.excelToJSON(inputModel, modelClasses);
    } else {
        return Graph.excelToJSON(inputModel, modelClasses);
    }
}

/**
 * Converts input JSON model to Excel workbook
 * @param inputModel
 * @returns {void|*}
 */
export function jsonToExcel(inputModel) {
    if (isScaffold(inputModel)){
        return Scaffold.jsonToExcel(inputModel);
    } else {
        (inputModel.scaffolds||[]).forEach(scaffold => Scaffold.jsonToExcel(scaffold));
        delete inputModel.scaffolds;
        return Graph.jsonToExcel(inputModel);
    }
}

/**
 * Create complete typed model from JSON input specification
 * @param inputModel - JSON input specification of connectivity model or scaffold
 * @returns {Graph}
 */
export function fromJSON(inputModel) {
    if (isScaffold(inputModel)){
        return Scaffold.fromJSON(inputModel, modelClasses);
    } else {
        return Graph.fromJSON(inputModel, modelClasses);
    }
}

/**
 * FIXME Revise to work with namespaces (i.e., use fullResID as key in waitingList)
 * @param {*} inputModel
 * @returns
 */
export function fromJSONGenerated(inputModel) {
    let namespace = inputModel.namespace || undefined;
    let entitiesByID = {
        waitingList: {}
    };

    const skip = value => !value || value::isObject() && value::isEmpty() || value.class && (value instanceof modelClasses[value.class]);

    function replaceIDs(modelClasses, entitiesByID, namespace, context){
        const createObj = (res, key, value, spec) => {
            if (skip(value)) { return value; }
            if (value::isNumber()) {
                value = value.toString();
            }
            let clsName = getClassName(spec);
            if (!clsName){
                return value;
            }
            if (value && value::isString()) {
                const fullValueID = getFullID(namespace, value);
                if (!entitiesByID[fullValueID]) {
                    //put to a wait list instead
                    entitiesByID.waitingList[value] = entitiesByID.waitingList[value] || [];
                    entitiesByID.waitingList[value].push([res, key]);
                    return value;
                } else {
                    return entitiesByID[fullValueID];
                }
            }
            if (value.id) {
                const fullValueID = getFullID(namespace, value.id);
                if (entitiesByID[fullValueID]) {
                    return entitiesByID[fullValueID];
                }
            }
            //value is an object and it is not in the map
            if (isClassAbstract(clsName)){
                if (value.class) {
                    clsName = value.class;
                    if (!schemaClassModels[clsName]){
                    }
                } else {
                    return null;
                }
            }
            return typeCast(value);
        };

        if (!modelClasses[context.class]){
            return;
        }

        const refFields = schemaClassModels[context.constructor.name].relationships;
        let res = context;
        refFields.map(([key, spec]) => {
            if (skip(res[key])) { return; }
            if (res[key]::isArray()){
                res[key] = res[key].map(value => createObj(res, key, value, spec));
            } else {
                res[key] = createObj(res, key, res[key], spec);
            }
        });
    }

    function reviseWaitingList(waitingList, namespace, context){
        let res = context;
        (waitingList[res.id]||[]).map(([obj, key]) => {
            if (obj[key]::isArray()){
                obj[key].map((e, i) => {
                    if (e === res.id) {
                        obj[key][i] = res;
                    }
                });
            } else {
                if (obj[key] === res.id){
                    obj[key] = res;
                }
            }
        });
        delete waitingList[res.id];
    }

    function typeCast(obj) {
        if (obj instanceof Object && !(obj instanceof Array) && !(typeof obj === 'function') && obj['class'] !== undefined && modelClasses[obj['class']] !== undefined) {
            const cls = modelClasses[obj['class']];
            const res = new cls(obj.id, cls.name);
            res.class = obj['class'];
            res::assign(obj);

            if (entitiesByID){
                if (!res.id) { res.id = getNewID(entitiesByID); }
                if (res.id::isNumber()) {
                    res.id = res.id.toString();
                }
                let fullResID = getFullID(namespace, res.id);
                if (entitiesByID[fullResID]) {
                    if (entitiesByID[fullResID] !== res){
                        logger.error($LogMsg.RESOURCE_NOT_UNIQUE, entitiesByID[fullResID], res);
                    }
                } else {
                    entitiesByID[fullResID] = res;
                    reviseWaitingList(entitiesByID.waitingList, namespace, res);
                    replaceIDs(modelClasses, entitiesByID, namespace, res);
                }
            }
            return res;
        } else {
            return obj;
        }
    }

    function _createResource(id, clsName, model, modelClasses, entitiesByID, namespace){
        const e = typeCast({
            [$Field.id]: id,
            [$Field.class]: clsName,
            [$Field.namespace]: getRefNamespace(id),
            [$Field.generated]: true
        })

        //Do not show labels for generated visual resources
        if (e.prototype instanceof modelClasses.VisualResource){
            e.skipLabel = true;
        }
        mergeWithModel(e, clsName, model);
        const fullID = getFullID(namespace, e.id);
        entitiesByID[fullID] = e;
        return e;
    }

    function processGraphWaitingList(model, entitiesList) {
        const added = [];
        (entitiesList.waitingList)::entries().map(([id, refs]) => {
            const [obj, key] = refs[0];
            if (obj && obj.class){
                const clsName = schemaClassModels[obj.class].relClassNames[key];
                if (clsName && !schemaClassModels[clsName].schema.abstract) {
                    const e = _createResource(id, clsName, model, modelClasses, entitiesList, namespace);
                    added.push(e.id);
                    //A created link needs end nodes
                    if (e instanceof modelClasses.Link) {
                        const i = 0;
                        const related = [$Field.sourceOf, $Field.targetOf];
                        e.applyToEndNodes(end => {
                            if (end::isString()) {
                                let s = _createResource(end, $SchemaClass.Node, model, modelClasses, entitiesList, namespace);
                                added.push(s.id);
                                s[related[i]] = [e];
                            }
                        });
                    }
                }
            }
        });

        if (added.length > 0){
            added.map(id => delete entitiesList.waitingList[id]);
        }

        model.syncRelationships(modelClasses, entitiesList);
        model.entitiesByID = entitiesList;
    }

    function processScaffoldWaitingList(model, entitiesList) {
        //Auto-create missing definitions for used references
        const added = [];
        (entitiesList.waitingList)::entries().map(([id, refs]) => {
            const [obj, key] = refs[0];
            if (obj && obj.class) {
                const clsName = schemaClassModels[obj.class].relClassNames[key];
                if (clsName && !schemaClassModels[clsName].schema.abstract) {
                    const e = typeCast({
                        [$Field.id]: id,
                        [$Field.class]: clsName,
                        [$Field.namespace]: getRefNamespace(id),
                        [$Field.generated]: true
                    })

                    //Include newly created entity to the main graph
                    mergeWithModel(e, clsName, model);
                    const fullID = getFullID(namespace, e.id);
                    entitiesList[fullID] = e;
                    added.push(e.id);
                }
            }
        });

        if (added.length > 0) {
            added.map(id => delete entitiesList.waitingList[id]);
        }
        model.syncRelationships(modelClasses, entitiesList);
        model.entitiesByID = entitiesList;
        delete model.waitingList;
    }

    const _casted_model = typeCast(inputModel);
    if (_casted_model.class === "Graph") {
        processGraphWaitingList(_casted_model, entitiesByID);
    } else if (_casted_model.class === "Scaffold") {
        processScaffoldWaitingList(_casted_model, entitiesByID);
    }

    return _casted_model;
}

/**
 *
 * @param inputModel
 * @param callback
 */
export function fromJsonLD(inputModel, callback) {
    let res = inputModel;
    let context = {};
    res['@context']::entries().map(([k, v]) => {
        if (v::isObject() && "@id" in v && v["@id"].includes("apinatomy:")) {
        } else if (typeof(v) === "string" && v.includes("apinatomy:")) {
        } else if (k === "class") { // class uses @context @base which is not 1.0 compatible
        } else {
            context[k] = v;
        }});
    jsonld.flatten(res).then(flat => {
        jsonld.compact(flat, context).then(compact => {
            callback(compact)})});
}

/**
 * Join two input models. Models can be joint:
 *  (1) by placing model B into model A,
 *  (2) by creating a new model where A and B are groups/components,
 *  (3) by placing scaffold into model, model types are defined automatically based on schema
 * @param inputModelA - first input model
 * @param inputModelB - second input model
 * @param flattenGroups - Boolean flag that indicates whether model B should be joined to model A as its group
 * @returns {*}
 */
export function joinModels(inputModelA, inputModelB, flattenGroups = false){
    let joined = {};
    if (isScaffold(inputModelA)){
        if (isScaffold(inputModelB)) {
            //Both specifications define scaffolds
            schema.definitions.Scaffold.properties::keys().forEach(prop => {
                let spec = schema.definitions.Scaffold.properties[prop];
                //FIXME? Local conventions can have duplicates
                if (spec.type === "array"){
                    joined[prop] = Array.from(new Set([...inputModelA[prop]||[], ...inputModelB[prop]||[]]));
                }
                delete inputModelB[prop];
                delete inputModelA[prop];
            });
            if (flattenGroups){
                inputModelA.components = inputModelA.components || [];
                inputModelA.components.push(inputModelB);
                return inputModelA;
            }
            return joined::mergeWith({[$Field.components]: [inputModelA, inputModelB]});
        } else {
            //Connectivity model B gets constrained by scaffold A
            inputModelB.scaffolds = inputModelB.scaffolds || [];
            inputModelB.scaffolds.push(inputModelA);
            return inputModelB;
        }
    } else {
        //Connectivity model A gets constrained by scaffold B
        if (isScaffold(inputModelB)) {
            inputModelA.scaffolds = inputModelA.scaffolds || [];
            inputModelA.scaffolds.push(inputModelB);
            return inputModelA;
        }
    }
    //Both specifications define connectivity models
    schema.definitions.Graph.properties::keys().forEach(prop => {
        let spec = schema.definitions.Graph.properties[prop];
        //FIXME? Local conventions can have duplicates, abbrev is lost
        if (spec.type === "array"){
            joined[prop] = Array.from(new Set([...inputModelA[prop]||[], ...inputModelB[prop]||[]]));
        }
        delete inputModelB[prop];
        delete inputModelA[prop];
    });
    if (flattenGroups) {
        inputModelA.groups = inputModelA.groups || [];
        inputModelA.groups.push(inputModelB);
    }
    return joined::mergeWith({[$Field.groups]: [inputModelA, inputModelB]});
}
