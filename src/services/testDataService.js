import { lyphs } from '../data/generated-lyphs.json';
import {cloneDeep} from 'lodash-bound';
import {DataService} from './dataService';
import { modelClasses } from '../models/utils';
import { NodeModel, NODE_TYPES } from '../models/nodeModel';
import { LinkModel, LINK_TYPES } from '../models/linkModel';

const OMEGA_LINK_LENGTH = 5; //% from axis length

export class TestDataService extends DataService{

    constructor(){
        super();
        this._lyphs = lyphs::cloneDeep();
    }

    /**
     * Prepare data for demo view showing 5 omega trees on each epithelial and each endothelial edge
     * Each omega tree has 3 nodes and a lyph on each edge
     * Coalescences are defined on some trees
     */
    init() {
        super.init();

        //Assign lyphs to the core graph edges
        const mapping = {
            "2": "2",
            "3": "2",
            "4": "3",
            "6": "5",
            "7": "1"};
        Object.keys(mapping).forEach(linkID => {
            this.getLink(linkID).conveyingLyph = mapping[linkID]
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
                        this._lyphs.push({ "id": `${host}_${i+1}${j}_${k}`});
                    }
                    this._lyphs.find(lyph => lyph.id === `${host}_${i+1}${j}_0`).layers = [
                        `${host}_${i+1}${j}_1`,
                        `${host}_${i+1}${j}_2`
                    ];
                }
            }
        });

        //Omega trees for demo layout, 5 trees per edge
        Object.keys(hosts).forEach((host, tree) => {
            const hostLink = this.getLink(host);
            if (!hostLink) { return; }
            for (let i = 0; i < NUM_OMEGA_TREES; i++) {
                for (let j = 0; j < NUM_LEVELS; j++) {
                    let node = NodeModel.fromJSON({
                        "id"    : `n${host}_${i+1}${j}`,
                        //"tree"  : tree + 1, //TODO save in Tree (each node can be in many trees)
                        "host"  : host,
                        "type"  : NODE_TYPES.OMEGA,
                        "isRoot": (j === 0),
                        "color" : hosts[host].color,
                        "layout": {}
                    }, modelClasses);
                    if (j === NUM_LEVELS - 1){
                        node["layout"].r = hostLink.length*(1 + 0.5 * hosts[host].sign)
                    }
                    this._graphData.nodes.push(node);
                }
            }
            for (let i = 0; i < NUM_OMEGA_TREES; i++) {
                for (let j = 0; j < NUM_LEVELS - 1; j++) {
                    this._graphData.links.push(LinkModel.fromJSON({
                        "source": `n${host}_${i+1}${j}`,
                        "target": `n${host}_${i+1}${j + 1}`,
                        //"level": j,
                        "length": OMEGA_LINK_LENGTH,
                        "type": LINK_TYPES.LINK,
                        "conveyingLyph": `${host}_${i+1}${j}_0`,
                        "color": hosts[host].color
                    }, modelClasses));
                }
            }
        });

        //Coalescences
        this._coalescencePairs = [
            {"node1": "n5_12", "node2": "n7_41"},
            {"node1": "n5_11", "node2": "n7_42"},
            {"node1": "n5_22", "node2": "n7_51"},
            {"node1": "n5_21", "node2": "n7_52"}
        ];

       super.afterInit();
    }
}