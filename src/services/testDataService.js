import { lyphs } from '../data/generated-lyphs.json';
import { LINK_TYPES, OMEGA_LINK_LENGTH, coreGraphData, getLink, getNode, addColor, createLyphModels } from './utils';
import {cloneDeep} from 'lodash-bound';

export class TestDataService {

    constructor(){
        this._graphData = coreGraphData::cloneDeep();
    }

    /**
     * Prepare data for demo view showing 5 omega trees on each epithelial and each endothelial edge
     * Each omega tree has 3 nodes and a lyph on each edge
     * Coalescences are defined on some trees
     */
    init() {
        //Assign lyphs to the core graph edges
        const mapping = {
            "2": "2",
            "3": "2",
            "4": "3",
            "6": "5",
            "7": "1"};
        Object.keys(mapping).forEach(linkID => {
            getLink(linkID).lyph = mapping[linkID]
        });

        const hosts = {
            "4": {
                "color": "#4444ff",
                "sign" : -1
            },
            "5": {
                "color": "#4444ff",
                "sign" : -1
            },
            "6": {
                "color": "#ff4444",
                "sign" :  1},
            "7": {
                "color": "#ff4444",
                "sign" : 1
            }
        };

        const NUM_OMEGA_TREES = 5;
        const NUM_LEVELS = 3;
        const NUM_LAYERS = 2;

        //Lyphs for omega trees
        Object.keys(hosts).forEach((host) => {
            for (let i = 0; i < NUM_OMEGA_TREES; i++) {
                for (let j = 0; j < NUM_LEVELS - 1; j++) {//
                    for (let k = 0; k < NUM_LAYERS + 1; k++) {//Create host lyph and its two layers
                        let id = `${host}_${i+1}${j}_${k}`;
                        lyphs.push({ "id": id, "name": id });
                    }
                    lyphs.find(lyph => lyph.id === `${host}_${i+1}${j}_0`).layers = [
                        `${host}_${i+1}${j}_1`,
                        `${host}_${i+1}${j}_2`
                    ];
                }
            }
        });

        //Omega trees for demo layout, 5 trees per edge
        Object.keys(hosts).forEach((host, tree) => {
            const hostLink = getLink(host);
            if (!hostLink) { return; }
            for (let i = 0; i < NUM_OMEGA_TREES; i++) {
                for (let j = 0; j < NUM_LEVELS; j++) {
                    this._graphData.nodes.push({
                        "id": `n${host}_${i+1}${j}`,
                        "name": `n${host}_n${i+1}${j}`,
                        "tree": tree + 1,
                        "level": j,
                        "host": host,
                        "isRoot": (j === 0),
                        "color": hosts[host].color,
                        "radialDistance": hostLink.length + hosts[host].sign * OMEGA_LINK_LENGTH * j
                    });
                }
            }
            for (let i = 0; i < NUM_OMEGA_TREES; i++) {
                for (let j = 0; j < NUM_LEVELS - 1; j++) {
                    this._graphData.links.push({
                        "source": `n${host}_${i+1}${j}`,
                        "target": `n${host}_${i+1}${j + 1}`,
                        "level": j,
                        "length": OMEGA_LINK_LENGTH,
                        "type": LINK_TYPES.LINK,
                        "lyph": `${host}_${i+1}${j}_0`,
                        "color": hosts[host].color
                    });
                }
            }
        });

        //Coalescences
        const coalescencePairs = [
            {"node1": "n4_12", "node2": "n7_41"},
            {"node1": "n4_11", "node2": "n7_42"},
            {"node1": "n4_22", "node2": "n7_51"},
            {"node1": "n4_21", "node2": "n7_52"},

        ];
        coalescencePairs.forEach(({node1, node2}) => {
            getNode(node1).coalescence = node2;
            getNode(node2).coalescence = node1;
            this._graphData.links.push({
                "source": node1,
                "target": node2,
                "length": 0,
                "type": LINK_TYPES.COALESCENCE
            });
        });

        addColor(this._graphData.links, "#888");
        addColor(lyphs);
        createLyphModels(this._graphData.links, lyphs);

        console.log("Lyphs", lyphs);
        console.log("Graph", this._graphData);
    }

    get graphData(){
        return this._graphData;
    }
}