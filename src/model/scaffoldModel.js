import {Resource} from "./resourceModel";
import {Component} from "./componentModel";
import {Validator} from "jsonschema";
import schema from "./graphScheme";
import {logger, $LogMsg} from "./logger";
import {
    cloneDeep,
    defaults,
    entries, isEmpty,
    isNumber,
    isObject,
    keys,
    pick
} from "lodash-bound";
import {
    $Field,
    $SchemaClass,
    prepareForExport,
    schemaClassModels,
    refToResource,
    collectNestedResources
} from "./utils";
import {extractLocalConventions, extractModelAnnotation, convertValue, validateValue, validateExternal} from './utilsParser';
import * as jsonld from "jsonld/dist/node6/lib/jsonld";
import * as XLSX from "xlsx";

/**
 * Scaffold graph
 * class
 * @property entitiesByID
 * @property namespace
 * @property localConventions
 * @property modelClasses
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

        let relFieldNames = [$Field.anchors, $Field.wires, $Field.regions];
        collectNestedResources(inputModel, relFieldNames, $Field.components);

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
                if (![$SchemaClass.Component, $SchemaClass.Region, $SchemaClass.Wire, $SchemaClass.Anchor].includes(obj.class)){
                    return;
                }
                let clsName = schemaClassModels[obj.class].relClassNames[key];
                if (clsName && !schemaClassModels[clsName].schema.abstract) {
                    let e = modelClasses.Resource.createResource(id, clsName, res, modelClasses, entitiesByID, namespace);
                    added.push(e.fullID);
                }
            }
        });

        if (added.length > 0) {
            added.forEach(id => delete entitiesByID.waitingList[id]);
            let resources = added.filter(id => entitiesByID[id].class !== $SchemaClass.External);
            if (resources.length > 0) {
                logger.warn($LogMsg.AUTO_GEN, resources);
            }
        }

        if (standalone && entitiesByID.waitingList::keys().length > 0) {
            logger.error($LogMsg.REF_UNDEFINED, "scaffold", entitiesByID.waitingList::keys());
        }

        res.syncRelationships(modelClasses, entitiesByID);

        res.entitiesByID = entitiesByID;
        delete res.waitingList;

        (res.components||[]).forEach(component => component.includeRelated && component.includeRelated());
        res.generated = true;

        validateExternal(res.external, res.localConventions);

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
        let modelSchema = schemaClassModels[$SchemaClass.Scaffold];
        let model = inputModel::pick(modelSchema.relationshipNames.concat(["main", "localConventions"]));

        model::keys().forEach(relName => {
            let table = model[relName];
            if (!table) { return; }
            if (relName === "localConventions") { // local conventions are not a resource
                extractLocalConventions(table);
            } else {
                let clsName = relName === "main" ? $SchemaClass.Scaffold : modelSchema.relClassNames[relName];
                if (!modelClasses[clsName]) {
                    logger.warn($LogMsg.EXCEL_NO_CLASS_NAME, relName);
                    return;
                }
                let headers = table[0] || [];
                for (let i = 1; i < table.length; i++) {
                    let resource = {};
                    table[i].forEach((value, j) => {
                        if (!validateValue(value, headers[j])) {
                            return;
                        }
                        let key = headers[j].trim();
                        try {
                            let res = convertValue(clsName, key, value);
                            if (res !== undefined) {
                                resource[key] = res;
                            }
                        } catch (e) {
                            logger.error($LogMsg.EXCEL_CONVERSION_ERROR, relName, key, value, "row #" + i, "column #" + j);
                        }
                    });
                    table[i] = resource;
                }
            }
            model[relName] = model[relName].filter((obj, i) => (i > 0) && !obj::isEmpty());
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

    getCurrentState(){
        let json = {
            [$Field.id]: this.id,
            [$Field.hidden]: this.hidden,
            [$Field.visibleComponents]: (this.visibleComponents||[]).map(c => c.id)
        }
        json.anchors = [];
        (this.anchors||[]).forEach(a => {
            if (a.layout) {
                json.anchors.push({
                    [$Field.id]: a.id,
                    [$Field.layout]: {"x": a.layout.x, "y": a.layout.y}
                })
            } else {
                if (a.hostedBy && a.offset !== undefined){
                    json.anchors.push({
                        [$Field.id]: a.id,
                        [$Field.offset]: a.offset
                    })
                }
            }
        })
        return json;
    }

    loadState(scaffold){
        this.hidden = scaffold.hidden;
        (scaffold.anchors || []).forEach(anchor => {
            const modelAnchor = (this.anchors||[]).find(a => a.id === anchor.id);
            if (modelAnchor){
                if (anchor.layout) {
                    modelAnchor.layout = {
                        x: anchor.layout.x,
                        y: anchor.layout.y
                    }
                } else {
                    if (anchor.offset !== undefined){
                        modelAnchor.offset = anchor.offset;
                    }
                }
            } else {
                this._graphData.logger.info($LogMsg.SNAPSHOT_NO_ANCHOR, anchor.id, scaffold.id);
            }
        })
        if (!this.hidden){
            this.show();
        }
        if (scaffold.visibleComponents){
            this.showGroups(scaffold.visibleComponents);
        }
        if (this.hidden){
            this.hide();
        }
    }

    update(srcScaffold) {
        const scaleFactor = 10;
        (this.anchors || []).forEach(anchor => {
            const srcAnchor = refToResource(anchor.id, srcScaffold, $Field.anchors);
            if (srcAnchor) {
                srcAnchor.layout = srcAnchor.layout || {};
                if (anchor.layout) {
                    ["x", "y"].forEach(dim => srcAnchor.layout[dim] = anchor.layout[dim] / scaleFactor);
                } else {
                    if (anchor.hostedBy && anchor.offset !== undefined){
                        srcAnchor.offset = anchor.offset;
                    }
                }
            }
        });
        (this.regions || []).forEach(region => {
            const srcRegion = refToResource(region.id, srcScaffold, $Field.regions);
            if (srcRegion) {
                if (srcRegion.points) {
                    (srcRegion.points || []).forEach((target, i) => {
                        ["x", "y"].forEach(dim => target[dim] = region.points[i][dim] / scaleFactor);
                    })
                } else {
                    (srcRegion.borderAnchors||[]).forEach((srcAnchor, i) => {
                        if (srcAnchor::isObject()){
                            srcAnchor.layout = srcAnchor.layout || {};
                            ["x", "y"].forEach(dim => srcAnchor.layout[dim] = region.points[i][dim] / scaleFactor);
                        }
                    });
                }
            }
        });
        (this.wires || []).forEach(wire => {
            //Update ellipse radius
            if (wire.geometry === this.modelClasses.Wire.WIRE_GEOMETRY.ELLIPSE) {
                const srcWire = refToResource(wire.id, srcScaffold, $Field.wires);
                if (srcWire && srcWire::isObject()) {
                    srcWire.radius = srcWire.radius || {};
                    ["x", "y"].forEach(dim => srcWire.radius[dim] = wire.radius[dim] / scaleFactor);
                }
            }
        })
    }
}