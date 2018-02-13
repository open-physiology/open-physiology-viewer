import { schemePaired } from 'd3-scale-chromatic';
import {LyphModel} from './lyphModel';
const colors = schemePaired;

export const LINK_TYPES = {
  PATH: "path",
  LINK: "link",
  AXIS: 'axis',
  COALESCENCE: "coalescence"
};

export const OMEGA_LINK_LENGTH = 4;

export const coreGraphData = {
    nodes : [
        {   "id"  : "c", "name": "c",      "val" : 10, "color": "#D2691E", "graph": "A", "layout": {"x":  100} },
        {   "id"  : "n", "name": "n",      "val" : 10, "color": "#D2691E", "graph": "A", "layout": {"x": -100} },
        {   "id"  : "t", "name": "t",      "val" : 10, "color": "#808080", "graph": "B", "layout": {"x":  -60} },
        {   "id"  : "a", "name": "a",      "val" : 10, "color": "#808080", "graph": "B", "layout": {"x":    0}},
        {   "id"  : "h", "name": "h",      "val" : 10, "color": "#444444", "graph": "B", "layout": {"x":   60} },
        {   "id"  : "R", "name": "R",      "val" : 10, "color": "#ff0000", "graph": "C", "layout": {"y":   75, "z": -25} },
        {   "id"  : "L", "name": "L",      "val" : 10, "color": "#7B68EE", "graph": "C", "layout": {"y":  -75, "z": 25} },
        {   "id"  : "S", "name": "\u03A3", "val" : 10, "color": "#006400", "graph": "D", "layout": {"x":  -90} } ,
        {   "id"  : "P", "name": "\u03C0", "val" : 10, "color": "#0000CD", "graph": "D", "layout": {"x":   90} }
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

export const getLink = id => coreGraphData.links.find(link => link.id === id);

export const getNode = id => coreGraphData.nodes.find(node => node.id === id);

export const addColor = (array, defaultColor) =>
    array.filter(obj => !obj.color)
        .forEach((obj, i) => { obj.color = defaultColor || colors[i % colors.length] });

const modelClasses = {"Lyph": LyphModel};
const modelsById = {};

export const createLyphModels = (links, lyphs) => {
    lyphs.forEach(lyph => {
        lyph.class = "Lyph";
        modelsById[lyph.id] = LyphModel.fromJSON(lyph, {modelClasses, modelsById: modelsById});
    });
    lyphs.filter(lyph => lyph.layers).forEach(lyph => {
        lyph.layerModels = lyph.layers.map(layer => modelsById[layer]);
        modelsById[lyph.id] = LyphModel.fromJSON(lyph, {modelClasses, modelsById: modelsById});
    });

    links.forEach(link => {
        link.lyphModel = modelsById[link.lyph]
    });
} ;