import { Group } from './groupModel';
import {keys, isNumber, merge, pick, isArray, cloneDeep, defaults} from 'lodash-bound';
import { Validator} from 'jsonschema';
import * as schema from '../data/graphScheme.json';
import {assignPropertiesToJSONPath} from "./utils";
import {Link, LINK_GEOMETRY} from "./linkModel";
const validator = new Validator();

export class Graph extends Group{

    static fromJSON(json, modelClasses) {
        let resVal = validator.validate(json, schema);
        if (resVal.errors && resVal.errors.length > 0){ console.warn(resVal); }

        let model = json::cloneDeep()::defaults({
            id: "mainModel",
            assign: [
                {
                    "path": "$.nodes",
                    "value": {"charge": 10}
                }
            ]
        });

        /*Process lyph templates: generate new layers for subtypes and replicate template properties */
        const expandTemplates = (lyphs) => {
            if (!lyphs) { return; }
            let templates = lyphs.filter(lyph => lyph.isTemplate);
            templates.forEach(template => {
                let subtypes = template.subtypes.map(subtypeRef =>
                    lyphs.find(e => e.id === subtypeRef) || { "id": subtypeRef, "new" : true });
                (subtypes || []).forEach(subtype => {
                    if (subtype.new) { //add auto-create subtype lyphs to the graph lyphs
                        delete subtype.new;
                        lyphs.push(subtype);
                    }
                    subtype.layers = [];
                    (template.layers|| []).forEach(layerRef => {
                        let layerParent = lyphs.find(e => e.id === layerRef);
                        if (!layerParent) {
                            console.warn("Generation error: template layer object not found: ", layerRef);
                            return;
                        }
                        let newID = `${layerParent.id}_${subtype.id}`;
                        let lyphLayer = {
                            "id"        : newID,
                            "supertype" : layerParent.id
                        };
                        let layerParentName = layerParent.name? layerParent.name: `Layer ${layerParent.id}`;
                        let subtypeName     = subtype.name? subtype.name: `lyph ${subtype.id}`;
                        lyphLayer.name = `${layerParentName} in ${subtypeName}`;

                        lyphLayer::merge(layerParent::pick(["color", "layerWidth", "topology"]));
                        lyphs.push(lyphLayer);
                        subtype.layers.push(lyphLayer);
                    });
                });

                //Copy defined properties to newly generated lyphs
                if (template.assign){
                    if (!template.assign::isArray()){
                        console.warn("Cannot assign template properties: ", template.assign);
                        return;
                    }
                    template.assign.forEach(({path, value}) =>
                        assignPropertiesToJSONPath({path, value}, subtypes)
                    );
                }
            });
        };
        expandTemplates(model.lyphs);

        //Copy existing entities to a map to enable nested model instantiation
        let entitiesByID = {};
        entitiesByID[model.id] = model;

        this.Model.relationshipNames.forEach(fieldName => {
            (model[fieldName]||[]).forEach(e => {
                if (!e.id) { console.warn("Entity without ID is skipped: ", e); return; }
                if (e.id::isNumber()) {
                    console.error("Replaced numeric ID: ", e);
                    e.id = e.id.toString();
                }
                if (entitiesByID[e.id]) {
                    console.error("Entity IDs are not unique: ", entitiesByID[e.id], e); }
                entitiesByID[e.id] = e;
            })
        });

        //Check that lyphs are not conveyed by more than one link
        let conveyingLyphMap = {};
        (model.links||[]).filter(lnk => lnk.conveyingLyph).forEach(lnk => {
            if (lnk.conveyingLyph.isTemplate){
                console.warn("It is not allowed to use templates as conveying lyphs: ", lnk.conveyingLyph);
                delete lnk.conveyingLyph;
            }
            if (!conveyingLyphMap[lnk.conveyingLyph]){
                conveyingLyphMap[lnk.conveyingLyph] = lnk.conveyingLyph;
            } else {
                console.error("It is not allowed to use the same lyph as conveying lyph " +
                    "for multiple processes (links): ", lnk.conveyingLyph);
            }
        });

        //Create graph
        let res = super.fromJSON(model, modelClasses, entitiesByID);
        res.entitiesByID = entitiesByID;

        //Create a coalescence group and force links to bind coalescing lyphs
        let coalescenceGroup = (res.groups||[]).find(g => g.id === "coalescences");
        if (!coalescenceGroup){
            coalescenceGroup = Group.fromJSON({
                "id"      : "coalescences",
                "name"    : "Coalescences",
                "inactive": true
            });
            res.groups.push(coalescenceGroup);
            entitiesByID[coalescenceGroup.id] = coalescenceGroup;
        }
        coalescenceGroup.links = coalescenceGroup.links||[];

        const createCoalescenceForces = (graph) => {
            (graph.lyphs||[]).filter(lyph => lyph.coalescesWith).forEach(lyph => {
                lyph.coalescesWith.forEach(lyph2 => {
                    if (lyph === lyph2 || (lyph.layers||[]).find(l => l.id === lyph2.id)
                        || (lyph.internalLyphs||[]).find(l => l.id === lyph2.id)){
                        console.warn("A lyph cannot coalesce with itself or its content", lyph, lyph2);
                        return;
                    }
                    if (!lyph.axis || !lyph2.axis) {
                        console.warn("A coalescing lyph is missing an axis", !lyph.axis? lyph: lyph2);
                        return;
                    }

                    ["source", "target"].forEach(end => {
                        let link = Link.fromJSON({
                            "id"    : end.charAt(0) + "_" + lyph.id + "_" + lyph2.id,
                            "source": lyph.axis[end],
                            "target": lyph2.axis[end],
                            "length": 0.1,
                            "geometry"  : LINK_GEOMETRY.FORCE
                        });
                        graph.links.push(link);
                        coalescenceGroup.links.push(link);
                        entitiesByID[link.id] = link;
                    });
                })
            });
        };
        createCoalescenceForces(res);
        return res;
    }

