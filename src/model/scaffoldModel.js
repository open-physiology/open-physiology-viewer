import {Resource} from "./resourceModel";
import {Component} from "./componentModel";
import {Validator} from "jsonschema";
import schema from "./graphScheme";
import {logger, $LogMsg} from "./logger";
import {cloneDeep, defaults, entries, isNumber, isObject, keys, unionBy} from "lodash-bound";
import {$Field, $SchemaClass} from "./utils";
import * as jsonld from "jsonld/dist/node6/lib/jsonld";

export class Scaffold extends Component {

    /**
     * Create expanded Graph model from the given JSON input model
     * @param json - input model
     * @param modelClasses - classes to represent model resources
     * @param entitiesByID - global map of model resources
     * @returns {Graph}
     */
    static fromJSON(json, modelClasses = {}, entitiesByID) {
        const V = new Validator();
        let resVal = V.validate(json, schema);
        logger.clear();
        if (resVal.errors && resVal.errors.length > 0) {
            logger.warn(resVal);
        }

        let model = json::cloneDeep()::defaults({id: "mainScaffold"});

        //Copy existing entities to a map to enable nested model instantiation
        entitiesByID = entitiesByID || {waitingList: {}};

        //Create scaffold
        let res = super.fromJSON(model, modelClasses, entitiesByID);

        //Auto-create missing definitions for used references
        let added = [];
        (entitiesByID.waitingList)::entries().forEach(([id, refs]) => {
            let [obj, key] = refs[0];
            if (obj && obj.class) {
                let clsName = modelClasses[obj.class].Model.relClassNames[key];
                if (clsName && !modelClasses[clsName].Model.schema.abstract) {
                    let e = modelClasses[clsName].fromJSON({
                        [$Field.id]: id,
                        [$Field.generated]: true
                    }, modelClasses, entitiesByID);

                    //Include newly created entity to the main graph
                    let prop = modelClasses[this.name].Model.selectedRelNames(clsName)[0];
                    if (prop) {
                        res[prop] = res[prop] || [];
                        res[prop].push(e);
                    }
                    entitiesByID[e.id] = e;
                    added.push(e.id);
                }
            }
        });

        //Log info about the number of generated resources
        logger.info($LogMsg.RESOURCE_NUM, entitiesByID::keys().length);

        if (added.length > 0) {
            added.forEach(id => delete entitiesByID.waitingList[id]);
            let resources = added.filter(id => entitiesByID[id].class !== $SchemaClass.External);
            if (resources.length > 0) {
                logger.warn($LogMsg.AUTO_GEN, resources);
            }
        }

        if ((entitiesByID.waitingList)::keys().length > 0) {
            logger.error("Remaining references to undefined resources: ", entitiesByID.waitingList);
        }

        res.syncRelationships(modelClasses, entitiesByID);

        res.entitiesByID = entitiesByID;
        delete res.waitingList;

        res.generated = true;

        res.logger = logger;
        return res;
    }

    /**
     * Scale dimensions of visual resources (length, height and width, coordinates of border points)
     * @param scaleFactor {number} - scaling factor
     */
    scale(scaleFactor){
        const scalePoint = p => p::keys().filter(key => p[key]::isNumber()).forEach(key => {p[key] *= scaleFactor;});
        (this.anchors||[]).filter(e => e.layout).forEach(e => scalePoint(e.layout));
        (this.wires||[]).filter(e => e::isObject() && !!e.length).forEach(e => e.length *= scaleFactor);
        (this.regions||[]).filter(e => e.points).forEach(e => e.points.forEach(p => scalePoint(p)));
    }

    static excelToJSON(inputModel, modelClasses = {}){
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