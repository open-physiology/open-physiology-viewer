import { Group } from './groupModel';
import { Node, Link, LINK_GEOMETRY } from "./visualResourceModel";
import {
    entries,
    keys,
    isNumber,
    cloneDeep,
    defaults,
    intersection,
    isArray,
    isObject,
    pick,
    values, omit
} from 'lodash-bound';
import { Validator} from 'jsonschema';
import * as schema from './graphScheme.json';

const V = new Validator();
const DEFAULT_LENGTH = 4;

export {schema};
/**
 * The main model graph (a group with configuration options for the model viewer)
 * @class
 * @property entitiesByID
 * @property config
 */
export class Graph extends Group{

    static fromJSON(json, modelClasses = {}) {
        let resVal = V.validate(json, schema);
        if (resVal.errors && resVal.errors.length > 0){ console.warn(resVal); }

        let model = json::cloneDeep()::defaults({
            id: "mainGraph"
        });

        //Copy existing entities to a map to enable nested model instantiation
        let entitiesByID = {
            waitingList: {}
        };

        //Check that lyphs are not conveyed by more than one link
        let conveyingLyphMap = {};
        (model.links||[]).filter(lnk => lnk.conveyingLyph).forEach(lnk => {
            if (!conveyingLyphMap[lnk.conveyingLyph]){
                conveyingLyphMap[lnk.conveyingLyph] = lnk.conveyingLyph;
            } else {
                console.error("It is not allowed to use the same lyph as conveying lyph " +
                    "for multiple processes (links): ", lnk.conveyingLyph);
            }
        });

        //Create graph
        let res = super.fromJSON(model, modelClasses, entitiesByID);

        //Auto-create missing definitions for used references
        let added = [];
        entitiesByID.waitingList::entries().forEach(([id, refs]) => {
            let [obj, key] = refs[0];
            if (obj && obj.class){
                let clsName = modelClasses[obj.class].Model.relClassNames[key];
                if (clsName && (clsName !== "Shape")){ //TODO exclude all abstract classes
                    let e = modelClasses[clsName].fromJSON({"id": id}, modelClasses, entitiesByID);

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
            console.warn("Auto-created missing resources:", added);
        }

        if (entitiesByID.waitingList::keys().length > 0){
            console.warn("Incorrect model - found references to undefined resources: ", entitiesByID.waitingList);
        }
        res.syncRelationships(modelClasses, entitiesByID);
        res.createAxesForInternalLyphs(modelClasses, entitiesByID);

        res.entitiesByID = entitiesByID;

        (res.coalescences || []).forEach(coalescence => {
            let lyph = coalescence.lyphs[0];
            if (!lyph) { return; }
            for (let i = 1; i < coalescence.lyphs.length; i++) {
                let lyph2 = coalescence.lyphs[i];
                if ((lyph2.layers||[]).find(x => x.id === lyph.id) || (lyph.layers||[]).find(x => x.id === lyph2.id)) {
                    console.warn("A lyph coalesces with itself or its layers", lyph, lyph2);
                }
                if (!lyph.axis || !lyph2.axis) {
                    console.warn("A coalescing lyph is missing an axis", !lyph.axis ? lyph : lyph2);
                }
                lyph2.angle = 180; //subordinate coalescing lyph should turn to its master
            }
        });

        //Double link length so that 100% from the view length is turned into 100% from coordinate axis length
        (res.links||[]).filter(link => link::isObject()).forEach(link => {
            if (!link.length) { link.length = DEFAULT_LENGTH; }
            link.length *= 2
        });

        return res;
    }

    /**
     * Auto-generates links for internal lyphs
     * @param modelClasses - map of class names vs their implementations
     * @param entitiesByID - a global resource map to include the generated resources
     */
    createAxesForInternalLyphs(modelClasses, entitiesByID){
        const createAxis = (lyph, container) => {
            let [sNode, tNode] = ["s", "t"].map(prefix => (
                Node.fromJSON({
                    "id"       : `${prefix}${lyph.id}`,
                    "name"     : `${prefix}${lyph.id}`,
                    "color"    : "#ccc",
                    "val"      : 0.1,
                    "skipLabel": true
                })));

            let link = Link.fromJSON({
                "id"           : `${lyph.id}-lnk`,
                "source"       : sNode,
                "target"       : tNode,
                "geometry"     : LINK_GEOMETRY.INVISIBLE,
                "color"        : "#ccc",
                "conveyingLyph": lyph,
                "skipLabel"    : true
            });
            lyph.conveyedBy = link;
            sNode.sourceOf  = [link];
            tNode.targetOf  = [link];

            if (!this.links) {this.links = [];}
            if (!this.nodes) {this.nodes = [];}
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

    toJSON(){
        let res = {};
        console.log("toJSON:", this.id, this.class);
        this::keys()::intersection(this.constructor.Model.fieldNames).forEach(key => {
            let value = this[key];
            if (!value || key === "infoFields") { return; }
            if (value::isArray()){
                res[key] = value.filter(e => !!e).map(e => e.toJSON? e.toJSON(): e);
            } else {
                res[key] = value.toJSON? value.toJSON(): value;
            }
        });
        return res;
    }

    entitiesToJSON(){
        let res = {};
        (this::entitiesByID||{})::keys().forEach(key => {
            let value = this[key];
            if (!value || value.class === this.class) { return; }
            if (value::isArray()){
                res[key] = value.filter(e => !!e).map(e => e.toJSON? e.toJSON(): e);
            } else {
                res[key] = value.toJSON? value.toJSON(): value;
            }
        });
        return res;
    }

    export(){
        return this.toJSON();
    }

    static excelToJSON(model, modelClasses = {}){
        model::pick(Graph.Model.relationshipNames);

        const borderNames = ["inner", "radial1", "outer", "radial2"];
        model::keys().forEach(relName => {
            let table = model[relName];
            if (!table) { return; }
            let headers = table[0] || [];
            let clsName = this.Model.relClassNames[relName];
            if (!modelClasses[clsName]){
                console.warn("Class name not found:", relName);
                return;
            }
            let fields  = modelClasses[clsName].Model.fieldMap;
            let propNames = modelClasses[clsName].Model.propertyNames;
            for (let i = 1; i < table.length; i++){
                let resource = {};
                table[i].forEach((value, j) => {
                    let key = headers[j];
                    if (!fields[key]){
                        console.warn("Unrecognized property:", clsName, key);
                        return;
                    }
                    let res = value.toString();
                    if (res.length === 0){ return; } //skip empty properties

                    let itemType = fields[key].type;
                    if (fields[key].type === "array"){
                        itemType = fields[key].items && fields[key].items.type;
                    }

                    if (!(itemType === "string" && propNames.includes(key))){
                        res = res.replace(/\s/g, '');
                    }

                    const strToValue = x => (itemType === "number")? parseInt(x): (itemType === "boolean")? (x.toLowerCase() === "true") : x;

                    if (key === "length" || key === "thickness"){
                        res = {min: parseInt(res), max: parseInt(res)};
                    } else {
                        if (key === "assign") {
                            res = res.split(";").map(expr => {
                                let [path, value] = expr.split("=");
                                let [propName, propValue] = value.split(":").map(x => x.trim());
                                if (propName && propValue){
                                    propValue = propValue.toString().split(",");
                                    let borderIndex = borderNames.indexOf(propName);
                                    if (borderIndex > -1){
                                        path  = path + `.border.borders[${borderIndex}]`;
                                        value = {hostedNodes: propValue};
                                    } else {
                                        value = {[propName]: propValue};
                                    }
                                } else {
                                    console.error("Assign value error:", value);
                                }
                                return { "path"  : "$." + path, "value" : value }
                            });
                        } else {
                            if (fields[key].type === "array"){
                                res = res.split(",").map(x => strToValue(x));
                            } else {
                                res = strToValue(res);
                            }
                        }
                    }
                    resource[key] = res;
                });

                table[i] = resource;
                let borderConstraints = resource::pick(borderNames);
                if (borderConstraints::values().filter(x => !!x).length > 0){
                    table.border =  {borders: borderNames.map(borderName => borderConstraints[borderName]? {hostedNodes: [borderConstraints[borderName]]}: {})};
                }
                table[i] = resource::omit(borderNames);
            }
            model[relName] = model[relName].slice(1);
        });
        return model;
    }
}

Graph.validator = new Validator();

