export const dataSetMain = {
    nodes : [
        {   "id"  : "node_u", "name": "u", "val" : 10, "color": "#D2691E", "graph": "A", "type": "+x"},
        {   "id"  : "node_n", "name": "n", "val" : 10, "color": "#D2691E", "graph": "A", "type": "-x"},
        {   "id"  : "node_t", "name": "t", "val" : 10, "color": "#808080", "graph": "B", "type": "-x"},
        {   "id"  : "node_a", "name": "a", "val" : 10, "color": "#808080", "graph": "B", "type": "0"},
        {   "id"  : "node_h", "name": "h", "val" : 10, "color": "#444444", "graph": "B", "type": "+x"},
        {   "id"  : "node_R", "name": "R", "val" : 10, "color": "#ff0000", "graph": "C", "type": "-y" },
        {   "id"  : "node_L", "name": "L", "val" : 10, "color": "#7B68EE", "graph": "C", "type": "+y"},
        {   "id"  : "node_S", "name": "\u03A3", "val" : 10, "color": "#006400", "graph": "D", "type": "-x"},
        {   "id"  : "node_P", "name": "\u03C0", "val" : 10, "color": "#0000CD", "graph": "D", "type": "+x"}
    ],
    links : [
        {   "source": "node_u", "target": "node_n", "name": "",          "type": "link", "length": 100 },
        {   "source": "node_t", "target": "node_a", "name": "Ependymal", "type": "link", "length": 30 , "lyph": 2 },
        {   "source": "node_a", "target": "node_h", "name": "Ependymal", "type": "link", "length": 30 , "lyph": 2 },
        {   "source": "node_R", "target": "node_L", "name": "Pulmonary", "type": "path", "length": 70 , "lyph": 3 },
        {   "source": "node_L", "target": "node_R", "name": "Systemic",  "type": "path", "length": 70 , "lyph": 4 },
        {   "source": "node_S", "target": "node_P", "name": "Gut",       "type": "path", "length": 90 , "lyph": 5 },
        {   "source": "node_P", "target": "node_S", "name": "Gut'",      "type": "path", "length": 90 , "lyph": 1 }
    ]
};
