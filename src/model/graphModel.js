import { Group } from './groupModel';
import {Resource} from "./resourceModel";
import { Node, Link } from "./visualResourceModel";
import {
    entries,
    keys,
    isNumber,
    cloneDeep,
    defaults,
    isArray,
    isObject,
    pick,
    values,
    omit,
    merge
} from 'lodash-bound';
import { Validator} from 'jsonschema';
import * as schema from './graphScheme.json';
import {logger} from './logger';

export { schema };
const DEFAULT_LENGTH = 4;

/**
 * The main model graph (the group with configuration options for the model viewer)
 * @class
 * @property entitiesByID
 * @property config
 */
export class Graph extends Group{

    /**
     * Create expanded Graph model from the given JSON input model
     * @param json - input model
     * @param modelClasses - classes to represent model resources
     * @returns {Graph}
     */
    static fromJSON(json, modelClasses = {}) {
        const V = new Validator();
        let resVal = V.validate(json, schema);

        logger.clear();

        if (resVal.errors && resVal.errors.length > 0){
            logger.warn(resVal);
        }

        let model = json::cloneDeep()::defaults({
            id: "mainGraph"
        });

        //Copy existing entities to a map to enable nested model instantiation

        let entitiesByID = {
            waitingList: {}
        };

        //Create graph
        let res = super.fromJSON(model, modelClasses, entitiesByID);

        //Auto-create missing definitions for used references
        let added = [];
        entitiesByID.waitingList::entries().forEach(([id, refs]) => {
            let [obj, key] = refs[0];
            if (obj && obj.class){
                let clsName = modelClasses[obj.class].Model.relClassNames[key];
                if (clsName && !modelClasses[clsName].Model.schema.abstract){
                    let e = modelClasses[clsName].fromJSON({"id": id, "generated": true}, modelClasses, entitiesByID);

                    //Include newly created entity to the main graph
                    let prop = this.Model.selectedRelNames(clsName)[0];
                    if (prop) {
                        res[prop] = res[prop] ||[];
                        res[prop].push(e);
                    }
                    entitiesByID[e.id] = e;
                    added.push(e.id);
                }
            }
        });
        if (added.length > 0){
            added.forEach(id => delete entitiesByID.waitingList[id]);
            logger.warn("Auto-created missing resources:", added);
        }

        if (entitiesByID.waitingList::keys().length > 0){
            logger.warn("Incorrect model - found references to undefined resources: ", entitiesByID.waitingList);
        }
        res.syncRelationships(modelClasses, entitiesByID);
        res.createAxesForInternalLyphs(modelClasses, entitiesByID);

        res.entitiesByID = entitiesByID;

        //Generate and validate coalescence instances
        (res.coalescences || []).forEach(coalescence => coalescence.createInstances(res, modelClasses));
        (res.coalescences || []).forEach(coalescence => coalescence.validate());

        //Double link length so that 100% from the view length is turned into 100% from coordinate axis length
        (res.links||[]).filter(link => link::isObject()).forEach(link => {
            if (!link.length) { link.length = DEFAULT_LENGTH; }
            link.length *= 2
        });
        delete res.waitingList;

        res.logger = logger;
        return res;
    }

    /**
     * Generate the JSON input model from an Excel file (.xlsx)
     * @param inputModel   - Excel ApiNATOMY model
     * @param modelClasses - model resource classes
     * @returns {*}
     */
    static excelToJSON(inputModel, modelClasses = {}){
        let model = inputModel::pick(Graph.Model.relationshipNames.concat(["main"]));
        const borderNames = ["inner", "radial1", "outer", "radial2"];

        model::keys().forEach(relName => {
            let table = model[relName];
            if (!table) { return; }
            let headers = table[0] || [];
            let clsName = relName === "main"? "Graph": this.Model.relClassNames[relName];
            if (!modelClasses[clsName]) {
                logger.warn("Class name not found:", relName);
                return;
            }
            let fields = modelClasses[clsName].Model.fieldMap;
            let propNames = modelClasses[clsName].Model.propertyNames;

            const convertValue = (key, value) => {
                if (!fields[key]) {
                    logger.warn("Unrecognized property:", clsName, key);
                    return;
                }
                let res = value.toString();
                if (res.length === 0) { return; } //skip empty properties

                let itemType = fields[key].type;
                if (fields[key].type === "array") {
                    itemType = fields[key].items && fields[key].items.type;
                }
                if (fields[key].$ref) {
                    itemType = "object";
                }

                if (!(itemType === "string" && propNames.includes(key))) {
                    res = res.replace(/\s/g, '');
                }
                const strToValue = x => (itemType === "number") ? parseInt(x)
                    : (itemType === "boolean") ? (x.toLowerCase() === "true")
                        : (itemType === "object")? JSON.parse(x)
                            : x;

                if (relName === "lyphs" && (key === "length" || key === "thickness")) {
                    res = {min: parseInt(res), max: parseInt(res)};
                } else {
                    if (key === "assign") {
                        res = res.split(";").map(expr => {
                            let [path, value] = expr.split("=");
                            let [propName, propValue] = value.split(":").map(x => x.trim());
                            if (propName && propValue) {
                                propValue = propValue.toString().split(",");
                                let borderIndex = borderNames.indexOf(propName);
                                if (borderIndex > -1) {
                                    path = path + `.border.borders[${borderIndex}]`;
                                    value = {hostedNodes: propValue};
                                } else {
                                    value = {[propName]: propValue};
                                }
                            } else {
                                logger.error("Assign value error:", value);
                            }
                            return {"path": "$." + path, "value": value}
                        });
                    } else {
                        if (fields[key].type === "array") {
                            res = res.split(",").map(x => strToValue(x));
                        } else {
                            res = strToValue(res);
                        }
                    }
                }
                return res;
            };

            for (let i = 1; i < table.length; i++) {
                let resource = {};
                table[i].forEach((value, j) => {
                    let key = headers[j].trim();
                    let res = convertValue(key, value);
                    if (res){ resource[key] = res; }
                });

                table[i] = resource;
                let borderConstraints = resource::pick(borderNames);
                if (borderConstraints::values().filter(x => !!x).length > 0) {
                    table.border = {borders: borderNames.map(borderName => borderConstraints[borderName] ? {hostedNodes: [borderConstraints[borderName]]} : {})};
                }
                table[i] = resource::omit(borderNames);
            }
            model[relName] = model[relName].slice(1);
        });

        if (model.main){
            if (model.main[0]::isArray()){
                model.main[0].forEach(({key: value}) => model[key] = value);
            } else {
                if (model.main[0]::isObject()){
                    model::merge(model.main[0]);
                }
            }
            delete model.main;
        }
        return model;
    }

