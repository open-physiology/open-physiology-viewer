export const dataSet={
    "A": {
        "label": "A",
        "name" : "Axial",
        "nodes": [
            {   "id"  : "node_u", "name": "u", "val" : 10, "color": "#D2691E"},
            {   "id"  : "node_n", "name": "n", "val" : 10, "color": "#D2691E"}
        ],
        "links": [
            {   "source": "node_u", "target": "node_n", "name": "Axial", "type": "link"}
        ]
    },
    "B": {
        "label": "B",
        "name" : "Ependymal",
        "nodes": [
            {   "id"  : "node_t", "name": "t", "val" : 10, "color": "#808080"},
            {   "id"  : "node_a", "name": "a", "val" : 10, "color": "#808080"},
            {   "id"  : "node_h", "name": "h", "val" : 10, "color": "#444444"}
        ],
        "links": [
            {   "source": "node_t", "target": "node_a", "name": "Ependymal", "type": "link"},
            {   "source": "node_a", "target": "node_h", "name": "Ependymal", "type": "link"}
        ]
    },
    "C": {
        "label": "C",
        "name" : "Endhotelial",
        "nodes": [
            {   "id"  : "node_R", "name": "R", "val" : 10, "color": "#ff0000"},
            {   "id"  : "node_L", "name": "L", "val" : 10, "color": "#7B68EE"}

        ],
        "links": [
            {   "source": "node_R", "target": "node_L", "name": "Pulmonary", "type": "path"},
            {   "source": "node_L", "target": "node_R", "name": "Systemic", "type": "path"}
        ]
    },
    "D": {
        "label": "D",
        "name" : "Epithelial",
        "nodes": [
            {   "id"  : "node_S", "name": "\u03A3", "val" : 10, "color": "#006400"},
            {   "id"  : "node_P", "name": "\u03C0", "val" : 10, "color": "#0000CD"}
        ],
        "links": [
            {   "source": "node_S", "target": "node_P", "name": "Gut", "type": "path"},
            {   "source": "node_P", "target": "node_S", "name": "Gut'", "type": "path"}
        ]
    }
};

export const dataSetOne={
        "nodes": [
            {   "id"  : "node_u", "name": "u", "val" : 10, "color": "#D2691E", "graph": "A", "type": "+"},
            {   "id"  : "node_n", "name": "n", "val" : 10, "color": "#D2691E", "graph": "A", "type": "-"},
            {   "id"  : "node_t", "name": "t", "val" : 10, "color": "#808080", "graph": "B", "type": "-"},
            {   "id"  : "node_a", "name": "a", "val" : 10, "color": "#808080", "graph": "B", "type": "0"},
            {   "id"  : "node_h", "name": "h", "val" : 10, "color": "#444444", "graph": "B", "type": "+"},
            {   "id"  : "node_R", "name": "R", "val" : 10, "color": "#ff0000", "graph": "C", "type": "-" },
            {   "id"  : "node_L", "name": "L", "val" : 10, "color": "#7B68EE", "graph": "C", "type": "+"},
            {   "id"  : "node_S", "name": "\u03A3", "val" : 10, "color": "#006400", "graph": "D", "type": "-"},
            {   "id"  : "node_P", "name": "\u03C0", "val" : 10, "color": "#0000CD", "graph": "D", "type": "+"}
        ],
        "links": [
            {   "source": "node_u", "target": "node_n", "name": "Axial",     "type": "link"},
            {   "source": "node_t", "target": "node_a", "name": "Ependymal", "type": "link"},
            {   "source": "node_a", "target": "node_h", "name": "Ependymal", "type": "link"},
            {   "source": "node_R", "target": "node_L", "name": "Pulmonary", "type": "path"},
            {   "source": "node_L", "target": "node_R", "name": "Systemic",  "type": "path"},
            {   "source": "node_S", "target": "node_P", "name": "Gut",       "type": "path"},
            {   "source": "node_P", "target": "node_S", "name": "Gut'",      "type": "path"}
        ],
        "labels": {
            "A": "Axial",
            "B": "Ependymal",
            "C": "Endhotelial",
            "D": "Epithelial"
        }
    };