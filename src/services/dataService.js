import { coreGraph, ependymalGraph } from '../data/core-graph.json';
import { omega, cardiac, neural} from '../data/links.json';
import { lyphs as kidneyLyphs, materials } from '../data/kidney-lyphs.json';
import { lyphs as cardiacLyphs } from '../data/cardiac-lyphs';

import { assign, keys, values, cloneDeep, merge} from 'lodash-bound';
import { schemePaired, schemeDark2, interpolateReds, interpolateGreens,
    interpolateBlues, interpolateRdPu, interpolateOranges } from 'd3-scale-chromatic';
import { Graph } from '../models/graphModel';
import { NODE_TYPES } from '../models/nodeModel';
import { LINK_TYPES } from '../models/linkModel';
import { modelClasses } from '../models/utils';

const colors = [...schemePaired, schemeDark2];

//TODO process materials

/**
 * A class that assembles ApiNATOMY model from available data sources:
 * 1. Core graph definition
 * 2. Nervous system
 * 3. Kidney subsystems https://drive.google.com/file/d/0B89UZ62PbWq4ZkJkTjdkN1NBZDg/view
 * 4. Cardiac subsystems
 * ...
 */
export class DataService{
    _entitiesByID = {};

    init(){
        /**
         * Prepare core ApiNATOMY graph
         */
        this._graphData = {
            id: "graph1",
            nodes : [...coreGraph.nodes, ...ependymalGraph.nodes, ...neural.nodes]::cloneDeep(),
            links : [...coreGraph.links, ...ependymalGraph.links, ...neural.links]::cloneDeep(),
            lyphs : [...kidneyLyphs, ...cardiacLyphs]::cloneDeep(),
            groups: [...coreGraph.groups]::cloneDeep(),
            materials: materials::cloneDeep(),
        };

        this._graphData.nodes = this._graphData.nodes.map(node => node::assign({"charge": 10}));

        let groupsByName = {};
        this._graphData.groups.forEach(g => groupsByName[g.name] = g);

        /////////////////////////////////////////////////////////////////////
        //Helper functions

        const addColor = (array, defaultColor) =>
            array.filter(obj => !obj.color)
                .forEach((obj, i) => { obj.color = defaultColor || colors[i % colors.length] });

        const colorLyphs = (lyphs, colorFn) => {
            lyphs.forEach((lyphID, i) =>{
                let lyph = this._graphData.lyphs.find(lyph => lyph.id === lyphID);
                lyph.color = colorFn(0.25 + i / lyphs.length);
            });
        };

        const colorLyphsExt = (lyphs, colorFn, numColors, reversed = false) => {
            lyphs.forEach((lyphID, i) =>{
                let lyph = this._graphData.lyphs.find(lyph => lyph.id === lyphID);
                lyph.color = colorFn(((reversed)? 0.75 - i / numColors : 0.25 + i / numColors));
            });
        };

        const getLinkByLyphID = (lyphID) => {
            let res = this._graphData.links.find(link => link.conveyingLyph &&
            (link.conveyingLyph  === lyphID || link.conveyingLyph.id === lyphID));
            if (!res) {
                const hasLayer = (lyph, layerID) => {
                    return (lyph.layers || []).find(layer => (layer === layerID || layer.id === layerID))
                };
                //For lyphs which are layers, return parent's link (does not work for ID's)
                res = this._graphData.links.find(link => link.conveyingLyph
                && hasLayer(link.conveyingLyph) && hasLayer(link.conveyingLyph, lyphID))
            }
            return res;
        };

        const createInternalLyphs = (lyph) => {
            let newGroupIDs = [];
            lyph.internalLyphs.forEach(innerLyphID => {
                let innerLyph = this._graphData.lyphs.find(lyph => lyph.id === innerLyphID);
                if (innerLyph) { innerLyph.belongsToLyph = lyph; }
                let [sNode, tNode] = ["s", "t"].map(prefix => ({
                    "id"       : `${prefix}${innerLyphID}`,
                    "name"     : `${prefix}${innerLyphID}`,
                    "color"    : "#ccc",
                    "val"      : 0.1,
                    "skipLabel": true
                }));
                [sNode, tNode].forEach(node => {
                    this._graphData.nodes.push(node);
                    newGroupIDs.push(node.id);
                });

                let link = {
                    "id"            : 'lnk' + (this._graphData.links.length + 1).toString(),
                    "source"        : sNode,
                    "target"        : tNode,
                    "length"        : 2,
                    "type"          : LINK_TYPES.INVISIBLE,
                    "color"         : "#ccc",
                    "conveyingLyph" : innerLyphID
                };
                this._graphData.links.push(link);
                newGroupIDs.push(innerLyph.id);
                newGroupIDs.push(link.id);
            });
            return newGroupIDs;
        };

        ////////////////////////////////////////////////////////////////////

        /* Modify central nervous system lyphs appearance */

        //TODO how to generalize? Apply custom function to the group?
        let maxLayers = Math.max(...groupsByName["Neural system"].entities.map(lyphID =>
            (this._graphData.lyphs.find(lyph => lyph.id === lyphID).layers || []).length));

        groupsByName["Neural system"].entities.forEach(lyphID => {
            let ependymalLyph = this._graphData.lyphs.find(lyph => lyph.id === lyphID);
            ependymalLyph::merge({
                color: "#aaa",
                scale: { width: 50 * ependymalLyph.layers.length, height: 95 }
            });
            colorLyphsExt(ependymalLyph.layers, interpolateBlues, maxLayers, true);
        });

        //TODO only group entities defined by ID are converted to model objects, not objects either fix or put it as schema requirement

        //Include relevant entities to the neural system group
        this._graphData.lyphs.filter(lyph => lyph.internalLyphs).forEach(lyph => {
            if (lyph.id === "5") { return; }
            groupsByName["Neurons"].entities = [...groupsByName["Neurons"].entities, ...createInternalLyphs(lyph)];
        });

        neural.nodes.forEach(node => {
            let containerLyph = this._graphData.lyphs.find(lyph => lyph.id === node.belongsToLyph);
            containerLyph.internalNodes = [node];
            groupsByName["Neurons"].entities.push(node.id);
        });
        neural.links.forEach( link => groupsByName["Neurons"].entities.push(link.id));


        //Create Urinary tract and Cardiovascular system omega trees

        //Recolor lyphs
        colorLyphs(omega["LR"].trees["Arterial"]::values(), interpolateReds);
        colorLyphs(omega["LR"].trees["Venous"]  ::values(), interpolateRdPu);
        colorLyphs(omega["PS"].trees["Urinary"] ::values(), interpolateGreens);
        colorLyphs(omega["Connector"]::values(), interpolateOranges);

        //Add an extra node to correctly end the Urinary tree
        omega["LR"].trees["Arterial"]["end1"] = 0;
        omega["PS"].trees["Urinary"]["end2"]  = 0;

        // Explicitly define position of the root node on the hosting link:
        // fraction 0 <= x <= 1, where 0 corresponds to the source node and 1 to the target node
        const offsets = {"LR00": 0.25, "LR10": 0.65, "PS00": 0.25};

        //Omega tree nodes
        ["LR", "PS"].forEach(host => {
            omega[host].trees::values().forEach((tree, i) => {
                tree::keys().forEach((key, j) => {
                    let node = {
                        "id"       : `${host}${i}${j}`,
                        "color"     : omega[host].color,
                        "charge"    : 5
                    };
                    if (j === 0){ node.host = host; }
                    if (offsets[node.id]){ node.offset = offsets[node.id]; }
                    this._graphData.nodes.push(node);
                    groupsByName["Omega trees"].entities.push(node.id);
                });

                //TODO add all hosted nodes to the property of the link 'hostedNodes'

                const NUM_LEVELS = tree::keys().length;
                tree::keys().forEach((key, j) => {
                    if (j === NUM_LEVELS - 1) { return; }
                    let link = {
                        "id"            : 'lnk' + (this._graphData.links.length + 1).toString(),
                        "source"        : `${host}${i}${j}`,
                        "target"        : `${host}${i}${j + 1}`,
                        "external"      : key,
                        "length"        : 3,
                        "type"          : LINK_TYPES.LINK,
                        "conveyingLyph" : tree[key],
                        "color"         : omega[host].color,
                        "linkMethod"    : "Line2"
                    };
                    this._graphData.links.push(link);
                    groupsByName["Omega trees"].entities.push(link.id);
                });
            })
        });

        const CONNECTOR_COLOR = "#ff44ff";
        ["H", "I", "J"].forEach((key, i) => {
            let node = {
                "id"   : `LRPS${i}`,
                "color": CONNECTOR_COLOR };
            this._graphData.nodes.push(node);
            groupsByName["Omega trees"].entities.push(node.id);
        });

        const connector = ["LR05", "LRPS0", "LRPS1", "LRPS2", "LR15"];
        const connectorLyphs  = omega["Connector"]::values();
        const connectorLabels = omega["Connector"]::keys();

        for (let i = 0 ; i < connector.length - 1; i++){
            let link = {
                "id"           : 'lnk' + (this._graphData.links.length + 1).toString(),
                "source"       : connector[i],
                "target"       : connector[i + 1],
                "external"     : connectorLabels[i],
                "length"       : 3,
                "type"         : LINK_TYPES.LINK,
                "conveyingLyph": connectorLyphs[i],
                "color"        : CONNECTOR_COLOR,
                "linkMethod"   : "Line2"
            };
            this._graphData.links.push(link);
            groupsByName["Omega trees"].entities.push(link);
        }

        //Coalescence defined as groups of lyphs
        [ ["78", "24"] ].forEach(lyphs => {
            let coalescingLinks  = lyphs.map(lyphID => getLinkByLyphID(lyphID));

            coalescingLinks.forEach((link1, i) => {
                coalescingLinks.forEach((link2, j) => {
                    if (i === j) { return; }
                    ["source", "target"].forEach(end => {
                        let link = {
                            "id"    : 'lnk' + (this._graphData.links.length + 1).toString(),
                            "source": link1[end],
                            "target": link2[end],
                            "length": 0.1,
                            "type": LINK_TYPES.FORCE
                        };
                        this._graphData.links.push(link);
                        groupsByName["Coalescences"].entities.push(link.id);
                    });
                })
            });
        });

        //Add link from center to the center of mass for a container link
        let [kNode, lNode] = ["k", "l"].map((name, i) =>
            ({
                "id"     : name,
                "name"   : name,
                "type"   : NODE_TYPES.FIXED,
                "hidden" : true,
                "layout" : {x: 0, y: (i === 0)? 0: 70, z: 25}
            })
        );
        [kNode, lNode].forEach(node => {
            this._graphData.nodes.push(node);
            groupsByName["Containers"].entities.push(node.id);
        });

        let containerLink = {
            "id"        : 'lnk' + (this._graphData.links.length + 1).toString(),
            "source"    : kNode,
            "target"    : lNode,
            "type"      : LINK_TYPES.CONTAINER,
            "length"    : 40,
            "conveyingLyph" : "5"
        };
        this._graphData.links.push(containerLink);
        groupsByName["Containers"].entities.push(containerLink.id);

        let containerLyph = this._graphData.lyphs.find(lyph => lyph.id === "5");
        containerLyph.inactive = true;  // Exclude this entity from being highlighted
        containerLyph.border   = { borders: [{}, {}, {}, {nodes: ["PS013", "LR05", "LR15"]}]};

        // Assign inner content to the container lyph border
        let containerHost    = this._graphData.lyphs.find(lyph => lyph.id === "3");
        containerHost.border = { borders: [ {}, {}, {}, { conveyingLyph: "5" }]};
        containerLyph.belongsToLyph = containerHost;

        //Color links and lyphs which do not have assigned colors yet
        addColor(this._graphData.links, "#000");
        addColor(this._graphData.lyphs);

        //TODO create specification for link prototypes to generate axes for given lyphs

        /* Cardiac system */

        //Generate 4 omega trees: R - MCP, L - MCP, R - MCS, L - MCS, 6 layers each
        const addCardiacLink = (src, trg, conveyingLyph = undefined, reversed = false) => {
            let link = {
                "id"        : 'lnk' + (this._graphData.links.length + 1).toString(),
                "source"    : src,
                "target"    : trg,
                "length"    : 7,
                "color"     : "#aaa",
                "type"      : LINK_TYPES.LINK,
                "reversed"  : reversed
            };
            if (conveyingLyph){
                link.conveyingLyph = conveyingLyph;
            }
            this._graphData.links.push(link);
        };

        let NUM_LEVELS = 6;
        let dt = 0.5 / NUM_LEVELS;

        /*Find lyph templates, generate new layers and replicate template properties */

        let templates = this._graphData.lyphs.filter(lyph => lyph.isTemplate);
        templates.forEach(template => {
            (template.subtypes || []).forEach(subtypeRef => {
                let subtype = subtypeRef;
                if (typeof subtype === "string") {
                    subtype = this._graphData.lyphs.find(e => e.id === subtypeRef);
                }
                if (subtype){
                    subtype.layers = [];
                    (template.layers|| []).forEach(layerRef => {
                        let layerParent = layerRef;
                        if (typeof layerRef === "string"){
                            layerParent = this._graphData.lyphs.find(e => e.id === layerRef);
                        }
                        if (!layerParent) {
                            console.warn("Generation error: template layer object not found: ", layerRef);
                            return;
                        }
                        let newID = `${layerParent.id}_${subtype.id}`;
                        let lyphLayer = {
                            "id"        : newID,
                            "name"      : `${layerParent.name} in ${subtype.name}`,
                            "supertype" : layerParent.id,
                            "color"     : layerParent.color
                        };
                        this._graphData.lyphs.push(lyphLayer);
                        //Copy defined properties to newly generated lyphs
                        if (template.assign && template.assign[newID]){
                            lyphLayer::merge(template.assign[newID]);
                            createInternalLyphs(lyphLayer);
                        }

                        subtype.layers.push(newID);
                        if (!layerParent.subtypes){ layerParent.subtypes = []; }
                        layerParent.subtypes.push(newID);
                    });
                }
            })
        });


        //Omega trees for cardiac lyphs

        ["R", "L"].forEach(prefix => {
            ["MCP", "MCS"].forEach(suffix => {
                let src = prefix, trg;
                let host = suffix === "MCP"? "LR": "RL";
                for (let i = 1; i < NUM_LEVELS; i++) {
                    trg = `${prefix}_${i}_${suffix}`;
                    let reversed = (prefix === "R" && host ==="LR" || prefix === "L" && host === "RL");
                    this._graphData.nodes.push({
                        "id"    : trg,
                        "name"  : trg,
                        "color" : "#ccc",
                        "val"   : 0.5,
                        "host"  : host,
                        "offset": reversed? 1 - i * dt : i * dt,
                        "skipLabel": true
                    });
                    addCardiacLink(src, trg, cardiac[trg], reversed);
                    src = trg;
                }
                trg = suffix;
                addCardiacLink(src, trg);
            });
        });

        /* Generate complete model */

        //Copy existing entities to a map to enable nested model instantiation
        this._graphData::values().filter(prop => Array.isArray(prop)).forEach(array => array.forEach(e => {
            if (this._entitiesByID[e.id]) {
                console.error("Entity IDs are not unique: ", this._entitiesByID[e.id], e);
            }
            this._entitiesByID[e.id] = e;
        }));
        //Schema validation
        this._graphData = Graph.fromJSON(this._graphData, modelClasses, this._entitiesByID);

        console.log("Graph data: ", this._graphData);

        /*Map initial positional constraints to match the scaled image*/
        const axisLength = 400;
        const scaleFactor = axisLength * 0.01;

        this._graphData.nodes.forEach(node => node.layout::keys().forEach(key => {node.layout[key] *= scaleFactor; }));
        this._graphData.links.filter(link => link.length).forEach(link => link.length *= 2 * scaleFactor);
    }

    get graphData(){
        return this._graphData;
    }
}