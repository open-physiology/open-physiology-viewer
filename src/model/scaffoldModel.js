import {Resource} from "./resourceModel";
import {Component} from "./componentModel";
import {Validator} from "jsonschema";
import schema from "./graphScheme";
import {logger, $LogMsg} from "./logger";
import {
    cloneDeep,
    defaults,
    entries, isArray,
    isNumber,
    isObject,
    isString,
    keys, merge,
    pick
} from "lodash-bound";
import {$Field, $SchemaClass, $SchemaType, prepareForExport, getFullID, getID, schemaClassModels} from "./utils";
import {extractModelAnnotation, getItemType, strToValue, validateValue} from './utilsParser';
import * as jsonld from "jsonld/dist/node6/lib/jsonld";
import * as XLSX from "xlsx";

/**
 * @property logger
 */
export class Scaffold extends Component {

    /**
     * Create expanded Graph model from the given JSON input model
     * @param json - input model
     * @param modelClasses - classes to represent model resources
     * @param entitiesByID - global map of model resources
     * @param defaultNamespace - connectivity model namespace
     * @returns {Graph}
     */
    static fromJSON(json, modelClasses = {}, entitiesByID, defaultNamespace) {
        const V = new Validator();
        delete schema.oneOf;
        schema.$ref = "#/definitions/Scaffold";
        let resVal = V.validate(json, schema);

        let inputModel = json::cloneDeep()::defaults({id: "mainScaffold"});
        inputModel.class = inputModel.class || $SchemaClass.Scaffold;

        let standalone = entitiesByID === undefined;
        //Copy existing entities to a map to enable nested model instantiation
        /**
         * @property waitingList
         * @type {Object}
         */
        entitiesByID = entitiesByID || {waitingList: {}};
        const before = entitiesByID::keys().length;

        let namespace = inputModel.namespace || defaultNamespace;

        //Create scaffold
        let res = super.fromJSON(inputModel, modelClasses, entitiesByID, namespace);

        if (resVal.errors && resVal.errors.length > 0) {
            logger.error($LogMsg.SCHEMA_SCAFFOLD_ERROR, ...resVal.errors.map(e => e::pick("message", "instance", "path")));
        }

        //Auto-create missing definitions for used references
        let added = [];
        (entitiesByID.waitingList)::entries().forEach(([id, refs]) => {
            let [obj, key] = refs[0];
            if (obj && obj.class) {
                //Only create missing scaffold resources
                if (![$SchemaClass.Region, $SchemaClass.Wire, $SchemaClass.Anchor].includes(obj.class)){
                    return;
                }
                let clsName = schemaClassModels[obj.class].relClassNames[key];
                //Do not create missing scaffold resources references from the connectivity model
                if ([$SchemaClass.Chain, $SchemaClass.Node, $SchemaClass.Lyph, $SchemaClass.Group].includes(clsName)){
                    return;
                }
                if (clsName && !schemaClassModels[clsName].schema.abstract) {
                    let e = modelClasses[clsName].fromJSON({
                        [$Field.id]: id,
                        [$Field.generated]: true
                    }, modelClasses, entitiesByID, namespace);

                    //Include newly created entity to the main model
                    let prop = schemaClassModels[$SchemaClass.Scaffold].selectedRelNames(clsName)[0];
                    if (prop) {
                        res[prop] = res[prop] || [];
                        res[prop].push(e);
                    }
                    let fullID = getFullID(namespace, e.id);
                    entitiesByID[fullID] = e;
                    added.push(e.id);
                }
            }
        });

        if (added.length > 0) {
            added.forEach(id => delete entitiesByID.waitingList[id]);
            let resources = added.filter(id => entitiesByID[getFullID(namespace,id)].class !== $SchemaClass.External);
            if (resources.length > 0) {
                logger.warn($LogMsg.AUTO_GEN, resources);
            }
        }

        if (standalone && entitiesByID.waitingList::keys().length > 0) {
            logger.error($LogMsg.REF_UNDEFINED, "scaffold", entitiesByID.waitingList::keys());
        }

        res.syncRelationships(modelClasses, entitiesByID, namespace);

        res.entitiesByID = entitiesByID;
        delete res.waitingList;

        (res.components||[]).forEach(component => component.includeRelated && component.includeRelated());

        res.generated = true;
        //Log info about the number of generated resources
        logger.info($LogMsg.SCAFFOLD_RESOURCE_NUM, this.id, entitiesByID::keys().length - before);
        res.logger = logger;
        return res;
    }

    /**
     * Scale dimensions of visual resources (length, height and width, coordinates of border points)
     * @param scaleFactor {number} - scaling factor
     */
    scale(scaleFactor){
        const scalePoint = p => ["x", "y", "z"].forEach(key => p[key]::isNumber() && (p[key] *= scaleFactor));
        (this.anchors||[]).forEach(e => e.layout && scalePoint(e.layout));
        (this.wires||[]).forEach(e => {
            e.length && (e.length *= scaleFactor);
            e.arcCenter && scalePoint(e.arcCenter);
            e.controlPoint && scalePoint(e.controlPoint);
            e.radius && scalePoint(e.radius);
        });
        (this.regions||[]).forEach(e => (e.points||[]).forEach(p => scalePoint(p)));
    }

