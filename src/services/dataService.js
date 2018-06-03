import { coreGraph, ependymalGraph } from '../data/core-graph.json';
import { ependymal, omega, cardiac as cardiacLyphMapping} from '../data/lyph-mapping.json';
import { lyphs, materials } from '../data/kidney-lyphs.json';
import { lyphs as cardiacLyphs } from '../data/cardiac-lyphs';

import { assign, entries, keys, values, cloneDeep} from 'lodash-bound';
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

    constructor(){
    }

    init(){
        /**
         * Prepare core ApiNATOMY graph
         * @type {{id: string, nodes: *, links: *, lyphs: *, groups: [*]}}
         * @private
         */
        this._graphData = {
            id: "graph1",
            nodes : [...coreGraph.nodes, ...ependymalGraph.nodes]::cloneDeep(),
            links : [...coreGraph.links, ...ependymalGraph.links]::cloneDeep(),
            materials: materials::cloneDeep(),
            lyphs : [...lyphs, ...cardiacLyphs]::cloneDeep(),
            groups: [...coreGraph.groups]::cloneDeep()
        };

        this._graphData.nodes = this._graphData.nodes.map(node => node::assign({"charge": 10}));
        this._graphData.links = this._graphData.links.map(link => {
            if (link.type !== LINK_TYPES.DASHED) { link.linkMethod = "Line2" }
            return link
        });

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

        //Assign central nervous system lyphs to corresponding edges
        let maxLayers = 0;
        ependymal::entries().forEach(([linkID, lyphID]) => {
            let link            = this._graphData.links.find(link => link.id === linkID);
            link.conveyingLyph  = ependymal[linkID];
            let ependymalLyph   = this._graphData.lyphs.find(lyph => lyph.id === lyphID);
            ependymalLyph.color = "#aaa";
            link.lyphScale      = { width: 1.5 * ependymalLyph.layers.length, height: 2 };
            maxLayers           = Math.max(maxLayers, ependymalLyph.layers.length);
        });

        ependymal::entries().forEach(([linkID, lyphID]) => {
            let ependymalLyph = this._graphData.lyphs.find(lyph => lyph.id === lyphID);
            colorLyphsExt(ependymalLyph.layers, interpolateBlues, maxLayers, true);
            this._graphData.groups[0].entities.push(ependymalLyph);
        });

        const createInternalLyphs = (lyph, group = undefined) => {
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
                    if (group){ group.entities.push(node); }
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
                if ( group ) {
                    group.entities.push(innerLyph);
                    group.entities.push(link);
                }
            })
        };

        this._graphData.lyphs.filter(lyph => lyph.internalLyphs).forEach(lyph =>
            createInternalLyphs(lyph, this._graphData.groups[1])
        );

        //Form links to join neural system lyphs:
        [["99011", "99008"], ["99008","99005"], ["99005", "99002"]].forEach(
            ([s,t]) => {
                let [sNode, tNode] = [s, t].map(containerLyphID => {
                    let containerLyph = this._graphData.lyphs.find(lyph => lyph.id === containerLyphID);
                    if (containerLyph.internalNodes){ return containerLyph.internalNodes[0]; }
                    let centerNode = {
                        "id"    : `center${containerLyphID}`,
                        "belongsToLyph" : containerLyph,
                        "color" : "#666",
                        "val"   : 0.5,
                        "skipLabel": true
                    };
                    this._graphData.groups[1].entities.push(centerNode);
                    containerLyph.internalNodes = [centerNode];
                    this._graphData.nodes.push(centerNode);
                    return centerNode;
                });

                let link = {
                    "id"       : 'lnk' + (this._graphData.links.length + 1).toString(),
                    "source"   : sNode,
                    "target"   : tNode,
                    "length"   : 100,
                    "color"    : "#aaa",
                    "type"     : LINK_TYPES.LINK,
                    "strength" : 0
                };
                this._graphData.links.push(link);
                this._graphData.groups[1].entities.push(link);
            }
        );

        //Create Urinary tract and Cardiovascular system omega trees

        //Recolor lyphs
        colorLyphs(omega["LR"].trees["Arterial"]::values(), interpolateReds);
        colorLyphs(omega["LR"].trees["Venous"]::values()  , interpolateRdPu);
        colorLyphs(omega["PS"].trees["Urinary"]::values(), interpolateGreens);
        colorLyphs(omega["Connector"]::values(), interpolateOranges);

        //Add an extra node to correctly end the Urinary tree
        omega["LR"].trees["Arterial"]["end1"] = 0;
        omega["PS"].trees["Urinary"]["end2"] = 0;

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
                    if (j === 0){
                        node.host = host;
                    }
                    if (offsets[node.id]){ node.offset = offsets[node.id]; }
                    this._graphData.nodes.push(node);
                    this._graphData.groups[2].entities.push(node);
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
                        "length"        : (host==="LR")? 3: 2,
                        "type"          : LINK_TYPES.LINK,
                        "conveyingLyph" : tree[key],
                        "color"         : omega[host].color,
                        "linkMethod"    : "Line2"
                    };
                    this._graphData.links.push(link);
                    this._graphData.groups[2].entities.push(link);
                });
            })
        });

        const CONNECTOR_COLOR = "#ff44ff";
        ["H", "I", "J"].forEach((key, i) => {
            let node = {
                "id"   : `LRPS${i}`,
                "color": CONNECTOR_COLOR };
            this._graphData.nodes.push(node);
            this._graphData.groups[2].entities.push(node);
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
                "length"       : 2,
                "type"         : LINK_TYPES.LINK,
                "conveyingLyph": connectorLyphs[i],
                "color"        : CONNECTOR_COLOR,
                "linkMethod"   : "Line2"
            };
            this._graphData.links.push(link);
            this._graphData.groups[2].entities.push(link);
        }

        function getLinkByLyphID(links, lyphID) {
            let res = links.find(link => link.conveyingLyph &&
            (link.conveyingLyph  === lyphID || link.conveyingLyph.id === lyphID));
            if (!res) {
                const hasLayer = (lyph, layerID) => {
                    return (lyph.layers || []).find(layer => (layer === layerID || layer.id === layerID))
                };

                //For lyphs which are layers, return parent's link (does not work for ID's)
                res = links.find(link => link.conveyingLyph
                && hasLayer(link.conveyingLyph) && hasLayer(link.conveyingLyph, lyphID))
            }
            return res;
        }

        //Coalescence defined as groups of lyphs
        [ ["78", "24"] ].forEach(lyphs => {
            let coalescingLinks  = lyphs.map(lyphID => getLinkByLyphID(this._graphData.links, lyphID));

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
                        this._graphData.groups[3].entities.push(link);
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
            this._graphData.groups[4].entities.push(node);
        });

        let containerLink = {
            "id"        : 'lnk' + (this._graphData.links.length + 1).toString(),
            "source"    : kNode,
            "target"    : lNode,
            "type"      : LINK_TYPES.CONTAINER,
            "length"    : 50,
            "lyphScale" : 4,
            "conveyingLyph" : "5"
        };
        this._graphData.links.push(containerLink);
        this._graphData.groups[4].entities.push(containerLink);

        let containerLyph = this._graphData.lyphs.find(lyph => lyph.id === "5");
        containerLyph.inactive = true;  // Exclude this entity from being highlighted
        containerLyph.border = { borders: [{}, {}, {}, {nodes: ["PS013", "LR05", "LR15"]}]};

        // Assign inner content to the container lyph border
        let containerHost = this._graphData.lyphs.find(lyph => lyph.id === "3");
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
                "length"    : 3,
                "color"     : "#aaa",
                "type"      : LINK_TYPES.LINK,
                "lyphScale" : { width: 4, height: 4 },
                "reversed"  : reversed
            };
            if (conveyingLyph){
                link.conveyingLyph = conveyingLyph;
            }
            this._graphData.links.push(link);
        };

        let NUM_LEVELS = 6;
        let dt = 0.5 / NUM_LEVELS;

        //TODO generalize to derive layers from supertypes
        //Assign Miocardium, Endocardium and Blood layers to each of 6 cardiac lyphs
        let layers = ["999", "998", "997"].map(layerParentID => this._graphData.lyphs
            .find(lyph => lyph.id === layerParentID));
        layers.forEach(lyph => lyph.subtypes = []);

        cardiacLyphMapping::values().forEach(lyphID => {
            let cLyph = this._graphData.lyphs.find(lyph => lyph.id === lyphID);
            cLyph.layers = [];
            layers.forEach(layerParent => {
                let lyphLayer = {
                    "id"        : `${layerParent.id}_${lyphID}`,
                    "name"      : `${layerParent.name} in ${cLyph.name}`,
                    "supertype" : layerParent.id,
                    "color"     : layerParent.color
                };
                this._graphData.lyphs.push(lyphLayer);
                cLyph.layers.push(`${layerParent.id}_${lyphID}`);
                layerParent.subtypes.push(`${layerParent.id}_${lyphID}`);
                if (lyphLayer.id === "997_1000"){
                    lyphLayer.internalLyphs = ["995"]; //Right Fibrous Ring
                    createInternalLyphs(lyphLayer);
                }
                if (lyphLayer.id === "997_1010"){
                    lyphLayer.internalLyphs = ["996"]; //Left Fibrous Ring.
                    createInternalLyphs(lyphLayer);
                }

            });
        });

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
                    addCardiacLink(src, trg, cardiacLyphMapping[trg], reversed);
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