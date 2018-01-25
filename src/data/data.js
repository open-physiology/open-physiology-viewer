export const coreGraphData = {
    nodes : [
        {   "id"  : "u", "name": "u",      "val" : 10, "color": "#D2691E", "graph": "A", "type": "+x"},
        {   "id"  : "n", "name": "n",      "val" : 10, "color": "#D2691E", "graph": "A", "type": "-x"},
        {   "id"  : "t", "name": "t",      "val" : 10, "color": "#808080", "graph": "B", "type": "-x"},
        {   "id"  : "a", "name": "a",      "val" : 10, "color": "#808080", "graph": "B", "type": "0"},
        {   "id"  : "h", "name": "h",      "val" : 10, "color": "#444444", "graph": "B", "type": "+x"},
        {   "id"  : "R", "name": "R",      "val" : 10, "color": "#ff0000", "graph": "C", "type": "-y" },
        {   "id"  : "L", "name": "L",      "val" : 10, "color": "#7B68EE", "graph": "C", "type": "+y"},
        {   "id"  : "S", "name": "\u03A3", "val" : 10, "color": "#006400", "graph": "D", "type": "-x"},
        {   "id"  : "P", "name": "\u03C0", "val" : 10, "color": "#0000CD", "graph": "D", "type": "+x"}
    ],
    links : [
        {  "id": 1, "source": "u", "target": "n", "name": "",          "type": "link", "length": 100 },
        {  "id": 2, "source": "t", "target": "a", "name": "Ependymal", "type": "link", "length": 40 , "lyph": 2 },
        {  "id": 3, "source": "a", "target": "h", "name": "Ependymal", "type": "link", "length": 40 , "lyph": 2 },
        {  "id": 4, "source": "R", "target": "L", "name": "Pulmonary", "type": "path", "length": 70 , "lyph": 3, "base": "y"},
        {  "id": 5, "source": "L", "target": "R", "name": "Systemic",  "type": "path", "length": 70 , "lyph": 4, "base": "y"},
        {  "id": 6, "source": "S", "target": "P", "name": "Gut",       "type": "path", "length": 90 , "lyph": 5 },
        {  "id": 7, "source": "P", "target": "S", "name": "Gut'",      "type": "path", "length": 90 , "lyph": 1 }
    ]
};

export const lyphs = {
    "1": {
        "id"    : 1,
        "name"  : "Gut'",
        "layers": [11, 12]
    },
    "2": {
        "id": 2,
        "name": "Ependymal",
        "layers": [21, 22]
    },
    "3": {
        "id": 3,
        "name": "Pulmonary",
        "layers": [31, 32]
    },
    "4": {
        "id": 4,
        "name": "Systemic",
        "layers": [41, 42]
    },
    "5": {
        "id": 5,
        "name": "Gut",
        "layers": [51, 52]
    },
    "11": {
        "id": 11,
        "name": "Gut' layer 1"
    },
    "12": {
        "id": 12,
        "name": "Gut' layer 2"
    },
    "21": {
        "id": 21,
        "name": "Ependymal layer 1"
    },
    "22": {
        "id": 22,
        "name": "Ependymal layer 2"
    },
    "31": {
        "id": 31,
        "name": "Pulmonary layer 1"
    },
    "32": {
        "id": 32,
        "name": "Pulmonary layer 2"
    },
    "41": {
        "id": 41,
        "name": "Systemic layer 1"
    },
    "42": {
        "id": 42,
        "name": "Systemic layer 2"
    },
    "51": {
        "id": 51,
        "name": "Gut layer 1"
    },
    "52": {
        "id": 52,
        "name": "Gut layer 2"
    }
};

export const omegaTrees = {
    nodes: [],
    links: [],
    trees: []
};

const roots = [];
let tree = 1;
let hosts = [4,5,6,7];
hosts.forEach(host => {
    for (let i = 1; i < 6; i++){
        for (let j = 0; j < 3; j++) {
            let node = {"id": `n${i}${j}`, "name": `n${i}${j}`, "tree": tree};
            if (j === 0){node.host =  host}
            omegaTrees.nodes.push(node);
            if (j > 0){
                let link = {"source": `n${i}${j-1}`, "target": `n${i}${j}`, "level": j, "length": 10};
                omegaTrees.links.push(link);
            }
        }
    }
    tree++;
});