    optionsProvider(clsName, id = undefined){
        let res = (this.entities||[]).filter(e => e.class === clsName);
        if (id) {
            //TODO exclude other invalid options
            res = res.filter(e => e.id !== id);
        }
    }

    scale(axisLength){
        const scalePoint = p => p::keys().filter(key => p[key]::isNumber()).forEach(key => {
                p[key] *= axisLength * 0.01;
            });
        (this.nodes||[]).filter(node => node.layout).forEach(node => scalePoint(node.layout));
        (this.links||[]).filter(link => link.length).forEach(link => link.length *= 2 * axisLength * 0.01);
        (this.regions||[]).filter(region => region.points).forEach(region =>
           region.points.forEach(p => scalePoint(p)));
    }

    get coalescenceGroup(){
        return (this.groups||[]).find(g => g.id === "coalescences");
    }

    /**
     * Experimental - export Bond-graph like descriptions
     */
    export(ids){
        const getCoords = (obj) => ({"x": Math.round(obj.x), "y": Math.round(obj.y), "z": Math.round(obj.z)});

        if (!ids) { return; }
        let res = {"regions": [], "potentials": [], "connections": []};
        (this.lyphs||[]).filter(e=> ids.includes(e.id) || (e.axis && ids.includes(e.axis.id))).forEach(lyph => {
            res.regions.push({
                "id"      : lyph.id,
                "position": getCoords(lyph.center)
            });
        });

        (this.nodes||[]).filter(e => ids.includes(e.id) ||
            (e.sourceOf || []).find(lnk => ids.includes(lnk.id)) ||
            (e.targetOf || []).find(lnk => ids.includes(lnk.id))).forEach(node => {
            res.potentials.push({
                "id"       : node.id,
                "position" : getCoords(node)
            });
        });

        (this.links||[]).filter(e=> ids.includes(e.id)).forEach(link => {
            res.connections.push({
                "id"     : link.id,
                "source" : link.source.id,
                "target" : link.target.id,
                "points" : (link.points||[]).map(p => getCoords(p))
            });
        });

        return res;
    }
}
