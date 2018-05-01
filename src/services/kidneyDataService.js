import { lyphs } from '../data/kidney-lyphs.json';
import { ependymal, trees } from '../data/kidney-mapping.json';

import { modelClasses } from '../models/utils';
import { NodeModel, NODE_TYPES } from '../models/nodeModel';
import { LinkModel, LINK_TYPES } from '../models/linkModel';

import {cloneDeep} from 'lodash-bound';
import {DataService} from './dataService';

import {interpolateReds, interpolateGreens, interpolateBlues, interpolateRdPu,
    interpolateOranges} from 'd3-scale-chromatic';

/**
 * Create omega trees and lyphs tfor Kidney scenario
 * https://drive.google.com/file/d/0B89UZ62PbWq4ZkJkTjdkN1NBZDg/view
 */
export class KidneyDataService extends DataService{

    constructor(){
        super();
        this._lyphs = lyphs::cloneDeep();
    }

    init(){
        super.init();

        const colorLyphs = (lyphs, colorFn) => {
            lyphs.forEach((lyphID, i) =>{
                let lyph = this._lyphs.find(lyph => lyph.id === lyphID);
                lyph.color = colorFn(0.25 + i / lyphs.length);
            });
        };

        const colorLyphsExt = (lyphs, colorFn, numColors, reversed = false) => {
            lyphs.forEach((lyphID, i) =>{
                let lyph = this._lyphs.find(lyph => lyph.id === lyphID);
                lyph.color = colorFn(((reversed)? 0.75 - i / numColors : 0.25 + i / numColors));
            });
        };

        //Assign central nervous system lyphs to corresponding edges
        let maxLayers = 0;
        Object.keys(ependymal).forEach(linkID => {
            let link = this._graphData.getLinkByID(linkID);
            link.conveyingLyph = ependymal[linkID];
            let ependymalLyph = this._lyphs.find(lyph => lyph.id === ependymal[linkID]);
            ependymalLyph.color = "#aaa";
            link.lyphScale = { width: 1.5 * ependymalLyph.layers.length, height: 2 };
            maxLayers = Math.max(maxLayers, ependymalLyph.layers.length);
        });
        Object.keys(ependymal).forEach(linkID => {
            let ependymalLyph = this._lyphs.find(lyph => lyph.id === ependymal[linkID]);
            colorLyphsExt(ependymalLyph.layers, interpolateBlues, maxLayers, true);
        });


        this._lyphs.filter(lyph => lyph.internalLyphs).forEach(lyph => {

            lyph.internalLyphs.forEach(innerLyphID => {
                //Bi-directional relationship
                let innerLyph = this._lyphs.find(lyph => lyph.id === innerLyphID);
                if (innerLyph) {
                    innerLyph.belongsToLyph = lyph;
                } else {
                    console.log("Did not find lyph", innerLyphID);
                    return;
                }

                if (lyph.id === "5") {return; } // Kidney lobus content is part fo omega trees

                let [sNode, tNode] = ["s", "t"].map(prefix =>
                    NodeModel.fromJSON({
                        "id"       : `${prefix}${innerLyphID}`,
                        "name"     : `${prefix}${innerLyphID}`,
                        "type"     : NODE_TYPES.BORDER,
                        "color"    : "#ccc",
                        "val"      : 0.1,
                        "skipLabel": true
                    }, modelClasses));
                [sNode, tNode].forEach(node => this._graphData.nodes.push(node));

                let link = LinkModel.fromJSON({
                    "id"            : (this._graphData.links.length + 1).toString(),
                    "source"        : sNode,
                    "target"        : tNode,
                    "length"        : 2,
                    "type"          : LINK_TYPES.BORDER,
                    "color"         : "#ccc",
                    "conveyingLyph" : innerLyphID
                }, modelClasses);

                //TODO create model for a selected group of entities
                innerLyph.groups = [{"name": "Neurons", "class": "Group"}];

                this._graphData.links.push(link);
            })
        });

        //Form links to join neural system lyphs:
        [   //["199", "99011"], ["99002", "197"], ["198", "204"],["200", "203"], ["200", "206"], ["202", "205"]
            ["99011", "99008"], ["99008","99005"], ["99005", "99002"]
        ]
            .forEach(
            ([s,t]) => {
                let [sNode, tNode] = [s, t].map(containerLyphID => {
                    let containerLyph = this._lyphs.find(lyph => lyph.id === containerLyphID);
                    if (containerLyph.internalNodes){ return containerLyph.internalNodes[0]; }
                    let centerNode = NodeModel.fromJSON({
                        "id"    : `center${containerLyphID}`,
                        "belongsToLyph" : containerLyph,
                        "type"  : NODE_TYPES.CENTER,
                        "color" : "#666",
                        "val"   : 0.5,
                        "skipLabel": true
                    }, modelClasses);
                    containerLyph.internalNodes = [centerNode];
                    this._graphData.nodes.push(centerNode);
                    return centerNode;
                });

                let link = LinkModel.fromJSON({
                    "id"       : (this._graphData.links.length + 1).toString(),
                    "source"   : sNode,
                    "target"   : tNode,
                    "length"   : 100,
                    "color"    : "#aaa",
                    "type"     : LINK_TYPES.LINK,
                    "strength" : 0
                }, modelClasses);
                 this._graphData.links.push(link);
            }
        );

        //Create Urinary tract and Cardiovascular system omega trees
        const hosts = {
            "5": {
                "color": "#ff4444",
                "trees": [
                    {"lyphs": trees["Vascular"]["Arterial"]},
                    {"lyphs": trees["Vascular"]["Venous"]} ]},
            "7": {
                "color": "#4444ff",
                "trees": [ {"lyphs": trees["Urinary"]} ]}
        };

        //Recolor vascular tree lyphs to shades of red and red/purple
        colorLyphs(Object.values(trees["Vascular"]["Arterial"]), interpolateReds);
        colorLyphs(Object.values(trees["Vascular"]["Venous"])  , interpolateRdPu);
        //Recolor urinary lyphs to the shades of green (or purple)
        colorLyphs(Object.values(trees["Urinary"])  , interpolateGreens);
        //Recolor connector lyphs in the shades of ornage
        colorLyphs(Object.values(trees["Connector"]), interpolateOranges);

        //Add an extra node to correctly end the Urinary tree
        hosts["7"].trees[0].lyphs["end1"] = 0;
        hosts["5"].trees[0].lyphs["end2"] = 0;

        const offsets = {"500": 0.25, "510": 0.65, "700": 0.25};
        //Omega tree nodes
        Object.keys(hosts).forEach((host) => {
            //let hostLink = this._graphData.getLinkByID(host);
            hosts[host].trees.forEach((tree, i) => {
                let lyphKeys = Object.keys(tree.lyphs);
                lyphKeys.forEach((key, j) => {
                    let node = NodeModel.fromJSON({
                        "id"       : `${host}${i}${j}`,
                        "host"     : host,
                        "isRoot"   : (j === 0),
                        "type"     : NODE_TYPES.OMEGA,
                        "color"    : hosts[host].color
                    },  modelClasses);

                    // Explicitly define position of the root node on the hosting link:
                    // fraction 0 <= x <= 1, where 0 corresponds to the source node and 1 to the target node
                    // To bypass the central node, shift the root close to L
                    if (node.isRoot && offsets[node.id]){ node.offset = offsets[node.id]; }
                    this._graphData.nodes.push(node);
                });
            });
            //Create links for generated omega tree
            hosts[host].trees.forEach((tree, i) => {
                const NUM_LEVELS = Object.keys(tree.lyphs).length;
                Object.keys(tree.lyphs).forEach((key, j) => {
                    if (j === NUM_LEVELS - 1) { return; }
                    let link = LinkModel.fromJSON({
                        "id"            : (this._graphData.links.length + 1).toString(),
                        "source"        : this._graphData.getNodeByID(`${host}${i}${j}`),
                        "target"        : this._graphData.getNodeByID(`${host}${i}${j + 1}`),
                        "external"      : key,
                        "length"        : 2,
                        "type"          : LINK_TYPES.LINK,
                        "conveyingLyph" : tree.lyphs[key],
                        "color"         : hosts[host].color,
                        "linkMethod"    : "Line2"
                    }, modelClasses);
                    this._graphData.links.push(link);
                });
            })
        });

        //Connect leaves of two omega trees between nodes 506 and 515
        const CONNECTOR_COLOR = "#ff44ff";
        ["H", "I", "J"].forEach((key, i) => {
            this._graphData.nodes.push(NodeModel.fromJSON({
                "id"   : `57${i}`,
                "type" : NODE_TYPES.OMEGA,
                "color": CONNECTOR_COLOR}, modelClasses)
            );
        });

        const connector = ["505", "570", "571", "572", "515"];
        const connectorLyphs  = Object.values(trees["Connector"]);
        const connectorLabels = Object.keys(trees["Connector"]);

        for (let i = 0 ; i < connector.length - 1; i++){
            this._graphData.links.push(LinkModel.fromJSON({
                "id"           : (this._graphData.links.length + 1).toString(),
                "source"       : this._graphData.getNodeByID(connector[i]),
                "target"       : this._graphData.getNodeByID(connector[i + 1]),
                "external"     : connectorLabels[i],
                "length"       : 1,
                "type"         : LINK_TYPES.LINK,
                "conveyingLyph": connectorLyphs[i],
                "color"        : CONNECTOR_COLOR,
                "linkMethod"   : "Line2"
            }, modelClasses));
        }

        //Coalescences defined as lyph groups
        this._coalescences = [ ["78", "24"] ];

        //Add link from center to the center of mass for a coalescence group
        let [kNode, lNode] = ["k", "l"].map((name, i) =>
            NodeModel.fromJSON({
                "id"     : name,
                "name"   : name,
                "type"   : NODE_TYPES.FIXED,
                "hidden" : true,
                "layout" : {x: 0, y: (i === 0)? 0: 70, z: 25}
            }, modelClasses)
        );
        [kNode, lNode].forEach(node => this._graphData.nodes.push(node));

        let containerLink = LinkModel.fromJSON({
            "id"        : (this._graphData.links.length + 1).toString(),
            "source"    : kNode,
            "target"    : lNode,
            "type"      : LINK_TYPES.CONTAINER,
            "length"    : 50,
            "lyphScale" : 4,
            "conveyingLyph"  : "5" // "1"
        }, modelClasses);
        this._graphData.links.push(containerLink);

        let containerLyph = this._lyphs.find(lyph => lyph.id === "5");
        containerLyph.inactive = true;  // Exclude this entity from being highlighted
        containerLyph.border = { borders: [{}, {}, {}, {nodes: ["7013", "505", "515"]}]};

        // Assign inner content to the container lyph border
        // this._lyphs.find(lyph => lyph.id === "3").border = {borders: [{}, {}, {}, {conveyingLyph: "5"}]};

        super.afterInit();
    }
}