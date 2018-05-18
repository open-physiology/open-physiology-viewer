import { Link, LINK_TYPES }    from '../models/linkModel';
import { Node, NODE_TYPES }    from '../models/nodeModel';
import { Lyph } from '../models/lyphModel';
import { Graph } from '../models/graphModel';
import { assign, keys } from 'lodash-bound';
import { schemePaired, schemeDark2} from 'd3-scale-chromatic';

const colors = [...schemePaired, schemeDark2];

const addColor = (array, defaultColor) =>
    array.filter(obj => !obj.color)
        .forEach((obj, i) => { obj.color = defaultColor || colors[i % colors.length] });

/**
 * Create a core body graph for ApiNATOMY lyph viewer
 */
export class DataService {
    entitiesById = {};

    constructor(){
        this._graphData = Graph.fromJSON({});
        this._graphData.groups = [];
        this._lyphs = [];
    }

    init(){
        const coreGraphData = {
            nodes : [
                //c-n
                { "id"  : "c", "name": "c",      "color": "#D2691E", "val": 3, "type": NODE_TYPES.CORE, "layout": {"x": 100, "y":  0, "z":  0} },
                { "id"  : "n", "name": "n",      "color": "#D2691E", "val": 3, "type": NODE_TYPES.CORE, "layout": {"x":-100, "y":  0, "z":  0} },
                //t-a, a-h
                { "id"  : "t", "name": "t",      "color": "#808080", "val": 3, "type": NODE_TYPES.CORE, "layout": {"x": -60, "y":  0, "z":  0} },
                { "id"  : "a", "name": "a",      "color": "#808080", "val": 3, "type": NODE_TYPES.FIXED, "layout": {"x":   0, "y":  0, "z":  0} },
                { "id"  : "h", "name": "h",      "color": "#444444", "val": 3, "type": NODE_TYPES.CORE, "layout": {"x":  60, "y":  0, "z":  0} },
                //R-L
                { "id"  : "R", "name": "R",      "color": "#7B68EE", "val": 3, "type": NODE_TYPES.CORE, "layout": {"x":   0, "y": 75, "z":  0} },
                { "id"  : "L", "name": "L",      "color": "#ff0000", "val": 3, "type": NODE_TYPES.CORE, "layout": {"x":   0, "y":-75, "z":  0} },
                //S-P
                { "id"  : "S", "name": "\u03A3", "color": "#006400", "val": 3, "type": NODE_TYPES.CORE, "layout": {"x": -90, "y":  0, "z":  0} } ,
                { "id"  : "P", "name": "\u03C0", "color": "#0000CD", "val": 3, "type": NODE_TYPES.CORE, "layout": {"x":  90, "y":  0, "z":  0} }
            ],
            links : [
                //c-n
                { "id": "1", "source": "c", "target": "n", "name": "",          "type": LINK_TYPES.DASHED, "length": 100 },
                //R-L
                { "id": "4", "source": "R", "target": "L", "name": "Pulmonary", "type": LINK_TYPES.SEMICIRCLE, "length":  75 },
                { "id": "5", "source": "L", "target": "R", "name": "Systemic",  "type": LINK_TYPES.SEMICIRCLE, "length":  75 },
                //S-T
                { "id": "6", "source": "S", "target": "P", "name": "Gut",       "type": LINK_TYPES.SEMICIRCLE, "length":  90 },
                { "id": "7", "source": "P", "target": "S", "name": "Gut'",      "type": LINK_TYPES.SEMICIRCLE, "length":  90 }
            ]
        };
        //Demo2: split t-a and a-h links to 7 edges
        const ependymal = {
            nodes: [
                //t-a
                { "id" : "t1", "layout": {"y": 0, "z": 0} },
                { "id" : "t2", "layout": {"y": 0, "z": 0} },
                //a-h
                { "id" : "h1", "layout": {"y": 0, "z": 0} },
                { "id" : "h2", "layout": {"y": 0, "z": 0} },
                { "id" : "h3", "layout": {"y": 0, "z": 0} },
                //a-g
                { "id" : "g1", "layout": {"x": 0, "z": 0} },
                { "id" :  "g", "layout": {"x": 0, "y":  -30, "z":  0} }
            ],
            links: [
                //t-a
                { "id": "2a", "source":  "t", "target": "t1", "name": "Ependymal", "type": LINK_TYPES.LINK, "length":  7, "reversed": true },
                { "id": "2b", "source": "t1", "target": "t2", "name": "Ependymal", "type": LINK_TYPES.LINK, "length":  7, "reversed": true },
                { "id": "2c", "source": "t2", "target":  "a", "name": "Ependymal", "type": LINK_TYPES.LINK, "length":  7, "reversed": true },
                //a-h
                { "id": "3a", "source":  "a", "target": "h1", "name": "Ependymal", "type": LINK_TYPES.LINK, "length":  5, "reversed": true },
                { "id": "3b", "source": "h1", "target": "h2", "name": "Ependymal", "type": LINK_TYPES.LINK, "length":  5, "reversed": true },
                { "id": "3c", "source": "h2", "target": "h3", "name": "Ependymal", "type": LINK_TYPES.LINK, "length":  5, "reversed": true },
                { "id": "3d", "source": "h3", "target":  "h", "name": "Ependymal", "type": LINK_TYPES.LINK, "length":  5, "reversed": true },
                //a-g
                { "id": "3e", "source":  "a", "target": "g1", "name": "Ependymal", "type": LINK_TYPES.LINK, "length":  7 },
                { "id": "3f", "source": "g1", "target":  "g", "name": "Ependymal", "type": LINK_TYPES.LINK, "length":  7 }
            ]
        };

        //Add ependymal links to the model graph
        ependymal.nodes.forEach(node => coreGraphData.nodes.push(node));
        ependymal.links.forEach(link => coreGraphData.links.push(link));

        this._graphData.nodes = coreGraphData.nodes.map(node =>
            Node.fromJSON(node::assign({"charge": 10}))
        );
        this._graphData.links = coreGraphData.links.map(link => {
            if (link.type !== LINK_TYPES.DASHED) { link.linkMethod = "Line2" }
            return Link.fromJSON(link)
        });
    }


    afterInit(){
        //Color links and lyphs which do not have assigned colors yet
        addColor(this._graphData.links, "#000");
        addColor(this._lyphs);

        //TODO move ID to Object mapping to the model (set property interceptors)

        //Create lyph models from their json definitions
        this._graphData.lyphs = this._lyphs.map(lyph => Lyph.fromJSON(lyph));

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

        this._graphData.nodes.forEach(node =>
            node.layout::keys().forEach(key => {node.layout[key] *= scaleFactor; }));

        this._graphData.links.filter(link =>
            link.length).forEach(link => link.length *= 2 * scaleFactor);

    }

    get graphData(){
        return this._graphData;
    }

    get lyphs(){
        return this._lyphs;
    }
}