    /**
     * Generate the JSON input model from an Excel file (.xlsx)
     * @param inputModel   - Excel ApiNATOMY scaffolding
     * @param modelClasses - model resource classes
     * @returns {*}
     */
    static excelToJSON(inputModel, modelClasses = {}){
        let scaffoldSchema = schemaClassModels[$SchemaClass.Scaffold];
        let model = inputModel::pick(scaffoldSchema.relationshipNames.concat(["main", "localConventions"]));

        model::keys().forEach(relName => {
            let table = model[relName];
            if (!table) { return; }
            let headers = table[0] || [];
            if (relName === "localConventions") { // local conventions are not a resource
                for (let i = 1; i < table.length; i++) {
                    let convention = {};
                    table[i].forEach((value, j) => {
                        if (value) {
                            if (!headers[j]) {
                                logger.error($LogMsg.EXCEL_NO_COLUMN_NAME, value);
                                return;
                            }
                            if (!headers[j]::isString()) {
                                logger.error($LogMsg.EXCEL_INVALID_COLUMN_NAME, headers[j]);
                                return;
                            }
                            let key = headers[j].trim();
                            convention[key] = value;
                        }
                    });

                    table[i] = convention;
                }
                model[relName] = model[relName].slice(1);
                return;
            }
            let clsName = relName === "main"? $SchemaClass.Scaffold: scaffoldSchema.relClassNames[relName];
            if (!modelClasses[clsName]) {
                logger.warn($LogMsg.EXCEL_NO_CLASS_NAME, relName);
                return;
            }
            let fields = schemaClassModels[clsName].fieldMap;
            let propNames = schemaClassModels[clsName].propertyNames;

            const convertValue = (key, value) => {
                if (!fields[key]) {
                    logger.warn($LogMsg.EXCEL_PROPERTY_UNKNOWN, clsName, key);
                    return;
                }
                let res = value.toString();
                if (res.length === 0) { return; } //skip empty properties

                let itemType = getItemType(fields[key]);
                if (!itemType){
                    logger.error($LogMsg.EXCEL_DATA_TYPE_UNKNOWN, relName, key, value);
                }

                if (!(itemType === $SchemaType.STRING && propNames.includes(key))) {
                    res = res.replace(/\s/g, '');
                }

                if (key === $Field.assign) {
                    res = res.split(";").map(expr => {
                        let [path, value] = expr.split("=");
                        let [propName, propValue] = value.split(":").map(x => x.trim());
                        if (propName && propValue) {
                            propValue = propValue.toString().split(",");
                            value = {[propName]: propValue};
                        } else {
                            logger.error($LogMsg.EXCEL_WRONG_ASSIGN_VALUE, value);
                        }
                        return {"path": "$." + path, "value": value}
                    });
                } else {
                    res = strToValue(fields[key].type === $SchemaType.ARRAY, itemType, res);
                }
                return res;
            };

            for (let i = 1; i < table.length; i++) {
                let resource = {};
                table[i].forEach((value, j) => {
                    if (!validateValue(value, headers[j])) { return; }
                    let key = headers[j].trim();
                    let res = convertValue(key, value);
                    if (res !== undefined) {
                        resource[key] = res;
                    }
                });
                table[i] = resource;
            }
            model[relName] = model[relName].slice(1);
        });

        extractModelAnnotation(model);
        return model;
    }

    static jsonToExcel(json) {
        const propNames = schemaClassModels[$SchemaClass.Scaffold].propertyNames;
        const sheetNames = schemaClassModels[$SchemaClass.Scaffold].relationshipNames;
        let inputModel = json::cloneDeep();
        const wb: XLSX.WorkBook = XLSX.utils.book_new();
        prepareForExport(inputModel, $Field.components, propNames, sheetNames);
        inputModel::keys().forEach(key => {
            const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(inputModel[key]||[]);
    		XLSX.utils.book_append_sheet(wb, ws, key);
        })
        XLSX.writeFile(wb, (inputModel.id||"scaffold") + "-converted.xlsx");
        return wb;
    }

    /**
     * Serialize the map of scaffold resources in JSON
     */
    entitiesToJSONLD(){
        let res = {
            "id": this.id,
            "resources": {}
        };
        (this.entitiesByID||{})::entries().forEach(([id,obj]) =>
            res.resources[id] = (obj instanceof Resource) ? obj.toJSON() : obj);
        return res;
    }

    /**
     * Serialize the map of all resources to flattened jsonld
     */
    entitiesToJSONLDFlat(callback){
        let res = this.entitiesToJSONLD();
        let context = {};
        res['@context']::entries().forEach(([k, v]) => {
            if (v::isObject() && "@id" in v && v["@id"].includes("apinatomy:")) {
            } else if (typeof(v) === "string" && v.includes("apinatomy:")) {
            } else if (k === "class") { // class uses @context @base which is not 1.0 compatible
            } else {
                context[k] = v;
            }});
        // TODO reattach context for rdflib-jsonld prefix construction
        jsonld.flatten(res).then(flat => {
            jsonld.compact(flat, context).then(compact => {
                callback(compact)})});
    }
}