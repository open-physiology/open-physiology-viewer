import { lyphs } from '../data/kidney-lyphs.json';
import { modelClasses } from '../models/utils';
import { NodeModel, NODE_TYPES } from '../models/nodeModel';
import { LinkModel, LINK_TYPES } from '../models/linkModel';

import {cloneDeep} from 'lodash-bound';
import {DataService} from './dataService';

const OMEGA_LINK_LENGTH = 3; //% from axis length


/**
 * Create omega trees and lyphs tfor Kidney scenario
 * https://drive.google.com/file/d/0B89UZ62PbWq4ZkJkTjdkN1NBZDg/view
 */
export class KidneyDataService extends DataService{

    constructor(){
        super();
        this._lyphs = lyphs::cloneDeep();
    }

    init(){
        super.init();
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
            //let hostLink = this.getLink(host);
            hosts[host].trees.forEach((tree, i) => {
                let lyphKeys = Object.keys(tree.lyphs);
                lyphKeys.forEach((key, j) => {
                    let node = NodeModel.fromJSON({
                        "id"       : `${host}${i}${j}`,
                        "host"     : host,
                        "isRoot"   : (j === 0),
                        "color"    : hosts[host].color
                    },  modelClasses);
                    //TODO save root in the treeModel
                    //TODO Make sure the data below is kept in the treeModel
                    //     "tree"  : ,
                    //     "level" : j + 1

                    this._graphData.nodes.push(node);
                });
            });
            //Create links for generated omega tree
            hosts[host].trees.forEach((tree, i) => {
                const NUM_LEVELS = Object.keys(tree.lyphs).length;
                Object.keys(tree.lyphs).forEach((key, j) => {
                    if (j === NUM_LEVELS - 1) { return; }
                    let link = LinkModel.fromJSON({
                        "id": (this._graphData.links.length + 1).toString(),
                        "source": `${host}${i}${j}`,
                        "target": `${host}${i}${j + 1}`,
                        //"level": j,
                        "external" : key,
                        "length": OMEGA_LINK_LENGTH,
                        "type": LINK_TYPES.LINK,
                        "conveyingLyph": tree.lyphs[key],
                        "color": hosts[host].color
                    }, modelClasses);
                    this._graphData.links.push(link);
                });
            })
        });

        //Connect leaves of two omega trees between nodes 506 and 515
        const connector       = ["506", "570", "571", "515"];
        const connector_lyphs = [{"H": "77"}, {"I": "63"}, {"J": "105"}];

        const CONNECTOR_COLOR = "#ff44ff";
        ["I", "J"].forEach((key, i) => {
            this._graphData.nodes.push(NodeModel.fromJSON({
                    "id"   : `57${i}`,
                    "color": CONNECTOR_COLOR}, modelClasses)
            );
        });

        for (let i = 0 ; i < connector.length - 1; i++){
            this._graphData.links.push(LinkModel.fromJSON({
                "id": (this._graphData.links.length + 1).toString(),
                "source": connector[i],
                "target": connector[i + 1],
                //"level": i,
                "external" : Object.keys(connector_lyphs[i])[0],
                "length": OMEGA_LINK_LENGTH * 1.2,
                "type": LINK_TYPES.LINK,
                "conveyingLyph": Object.values(connector_lyphs[i])[0],
                "color": CONNECTOR_COLOR
            }, modelClasses));
        }

        //Coalescences
        this._coalescencePairs = [
            //lyphs H~Q
            // {"node1": "506", "node2": "7017"},
            // {"node1": "570", "node2": "7016"},
            // {"node1": "571", "node2": "7014"},
            // {"node1": "515", "node2": "7013"}
        ];

        //Add link from center to the center of mass for a coalescence group
        this._graphData.nodes.push(NodeModel.fromJSON({
                "id"   : "k",
                "type" : NODE_TYPES.CONTROL,
                "controls" : ["S", "P", "R"]
            }, modelClasses)
        );

        this._graphData.links.push(LinkModel.fromJSON({
            "id": (this._graphData.links.length + 1).toString(),
            "source": "a",
            "target": "k",
            "length": 50,
            "type"  : LINK_TYPES.CONTAINER,
            "conveyingLyph"  : "1", //Kidney
            //"conveyingLyph"  : "5", //Kidney lobus
        }, modelClasses));

        //TODO replace to "5" KidneyLobus
        let containerLyph = this._lyphs.find(lyph => lyph.id === "1");
        containerLyph["boundaryNodes"]       = ["7013", "506", "515"];
        containerLyph["boundaryNodeBorders"] = [3, 3, 3];
        containerLyph["internalLyphs"]       = ["105", "63", "77", "24", "27", "30", "33"];

        super.afterInit();
    }
}