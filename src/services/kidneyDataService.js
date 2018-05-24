import { coreGraph, ependymalGraph } from '../data/core-graph.json';
import { lyphs } from '../data/kidney-lyphs.json';
import { ependymal, trees } from '../data/kidney-mapping.json';

import { assign, entries, keys, values, cloneDeep} from 'lodash-bound';
import { schemePaired, schemeDark2,
    interpolateReds, interpolateGreens, interpolateBlues, interpolateRdPu, interpolateOranges } from 'd3-scale-chromatic';
import { Graph } from '../models/graphModel';

import { Node, NODE_TYPES } from '../models/nodeModel';
import { Link, LINK_TYPES } from '../models/linkModel';
import { Group } from '../models/groupModel';
import { Lyph }  from '../models/lyphModel';
import {modelClasses} from '../models/utils';

const colors = [...schemePaired, schemeDark2];

const addColor = (array, defaultColor) =>
    array.filter(obj => !obj.color)
        .forEach((obj, i) => { obj.color = defaultColor || colors[i % colors.length] });


/**
 * Create omega trees and lyphs tfor Kidney scenario
 * https://drive.google.com/file/d/0B89UZ62PbWq4ZkJkTjdkN1NBZDg/view
 */
export class KidneyDataService{
    _entitiesByID = {};

