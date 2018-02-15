import { lyphs } from '../data/kidney-lyphs.json';
import { LINK_TYPES, coreGraphData, getLink, getNode, addColor, createLyphModels } from '../models/utils';
import {cloneDeep} from 'lodash-bound';

const OMEGA_LINK_LENGTH = 3; //% from axis length


/**
 * Create omega trees and lyphs tfor Kidney scenario
 * https://drive.google.com/file/d/0B89UZ62PbWq4ZkJkTjdkN1NBZDg/view
 */
export class KidneyDataService {

    constructor(){
        this._graphData = coreGraphData::cloneDeep();
        this._lyphs = lyphs::cloneDeep();
    }

    init(){
        //Assign lyphs to the core graph edges
        //Kidney id = 1, attached to Gut'
        //this._graphData.links[6].lyph = 1;
        //Layers of Kidney: capsule – 4, parencyma – 3, hilum – 2,
        //Inside parencyma: lobus – 5, layers of lobus: medula – 7, cortex - 6

        const hosts = {
            "5": {
                "color": "#4444ff",
                "sign" : -1,
                "trees": [
                    {"lyphs": {"B" : "99", "C" : "114", "D" : "51", "E" : "54", "F" : "57", "G" : "60", "H" : "77"}},
                    {"lyphs": {"P" : "102", "O" : "107", "N" : "75", "M" : "72", "L" : "69", "K" : "66"}}
                ]
            },
            "7": {
                "color": "#ff4444",
                "sign" : 1,
                "trees": [
                    {"lyphs": {"B" : "108", "C": "111", "D": "81", "E": "84", "F": "87", "F'": "90", "G" : "93", "H": "94",
                        "I" : "48", "J": "45", "K": "42", "L": "39", "M": "36", "N" : "33", "O": "30", "P": "27", "Q": "24", "end": "0"}
                    }
                ]
            }
        };


        //Omega tree nodes
        Object.keys(hosts).forEach((host) => {
            let hostLink = getLink(host);
            hosts[host].trees.forEach((tree, i) => {
                let lyphKeys = Object.keys(tree.lyphs);
                lyphKeys.forEach((key, j) => {
                    let node = {
                        "id": `n${host}_${i}_${j}`,
                        "name": key,
                        "tree": i,
                        "level": j + 1,
                        "host": hostLink.id,
                        "isRoot": (j === 0),
                        "color": hosts[host].color};
                    //if (j === lyphKeys.length - 1) {
                        node["radialDistance"] = hostLink.length * (1 + 0.8 * hosts[host].sign * j / lyphKeys.length);
                    //}
                    this._graphData.nodes.push(node);
                });
            });
            //Create links for generated omega tree
            hosts[host].trees.forEach((tree, i) => {
                const NUM_LEVELS = Object.keys(tree.lyphs).length;
                Object.keys(tree.lyphs).forEach((key, j) => {
                    if (j === NUM_LEVELS - 1) { return; }
                    this._graphData.links.push({
                        "source": `n${host}_${i}_${j}`,
                        "target": `n${host}_${i}_${j + 1}`,
                        "level": j,
                        "length": OMEGA_LINK_LENGTH,
                        "type": LINK_TYPES.LINK,
                        "lyph": tree.lyphs[key],
                        "color": hosts[host].color
                    });
                });
            })
        });

        //TODO make less prone to code modification errors (e.g., change of node names)
        const CONNECTOR_COLOR = "#ff44ff";
        ["I", "J"].forEach(key => {
            this._graphData.nodes.push({
                    "id": `n${key}`,
                    "name": key,
                    "color": CONNECTOR_COLOR
                }
            );
        });
        const host = "5";
        const leaf1 = Object.keys(hosts[host].trees[0].lyphs).length - 1;
        const leaf2 = Object.keys(hosts[host].trees[1].lyphs).length - 1;
        const connector = [`n${host}_0_${leaf1}`, "nI", "nJ", `n${host}_1_${leaf2}`];
        const connector_lyphs = ["77", "63", "105", "66"];
        for (let i = 0 ; i < connector.length - 1; i++){
            this._graphData.links.push({
                "source": connector[i],
                "target": connector[i + 1],
                "level": i,
                "length": OMEGA_LINK_LENGTH,
                "type": LINK_TYPES.LINK,
                "lyph": connector_lyphs[i],
                "color": CONNECTOR_COLOR
            });
        }

        addColor(this._graphData.links, "#888");
        addColor(this._lyphs);
        createLyphModels(this._graphData.links, this._lyphs);

        console.log("Kidney lyphs", this._lyphs);
        console.log("Kidney graph", this._graphData);
    }

    get graphData(){
        return this._graphData;
    }
}