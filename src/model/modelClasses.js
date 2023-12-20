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
import {VarianceSpec} from "./varianceSpecModel";
import {VisualResource, Material} from './visualResourceModel';
import {Vertice, Anchor, Node} from './verticeModel';
import {Edge, Wire, Link} from './edgeModel';
import {Shape, Lyph, Region, Border} from './shapeModel'
import {Coalescence}  from './coalescenceModel';
import {State, Snapshot} from "./snapshotModel";
import {isString, keys, assign, isObject} from "lodash-bound";
import schema from "./graphScheme";
import {logger} from "./logger";
import * as XLSX from 'xlsx';
import { mergeWith } from 'lodash-bound';
import {
    $Field,
    ModelType,
    $SchemaClass,
    assignEntityByID,
    $SchemaType,
    getGenID,
    getGenName, $Prefix
} from "./utils";

const hash = require('object-hash');

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
    [$SchemaClass.VarianceSpec]   : VarianceSpec,
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
export function generateFromJSON(inputModel) {
    inputModel.version = hash(inputModel);
    inputModel.id = inputModel.id || "main";
    inputModel.namespace = inputModel.namespace || "nm_" + inputModel.id;
    inputModel.schemaVersion = hash(schema);
    if (isScaffold(inputModel)) {
        return Scaffold.fromJSON(inputModel, modelClasses);
    } else {
        //Move levels to links
        let count = 1;
        (inputModel.chains||[]).forEach(chain => {
            chain.id = chain.id || getGenID($Prefix.chain, $Prefix.default, count++);
            (chain.levels||[]).forEach((level, i) => {
                if (level::isObject()){
                    level.id = level.id || getGenID($Prefix.link, $Prefix.default, chain.id, i);
                    inputModel.links = inputModel.links || [];
                    inputModel.links.push(level);
                    chain.levels[i] = level.id;
                }
            });
        });
        return Graph.fromJSON(inputModel, modelClasses);
    }
}

/**
 * Import external files and merge them with the model
 * @param inputModel - input model
 * @returns {Promise<*>} - input model with imported parts (e.g., scaffold)
 */
export async function mergeWithImports(inputModel){
    if (inputModel.imports) {
        function get(url) {
            return new Promise(function (resolve, reject) {
                let req = new XMLHttpRequest();
                req.responseType = 'json';
                req.open('GET', url);
                req.onload = function () {
                    if (req.status === 200) {
                        resolve(req.response);
                    } else {
                        reject(Error(req.statusText));
                    }
                }
                req.onerror = function () {
                    reject(Error("Unexpected error when trying to import model: " + url));
                }
                req.send();
            });
        }
        await Promise.all((inputModel.imports || []).map(url => get(url))).then(values => {
             if (values && values.length > 0) {
                processImports(inputModel, values);
             }
        });
    }
    return inputModel;
}

export function processImports(inputModel, importedModels){
    let scaffolds = importedModels.filter(m => isScaffold(m));
    let groups = importedModels.filter(m => isGraph(m));
    inputModel.scaffolds = inputModel.scaffolds || [];
    inputModel.groups = inputModel.groups || [];

    function addNestedImports(newModel){
        (newModel.imports||[]).forEach(newImport => {
            if (!inputModel.imports.find(url => url === newImport)){
                inputModel.imports.push(newImport);
            }
        });
    }

    groups.forEach(newModel => {
        newModel.imported = true;
        const groupIdx = inputModel.groups.findIndex(s => s.id === newModel.id);
        if (groupIdx === -1) {
            inputModel.groups.push(newModel);
        } else {
            inputModel.groups[groupIdx] = newModel;
        }
         //Uplift imported model's scaffolds to reveal them in the settings panel
        (newModel.scaffolds||[]).forEach(scaffold => {
           scaffolds.push(scaffold);
        });
        addNestedImports(newModel);
    });
    scaffolds.forEach(newModel => {
        newModel.imported = true;
        const scaffoldIdx = inputModel.scaffolds.findIndex(s => s.id === newModel.id);
        if (scaffoldIdx === -1) {
            inputModel.scaffolds.push(newModel);
        } else {
            inputModel.scaffolds[scaffoldIdx] = newModel;
        }
        addNestedImports(newModel);
    });
}

/**
 * FIXME Revise to work with namespaces (i.e., use fullResID as key in waitingList)
 * @param {*} inputModel
 * @returns
 */
export function fromJSONGenerated(inputModel) {
    let namespace = inputModel.namespace || undefined;
    let entitiesByID = { waitingList: {}};

    function typeCast(obj) {
        if (obj instanceof Object && !(obj instanceof Array) && !(typeof obj === 'function') && obj['class'] !== undefined && modelClasses[obj['class']] !== undefined) {
            const cls = modelClasses[obj['class']];
            const res = new cls(obj.id, cls.name);
            res.class = obj['class'];
            res::assign(obj);
            assignEntityByID(res, entitiesByID, namespace, modelClasses);
            return res;
        } else {
            return obj;
        }
    }

    const _casted_model = typeCast(inputModel);
    if (_casted_model.class === ModelType.GRAPH) {
        Graph.processGraphWaitingList(_casted_model, entitiesByID, namespace, modelClasses, typeCast);
    } else if (_casted_model.class === ModelType.SCAFFOLD) {
        Scaffold.processScaffoldWaitingList(_casted_model, entitiesByID, namespace, modelClasses, typeCast);
    }

    _casted_model.entitiesByID = entitiesByID;
    return _casted_model;
}

/**
 *
 * @param inputModel
 * @param callback
 */
export function fromJsonLD(inputModel, callback) {
    return Graph.entitiesToJSONLDFlat(inputModel, callback);
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
                if (spec.type === $SchemaType.ARRAY){
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
            return joined::mergeWith({
                [$Field.id]        : getGenID(inputModelA.id, inputModelB.id),
                [$Field.name]      : getGenName(inputModelA.name, "+" ,inputModelB.name),
                [$Field.components]: [inputModelA, inputModelB]
            });
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
        if (spec.type === $SchemaType.ARRAY){
            joined[prop] = Array.from(new Set([...inputModelA[prop]||[], ...inputModelB[prop]||[]]));
        }
        delete inputModelB[prop];
        delete inputModelA[prop];
    });
    if (flattenGroups) {
        inputModelA.groups = inputModelA.groups || [];
        inputModelA.groups.push(inputModelB);
    }
    return joined::mergeWith({
        [$Field.id]    : getGenID(inputModelA.id, inputModelB.id),
        [$Field.name]  : getGenName(inputModelA.name, "+" ,inputModelB.name),
        [$Field.groups]: [inputModelA, inputModelB]
    });
}