    constructor(){
        let neuralGroup = {
            "id"       : "g1",
            "name"     : "Neural system",
            "entities" : []
        };

        let neuronGroup = {
            "id"       : "g2",
            "name"     : "Neurons",
            "entities" : []
        };

        let omegaGroup = {
            "id": "g3",
            "name": "Omega trees",
            "entities": []
        };

        let coalescenceGroup = {
            "id"       : "g4",
            "name"     : "Coalescences",
            "entities" : []
        };

        let containerGroup = {
            "id"       : "g5",
            "name"     : "Containers",
            "entities" : []
        };

        this._graphData = {
            nodes : [...coreGraph.nodes, ...ependymalGraph.nodes]::cloneDeep(),
            links : [...coreGraph.links, ...ependymalGraph.links]::cloneDeep(),
            lyphs : lyphs::cloneDeep(),
            groups: [omegaGroup, containerGroup, coalescenceGroup, neuralGroup, neuronGroup]
        };

        //Add ependymal links to the model graph
        // ependymalGraph.nodes.forEach(node => this._graphData.nodes.push(node));
        // ependymalGraph.links.forEach(link => this._graphData.links.push(link));

        this._graphData.nodes = this._graphData.nodes.map(node => node::assign({"charge": 10}));
        this._graphData.links = this._graphData.links.map(link => {
            if (link.type !== LINK_TYPES.DASHED) { link.linkMethod = "Line2" }
            return link
        });

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

        //Copy existing entities to a map to enable nested model instantiation
        this._graphData::values().forEach(array => array.forEach(e => this._entitiesByID[e.id] = e));
        this._graphData = Graph.fromJSON(this._graphData, modelClasses, this._entitiesByID);


        //TODO: refactor the node/link generation code below so that model classes are created by Graph.fromJSON(...)

        //Assign central nervous system lyphs to corresponding edges
        let maxLayers = 0;
        ependymal::entries().forEach(([linkID, lyphID]) => {
            let link = this._graphData.getLinkByID(linkID);
            link.conveyingLyph = ependymal[linkID];
            let ependymalLyph = this._graphData.lyphs.find(lyph => lyph.id === lyphID);
            ependymalLyph.color = "#aaa";
            link.lyphScale = { width: 1.5 * ependymalLyph.layers.length, height: 2 };
            maxLayers = Math.max(maxLayers, ependymalLyph.layers.length);
        });

        ependymal::entries().forEach(([linkID, lyphID]) => {
            let ependymalLyph = this._graphData.lyphs.find(lyph => lyph.id === lyphID);
            colorLyphsExt(ependymalLyph.layers, interpolateBlues, maxLayers, true);
            neuralGroup.entities.push(ependymalLyph);
        });


        this._graphData.lyphs.filter(lyph => lyph.internalLyphs).forEach(lyph => {

            lyph.internalLyphs.forEach(innerLyphID => {
                //Bi-directional relationship
                let innerLyph = this._graphData.lyphs.find(lyph => lyph.id === innerLyphID);
                if (innerLyph) { innerLyph.belongsToLyph = lyph; }

                if (lyph.id === "5") {return; } // Kidney lobus content is part fo omega trees

                let [sNode, tNode] = ["s", "t"].map(prefix =>
                    Node.fromJSON({
                        "id"       : `${prefix}${innerLyphID}`,
                        "name"     : `${prefix}${innerLyphID}`,
                        "color"    : "#ccc",
                        "val"      : 0.1,
                        "skipLabel": true
                    }));
                [sNode, tNode].forEach(node => {
                    this._graphData.nodes.push(node);
                    neuronGroup.entities.push(node);
                });

                let link = Link.fromJSON({
                    "id"            : (this._graphData.links.length + 1).toString(),
                    "source"        : sNode,
                    "target"        : tNode,
                    "length"        : 2,
                    "type"          : LINK_TYPES.INVISIBLE,
                    "color"         : "#ccc",
                    "conveyingLyph" : innerLyphID
                });

                this._graphData.links.push(link);

                neuronGroup.entities.push(innerLyph);
                neuronGroup.entities.push(link);
            })
        });


        //Form links to join neural system lyphs:
        [["99011", "99008"], ["99008","99005"], ["99005", "99002"]].forEach(
            ([s,t]) => {
                let [sNode, tNode] = [s, t].map(containerLyphID => {
                    let containerLyph = this._graphData.lyphs.find(lyph => lyph.id === containerLyphID);
                    if (containerLyph.internalNodes){ return containerLyph.internalNodes[0]; }
                    let centerNode = Node.fromJSON({
                        "id"    : `center${containerLyphID}`,
                        "belongsToLyph" : containerLyph,
                        "color" : "#666",
                        "val"   : 0.5,
                        "skipLabel": true
                    });
                    neuronGroup.entities.push(centerNode);
                    containerLyph.internalNodes = [centerNode];
                    this._graphData.nodes.push(centerNode);
                    return centerNode;
                });

                let link = Link.fromJSON({
                    "id"       : (this._graphData.links.length + 1).toString(),
                    "source"   : sNode,
                    "target"   : tNode,
                    "length"   : 100,
                    "color"    : "#aaa",
                    "type"     : LINK_TYPES.LINK,
                    "strength" : 0
                });
                this._graphData.links.push(link);
                neuronGroup.entities.push(link);
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
        colorLyphs(trees["Vascular"]["Arterial"]::values(), interpolateReds);
        colorLyphs(trees["Vascular"]["Venous"]::values()  , interpolateRdPu);
        //Recolor urinary lyphs to the shades of green (or purple)
        colorLyphs(trees["Urinary"]::values(), interpolateGreens);
        //Recolor connector lyphs in the shades of ornage
        colorLyphs(trees["Connector"]::values(), interpolateOranges);

        //Add an extra node to correctly end the Urinary tree
        hosts["7"].trees[0].lyphs["end1"] = 0;
        hosts["5"].trees[0].lyphs["end2"] = 0;


        const offsets = {"500": 0.25, "510": 0.65, "700": 0.25};
        //Omega tree nodes
        hosts::keys().forEach((host) => {
            //let hostLink = this._graphData.getLinkByID(host);
            hosts[host].trees.forEach((tree, i) => {
                tree.lyphs::keys().forEach((key, j) => {
                    let node = Node.fromJSON({
                        "id"       : `${host}${i}${j}`,
                        "host"     : host,
                        //"belongsTo" : host,
                        "isRoot"    : (j === 0),
                        "color"     : hosts[host].color,
                        "charge"    : 5
                    });

                    // Explicitly define position of the root node on the hosting link:
                    // fraction 0 <= x <= 1, where 0 corresponds to the source node and 1 to the target node
                    // To bypass the central node, shift the root close to L
                    if (node.isRoot && offsets[node.id]){ node.offset = offsets[node.id]; }
                    this._graphData.nodes.push(node);
                    omegaGroup.entities.push(node);
                });
            });
            //Create links for generated omega tree
            hosts[host].trees.forEach((tree, i) => {
                const NUM_LEVELS = tree.lyphs::keys().length;
                tree.lyphs::keys().forEach((key, j) => {
                    if (j === NUM_LEVELS - 1) { return; }
                    let link = Link.fromJSON({
                        "id"            : (this._graphData.links.length + 1).toString(),
                        "source"        : this._graphData.getNodeByID(`${host}${i}${j}`),
                        "target"        : this._graphData.getNodeByID(`${host}${i}${j + 1}`),
                        "external"      : key,
                        "length"        : (host==="5")? 2: 1,
                        "type"          : LINK_TYPES.LINK,
                        "conveyingLyph" : tree.lyphs[key],
                        "color"         : hosts[host].color,
                        "linkMethod"    : "Line2"
                    });
                    this._graphData.links.push(link);
                    omegaGroup.entities.push(link);
                });
            })
        });

        //Connect leaves of two omega trees between nodes 506 and 515
        const CONNECTOR_COLOR = "#ff44ff";
        ["H", "I", "J"].forEach((key, i) => {
            let node = Node.fromJSON({
                "id"   : `57${i}`,
                "color": CONNECTOR_COLOR});
            this._graphData.nodes.push(node);
            omegaGroup.entities.push(node);
        });

        const connector = ["505", "570", "571", "572", "515"];
        const connectorLyphs  = trees["Connector"]::values();
        const connectorLabels = trees["Connector"]::keys();

        for (let i = 0 ; i < connector.length - 1; i++){
            let link = Link.fromJSON({
                "id"           : (this._graphData.links.length + 1).toString(),
                "source"       : this._graphData.getNodeByID(connector[i]),
                "target"       : this._graphData.getNodeByID(connector[i + 1]),
                "external"     : connectorLabels[i],
                "length"       : 2,
                "type"         : LINK_TYPES.LINK,
                "conveyingLyph": connectorLyphs[i],
                "color"        : CONNECTOR_COLOR,
                "linkMethod"   : "Line2"
            });
            this._graphData.links.push(link);
            omegaGroup.entities.push(link);
        }

        //Coalescence defined as groups of lyphs
        [ ["78", "24"] ].forEach(lyphs => {
            let coalescingLinks  = lyphs.map(lyph => this._graphData.getLinkByLyphID(lyph)); //always finds only

            coalescingLinks.forEach((link1, i) => {
                coalescingLinks.forEach((link2, j) => {
                    if (i === j) { return; }
                    ["source", "target"].forEach(end => {
                        let link = Link.fromJSON({
                            "id"    : (this._graphData.links.length + 1).toString(),
                            "source": link1[end],
                            "target": link2[end],
                            "length": 0.1,
                            "type": LINK_TYPES.FORCE
                        });
                        this._graphData.links.push(link);
                        coalescenceGroup.entities.push(link);
                    });
                })
            });
        });

        //Add link from center to the center of mass for a container link
        let [kNode, lNode] = ["k", "l"].map((name, i) =>
            Node.fromJSON({
                "id"     : name,
                "name"   : name,
                "type"   : NODE_TYPES.FIXED,
                "hidden" : true,
                "layout" : {x: 0, y: (i === 0)? 0: 70, z: 25}
            })
        );
        [kNode, lNode].forEach(node => {
            this._graphData.nodes.push(node);
            containerGroup.entities.push(node);
        });

        let containerLink = Link.fromJSON({
            "id"        : (this._graphData.links.length + 1).toString(),
            "source"    : kNode,
            "target"    : lNode,
            "type"      : LINK_TYPES.CONTAINER,
            "length"    : 50,
            "lyphScale" : 4,
            "conveyingLyph" : "5"
        });
        this._graphData.links.push(containerLink);
        containerGroup.entities.push(containerLink);

        let containerLyph = this._graphData.lyphs.find(lyph => lyph.id === "5");
        containerLyph.inactive = true;  // Exclude this entity from being highlighted
        containerLyph.border = { borders: [{}, {}, {}, {nodes: ["7013", "505", "515"]}]};

        // Assign inner content to the container lyph border
        let containerHost = this._graphData.lyphs.find(lyph => lyph.id === "3");
        containerHost.border = { borders: [ {}, {}, {}, { conveyingLyph: "5" }]};
        containerLyph.belongsToLyph = containerHost;

        //Color links and lyphs which do not have assigned colors yet
        addColor(this._graphData.links, "#000");
        addColor(this._graphData.lyphs);

        //TODO move ID to Object mapping to the model (set property interceptors)
        //Create lyph models from their json definitions
        this._graphData.lyphs = this._graphData.lyphs.map(lyph => Lyph.fromJSON(lyph));

        //Replace layer ids with lyph models
        this._graphData.lyphs.filter(lyph => lyph.layers).forEach(lyph => {
            lyph.layers = lyph.layers.map(layer => {return this._graphData.getLyphByID(layer)});
        });

        //for each link, replace lyph id's with lyph model
        this._graphData.links.forEach(link =>
            link.conveyingLyph = this._graphData.getLyphByID(link.conveyingLyph));

        /*Map initial positional constraints to match the scaled image*/
        const axisLength = 400;
        const scaleFactor = axisLength * 0.01;

        this._graphData.nodes.forEach(node => node.layout::keys().forEach(key => {node.layout[key] *= scaleFactor; }));
        this._graphData.links.filter(link => link.length).forEach(link => link.length *= 2 * scaleFactor); }

    get graphData(){
        return this._graphData;
    }
}