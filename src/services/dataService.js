import { modelClasses} from '../models/utils';
import { LinkModel, LINK_TYPES }    from '../models/linkModel';
import { NodeModel, NODE_TYPES }    from '../models/nodeModel';
import { LyphModel } from '../models/lyphModel';
import { GraphModel } from '../models/graphModel';

import { schemePaired, schemeDark2} from 'd3-scale-chromatic';

const colors = [...schemePaired, schemeDark2];

const addColor = (array, defaultColor) =>
    array.filter(obj => !obj.color)
        .forEach((obj, i) => { obj.color = defaultColor || colors[i % colors.length] });

/**
 * Create omega trees and lyphs tfor Kidney scenario
 * https://drive.google.com/file/d/0B89UZ62PbWq4ZkJkTjdkN1NBZDg/view
 */
export class DataService {
    entitiesById = {};

    constructor(){
        this._graphData = GraphModel.fromJSON({}, modelClasses);
        this._lyphs = [];
        this._coalescencePairs = [];
    }

    getLink(id) {
        return this._graphData.links.find(link => link.id === id);
    }

    getNode(id) {
        return this._graphData.nodes.find(node => node.id === id);
    }

    init(){
        const coreGraphData = {
            nodes : [
                {   "id"  : "c", "name": "c",      "val" : 10, "color": "#D2691E", "graph": "A", "layout": {"x": 100, "y":  0, "z":  0} },
                {   "id"  : "n", "name": "n",      "val" : 10, "color": "#D2691E", "graph": "A", "layout": {"x":-100, "y":  0, "z":  0} },
                {   "id"  : "t", "name": "t",      "val" : 10, "color": "#808080", "graph": "B", "layout": {"x": -60, "y":  0, "z":  0} },
                {   "id"  : "a", "name": "a",      "val" : 10, "color": "#808080", "graph": "B", "layout": {"x":   0, "y":  0, "z":  0} },
                {   "id"  : "h", "name": "h",      "val" : 10, "color": "#444444", "graph": "B", "layout": {"x":  60, "y":  0, "z":  0} },
                {   "id"  : "R", "name": "R",      "val" : 10, "color": "#ff0000", "graph": "C", "layout": {"x":   0, "y": 75, "z":-25} },
                {   "id"  : "L", "name": "L",      "val" : 10, "color": "#7B68EE", "graph": "C", "layout": {"x":   0, "y":-75, "z": 25} },
                {   "id"  : "S", "name": "\u03A3", "val" : 10, "color": "#006400", "graph": "D", "layout": {"x": -90, "y":  0, "z":  0} } ,
                {   "id"  : "P", "name": "\u03C0", "val" : 10, "color": "#0000CD", "graph": "D", "layout": {"x":  90, "y":  0, "z":  0} }
            ],
            links : [
                {  "id": "1", "source": "c", "target": "n", "name": "",          "type": LINK_TYPES.AXIS, "length": 100 },
                {  "id": "2", "source": "t", "target": "a", "name": "Ependymal", "type": LINK_TYPES.LINK, "length":  30 },
                {  "id": "3", "source": "a", "target": "h", "name": "Ependymal", "type": LINK_TYPES.LINK, "length":  30 },
                {  "id": "4", "source": "R", "target": "L", "name": "Pulmonary", "type": LINK_TYPES.PATH, "length":  75 },
                {  "id": "5", "source": "L", "target": "R", "name": "Systemic",  "type": LINK_TYPES.PATH, "length":  75 },
                {  "id": "6", "source": "S", "target": "P", "name": "Gut",       "type": LINK_TYPES.PATH, "length":  90 },
                {  "id": "7", "source": "P", "target": "S", "name": "Gut'",      "type": LINK_TYPES.PATH, "length":  90 }
            ]
        };

        //Set a marker to distinguish core graph nodes from other nodes that will be added later to the graph
        coreGraphData.nodes.forEach(node  => node.type = NODE_TYPES.CORE);
        this._graphData.nodes = coreGraphData.nodes.map(node => NodeModel.fromJSON(node, modelClasses));
        this._graphData.links = coreGraphData.links.map(node => LinkModel.fromJSON(node, modelClasses));
    }

    afterInit(){
        //Create links for coalescence pairs to hold nodes aligned
        this._coalescencePairs.forEach(({node1, node2}) => {
            this.getNode(node1).coalescence = node2;
            this.getNode(node2).coalescence = node1;
            this._graphData.links.push(LinkModel.fromJSON({
                "id"    : (this._graphData.links.length + 1).toString(),
                "source": node1,
                "target": node2,
                "length": 0,
                "type": LINK_TYPES.COALESCENCE,
                "layout": {"z": 25}
            }, modelClasses));
        });

        //Color links and lyphs which do not have assigned colors yet
        addColor(this._graphData.links, "#000");
        addColor(this._lyphs);

        //Create lyph models from their json definitions
        this._lyphs = this._lyphs.map(lyph => {
            lyph.class = "Lyph";
            return LyphModel.fromJSON(lyph, modelClasses);
        });

        //Replace layer ids with lyph models
        this._lyphs.filter(lyph => lyph.layers).forEach(lyph => {
            lyph.layers = lyph.layers.map(layer => {return this._lyphs.find(lyph => lyph.id === layer)});
        });

        //Replace content id with lyph model
        this._lyphs.filter(lyph => lyph.content).forEach(lyph => {
            lyph.content = this._lyphs.find(x => x.id === lyph.content);
            console.log("Lyph with content overriden", lyph.id, lyph.content);
        });

        //for each link, replace lyph id's with lyph model
        this._graphData.links.forEach(link => {
            link.conveyingLyph = this._lyphs.find(lyph => lyph.id === link.conveyingLyph);
        });

        //place empty layout object to simplify checking for constraints
        this._graphData.nodes.forEach(node => {
            node.layout = node.layout || {};
        });

        const axisLength = 400;
        const scaleFactor = axisLength * 0.01;

        //Map initial positional constraints to match the scaled image
        this._graphData.nodes.forEach(node => {
            Object.keys(node.layout).forEach(key => {node.layout[key] *= scaleFactor; })
        });

        this._graphData.links.filter(link => link.length)
            .forEach(link => {link.length *= 2 * scaleFactor});

        console.log("Lyphs", this._lyphs);
        console.log("Graph", this._graphData);
    }

    get graphData(){
        return this._graphData;
    }

    get lyphs(){
        return this._lyphs;
    }
}