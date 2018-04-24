import { lyphs } from '../data/kidney-lyphs.json';
import { ependymal, trees } from '../data/kidney-mapping.json';

import { modelClasses } from '../models/utils';
import { NodeModel, NODE_TYPES } from '../models/nodeModel';
import { LinkModel, LINK_TYPES } from '../models/linkModel';

import {cloneDeep} from 'lodash-bound';
import {DataService} from './dataService';

import {interpolateReds, interpolateGreens, interpolatePurples, interpolateRdPu,
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

        const colorLyphs = (lyphs, colorFn, reversed = false) => {
            lyphs.forEach((lyphID, i) =>{
                let lyph = this._lyphs.find(lyph => lyph.id === lyphID);
                lyph.color = colorFn(((reversed)? 0.75 - i : 0.25 + i ) / (1.25 * lyphs.length));
            });
        };

        //Assign central nervous system lyphs to corresponding edges
        Object.keys(ependymal).forEach(linkID => {
            this._graphData.getLinkByID(linkID).conveyingLyph = ependymal[linkID];
            let ependymalLyph = this._lyphs.find(lyph => lyph.id === ependymal[linkID]);
            //Recolor the lyph and its layers to match the mock-up
            ependymalLyph.color = "#aaa";
            colorLyphs(ependymalLyph.layers, interpolatePurples);
        });

        this._lyphs.filter(lyph => lyph.internalLyphs).forEach(lyph => {

            lyph.internalLyphs.forEach(innerLyph => {
                //Bi-directional relationship
                let innerLyphObj = this._lyphs.find(lyph => lyph.id === innerLyph);
                if (innerLyphObj) { innerLyphObj.externalLyph = lyph; }

                if (lyph.id === "5") {return; } // Kidney lobus content is part fo omega trees
                ["s", "t"].forEach(prefix => {
                    let node = NodeModel.fromJSON({
                        "id": `${prefix}${innerLyph}`,
                        "host": this._graphData.getLinkByLyphID(innerLyph),
                        "type": NODE_TYPES.BORDER,
                        "color" : "#ccc",
                        "val"   : 0.1,
                        "skipLabel": true
                        //"hidden": true
                    }, modelClasses);
                    this._graphData.nodes.push(node);
                });
                let link = LinkModel.fromJSON({
                    "id"       : (this._graphData.links.length + 1).toString(),
                    "source"   : this._graphData.getNodeByID(`s${innerLyph}`),
                    "target"   : this._graphData.getNodeByID(`t${innerLyph}`),
                    "length"   : 2,
                    "type"     : LINK_TYPES.BORDER,
                    "color"    : "#ccc",
                    "conveyingLyph" : innerLyph
                }, modelClasses);
                this._graphData.links.push(link);
            })
        });

        //TODO create node in the center
        //Form links to join neural system lyphs:
        //["198", "199", "200"] - "202" - "203" - ["204", "205"] - "206" - "197"
        [["198", "204"], ["199", "197"], ["200", "203"], ["200", "206"], ["202", "205"]].forEach(
            ([s,t]) => {
                let link = LinkModel.fromJSON({
                    "id"       : (this._graphData.links.length + 1).toString(),
                    "source"   : this._graphData.getNodeByID(`t${s}`),
                    "target"   : this._graphData.getNodeByID(`s${t}`),
                    "length"   : 100,
                    "color"    : "#aaa",
                    "type"     : LINK_TYPES.LINK,
                    "strength" : 0
                }, modelClasses);
                this._graphData.links.push(link);
            }
        );

        //three contiguous edges that link these four innermost (cytosol) layers of lyphs representing neurons:
        // {99011, 99008, 99005, 99002}
        // The neuron lyphs are embedded in the parenchymal layers of spinal cord, via medulla and pons,
        // to cerebellum. The two terminal nodes are, as specified, embedded in those parenchymal cysts you've added.


        //Create Urinary tract and Cardiovascular system omega trees
        const hosts = {
            "5": {
                "color": "#ff4444",
                "sign" : -1,
                "trees": [
                    {"lyphs": trees["Vascular"]["Arterial"]},
                    {"lyphs": trees["Vascular"]["Venous"]}
                ]
            },
            "7": {
                "color": "#4444ff",
                "sign" : 1,
                "trees": [ {"lyphs": trees["Urinary"]} ]
            }
        };

        //Recolor vascular tree lyphs to shades of red and red/purple
        colorLyphs(Object.values(trees["Vascular"]["Arterial"]), interpolateReds);
        colorLyphs(Object.values(trees["Vascular"]["Venous"]), interpolateRdPu);
        //Recolor urinary lyphs to the shades of green (or purple)
        colorLyphs(Object.values(trees["Urinary"]), interpolateGreens);

        //Recolor connector lyphs in the shades of ornage
        const connectorLyphs  = Object.values(trees["Connector"]);
        colorLyphs(connectorLyphs, interpolateOranges);


        //Add an extra node to correctly end the Urinary tree
        hosts["7"].trees[0].lyphs["end1"] = 0;
        hosts["5"].trees[0].lyphs["end2"] = 0;
        //hosts["5"].trees[1].lyphs["end3"] = 0;

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

                    // explicitly define position of the root node on the hosting link:
                    // fraction 0 <= x <= 1, where 0 corresponds to the source node and 1 to the target node
                    // To bypass the central node, shift the root close to L
                    if (node.isRoot && offsets[node.id]){
                        node.offset = offsets[node.id];
                    }
                    //TODO save root in the treeModel
                    //TODO Make sure the data below is kept in the treeModel
                    //     "tree"  : ,
                    //     "level" : j + 1

                    this._graphData.nodes.push(node);
                });
            });
            //Create links for generated omega tree
            hosts[host].trees.forEach((tree, i) => {
                const NUM_LEVELS = Object.keys(tree.lyphs).length;
                Object.keys(tree.lyphs).forEach((key, j) => {
                    if (j === NUM_LEVELS - 1) { return; }
                    let link = LinkModel.fromJSON({
                        "id"       : (this._graphData.links.length + 1).toString(),
                        "source"   : this._graphData.getNodeByID(`${host}${i}${j}`),
                        "target"   : this._graphData.getNodeByID(`${host}${i}${j + 1}`),
                        //"level": j,
                        "external" : key,
                        "length"   : (host === "5")? 2: 1, //Urinary links shorter
                        "type"     : LINK_TYPES.LINK,
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
        const connectorLabels = Object.keys(trees["Connector"]);

        for (let i = 0 ; i < connector.length - 1; i++){
            this._graphData.links.push(LinkModel.fromJSON({
                "id"           : (this._graphData.links.length + 1).toString(),
                "source"       : this._graphData.getNodeByID(connector[i]),
                "target"       : this._graphData.getNodeByID(connector[i + 1]),
                //"level": i,
                "external"     : connectorLabels[i],
                "length"       : 1,
                "type"         : LINK_TYPES.LINK,
                "conveyingLyph": connectorLyphs[i],
                "color"        : CONNECTOR_COLOR,
                "linkMethod"    : "Line2"
            }, modelClasses));
        }

        //Coalescences defined as lyph groups
        this._coalescences = [ ["78", "24"] ];

        //Add link from center to the center of mass for a coalescence group
        this._graphData.nodes.push(NodeModel.fromJSON({
                "id"     : "k",
                "name"   : "k",
                "type"   : NODE_TYPES.FIXED,
                "hidden": true,
                "layout" : {x: 0, y: 0, z: 25}
            }, modelClasses)
        );
        this._graphData.nodes.push(NodeModel.fromJSON({
                "id"     : "l",
                "type"   : NODE_TYPES.FIXED,
                "hidden" : true,
                "layout" : {x: 0, y: 70, z: 25},
                //"type" : NODE_TYPES.CONTROL //Determine node position based on other nodes
                //"controlNodes" : ["510", "R", "a"]
            }, modelClasses)
        );

        this._graphData.links.push(LinkModel.fromJSON({
            "id"    : (this._graphData.links.length + 1).toString(),
            "source": this._graphData.getNodeByID("k"),
            "target": this._graphData.getNodeByID("l"),
            "length": 50,
            "type"  : LINK_TYPES.CONTAINER,
            //"conveyingLyph"  : "1", //Kidney
            "conveyingLyph"  : "5" //Kidney lobus
        }, modelClasses));

        let containerLyph = this._lyphs.find(lyph => lyph.id === "5");
        containerLyph.inactive      = true;  // Exclude this entity from being highlighted

        containerLyph.border = {};
        containerLyph.border.borders = [{}, {}, {}, {nodes: ["7013", "505", "515"]}];

        //Refactored content assignment: to border instead of lyph
        // containerLyph = this._lyphs.find(lyph => lyph.id === "3");
        // containerLyph.border = {};
        // containerLyph.border.borders = [{}, {}, {}, {conveyingLyph: "5"}];

        super.afterInit();

    }
}