    get defaultVisibleGroups(){
        if (!this.config || !this.config.showGroups || !this.config.showGroups::isArray()){ return []; }
        return (this.groups||[]).filter(g => this.config.showGroups.find(id => g.id === id || (g.generatedFrom && g.generatedFrom.id === id)));
    }

    /**
     * Auto-generates links for internal lyphs
     * @param modelClasses - model resource classes
     * @param entitiesByID - a global resource map to include the generated resources
     */
    createAxesForInternalLyphs(modelClasses, entitiesByID){
        const createAxis = lyph => {
            let [sNode, tNode] = ["s", "t"].map(prefix => (
                Node.fromJSON({
                    "id"       : `${prefix}${lyph.id}`,
                    "name"     : `${prefix}${lyph.id}`,
                    "color"    : "#ccc",
                    "val"      : 0.1,
                    "skipLabel": true,
                    "generated": true
                }, modelClasses, entitiesByID)));

            let link = Link.fromJSON({
                "id"           : `${lyph.id}-lnk`,
                "source"       : sNode,
                "target"       : tNode,
                "geometry"     : Link.LINK_GEOMETRY.INVISIBLE,
                "color"        : "#ccc",
                "conveyingLyph": lyph,
                "skipLabel"    : true,
                "generated"    : true
            }, modelClasses, entitiesByID);
            lyph.conveyedBy = link;
            sNode.sourceOf  = [link];
            tNode.targetOf  = [link];

            this.links.push(link);
            [sNode, tNode].forEach(node => this.nodes.push(node));
        };

        [...(this.lyphs||[]), ...(this.regions||[])]
            .filter(lyph => lyph.internalIn && !lyph.axis).forEach(lyph => createAxis(lyph, lyph.internalIn));

        const assignAxisLength = (lyph, container) => {
            if (container.axis) {
                if (!container.axis.length && container.container) {
                    assignAxisLength(container, container.container);
                }
                lyph.axis.length = container.axis.length ? container.axis.length * 0.8 : DEFAULT_LENGTH;
            }
        };

        [...(this.lyphs||[]), ...(this.regions||[])]
            .filter(lyph => lyph.internalIn).forEach(lyph => assignAxisLength(lyph, lyph.internalIn));
    }

    /**
     * Scale dimensions of visual resources (length, height and width, coordinates of border points)
     * @param scaleFactor {number} - scaling factor
     */
    scale(scaleFactor){
        const scalePoint = p => p::keys().filter(key => p[key]::isNumber()).forEach(key => {
                p[key] *= scaleFactor;
            });

        (this.lyphs||[]).forEach(lyph => {
            if (lyph.width)  {lyph.width  *= scaleFactor}
            if (lyph.height) {lyph.height *= scaleFactor}
        });
        (this.nodes||[]).filter(node => node.layout).forEach(node => scalePoint(node.layout));
        (this.links||[]).filter(link => link::isObject() && !!link.length).forEach(link => link.length *= scaleFactor);
        (this.regions||[]).filter(region => region.points).forEach(region =>
           region.points.forEach(p => scalePoint(p)));
    }

    /**
     * Serialize the map of all resources in JSON
     */
    entitiesToJSON(){
        let res = {
            "id": this.id,
            "resources": {}
        };
        (this.entitiesByID||{})::entries().forEach(([id,obj]) => res.resources[id] = (obj instanceof Resource) ? obj.toJSON(): obj);
        return res;
    }
}


