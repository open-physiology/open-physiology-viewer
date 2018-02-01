const LINK_TYPES = {
  PATH: "path",
  LINK: "link",
  COALESCENCE: "coalescence"
};

const lyphs = {
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

//TODO extract domain data from coreGraph
//const coreProcesses = {};
//const omegaTrees = {};

const coreGraphData = {
    nodes : [
        {   "id"  : "c", "name": "c",      "val" : 10, "color": "#D2691E", "graph": "A", "layout": {"x":  100} },
        {   "id"  : "n", "name": "n",      "val" : 10, "color": "#D2691E", "graph": "A", "layout": {"x": -100} },
        {   "id"  : "t", "name": "t",      "val" : 10, "color": "#808080", "graph": "B", "layout": {"x":  -60} },
        {   "id"  : "a", "name": "a",      "val" : 10, "color": "#808080", "graph": "B", "layout": {"x":    0}},
        {   "id"  : "h", "name": "h",      "val" : 10, "color": "#444444", "graph": "B", "layout": {"x":   60} },
        {   "id"  : "R", "name": "R",      "val" : 10, "color": "#ff0000", "graph": "C", "layout": {"y":  -75, "z":  25} },
        {   "id"  : "L", "name": "L",      "val" : 10, "color": "#7B68EE", "graph": "C", "layout": {"y":   75, "z": -25} },
        {   "id"  : "S", "name": "\u03A3", "val" : 10, "color": "#006400", "graph": "D", "layout": {"x":  -90} } ,
        {   "id"  : "P", "name": "\u03C0", "val" : 10, "color": "#0000CD", "graph": "D", "layout": {"x":   90} }
    ],
    links : [
        {  "id": 1, "source": "c", "target": "n", "name": "",          "type": LINK_TYPES.LINK, "length": 100 },
        {  "id": 2, "source": "t", "target": "a", "name": "Ependymal", "type": LINK_TYPES.LINK, "length": 30 , "lyph": 2 },
        {  "id": 3, "source": "a", "target": "h", "name": "Ependymal", "type": LINK_TYPES.LINK, "length": 30 , "lyph": 2 },
        {  "id": 4, "source": "R", "target": "L", "name": "Pulmonary", "type": LINK_TYPES.PATH, "length": 75 , "lyph": 3 },
        {  "id": 5, "source": "L", "target": "R", "name": "Systemic",  "type": LINK_TYPES.PATH, "length": 75 , "lyph": 4 },
        {  "id": 6, "source": "S", "target": "P", "name": "Gut",       "type": LINK_TYPES.PATH, "length": 90 , "lyph": 5 },
        {  "id": 7, "source": "P", "target": "S", "name": "Gut'",      "type": LINK_TYPES.PATH, "length": 90 , "lyph": 1 }
    ]
};

function generateLyphs(){
    //lyphs for omega trees
    let hosts = [4,5,6,7];
    hosts.forEach((host, tree) => {
        for (let i = 1; i < 6; i++){
            for (let j = 0; j < 2; j++) {
                for (let k = 0; k < 3; k++){
                    let id = `${host}_${i}${j}_${k}`;
                    let lyph = {
                        "id": id,
                        "name": id
                    };
                    lyphs[id] = lyph;
                }
                let parent = `${host}_${i}${j}_0`;
                let layer1 = `${host}_${i}${j}_1`;
                let layer2 = `${host}_${i}${j}_2`;
                lyphs[parent].layers = [layer1, layer2];
            }
        }
    });
}

function generateOmegaTrees() {
    const hosts = [4,5,6,7];
    const omegaLinkLength = 5;
    hosts.forEach((host, tree) => {
        const hostLink = coreGraphData.links.find(link => link.id === host);
        if (!hostLink) {return; }
        for (let i = 1; i < 6; i++){
            for (let j = 0; j < 3; j++) {
                let node = {
                    "id"   : `n${host}_${i}${j}`,
                    "name" : `n${host}_n${i}${j}`,
                    "tree" : tree + 1,
                    "level": j,
                    "host": host,
                    "isRoot": (j === 0),
                    "color": (host === 4 || host === 5)? "#4444ff": "#ff4444",
                    "radialDistance": hostLink.length + ((host === 4 || host === 5)? -j: j) * omegaLinkLength * 2
                };
                coreGraphData.nodes.push(node);
            }
        }
        for (let i = 1; i < 6; i++){
            for (let j = 0; j < 2; j++) {
                let link = {
                    "source": `n${host}_${i}${j}`,
                    "target": `n${host}_${i}${j + 1}`,
                    "level": j,
                    "length": omegaLinkLength,
                    "type": LINK_TYPES.LINK,
                    "lyph": `${host}_${i}${j}_0`,
                    "color": (host === 4 || host === 5)? "#4444ff": "#ff4444"
                };
                coreGraphData.links.push(link);
            }
        }
    });
    //coalescence
    const coalescencePairs = [
        {"node1": "n4_12", "node2": "n7_41"},
        {"node1": "n4_11", "node2": "n7_42"},
        {"node1": "n4_22", "node2": "n7_51"},
        {"node1": "n4_21", "node2": "n7_52"},

    ];

    coalescencePairs.forEach(({node1, node2}) => {
            coreGraphData.nodes.find(d => d.id === node1).coalescence = node2;
            coreGraphData.nodes.find(d => d.id === node2).coalescence = node1;
            coreGraphData.links.push({
                "source": node1,
                "target": node2,
                "length": 0,
                "type": LINK_TYPES.COALESCENCE});
        }
    );

    coreGraphData.links.filter(link => !link.color).forEach(link => link.color = "#888");
}

generateLyphs();
generateOmegaTrees();

console.log("Lyphs", lyphs);
console.log("Graph", coreGraphData);

export {coreGraphData, lyphs, LINK_TYPES}
