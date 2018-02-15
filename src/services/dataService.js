import { LINK_TYPES, coreGraphData, addColor, createLyphModels } from '../models/utils';
import {cloneDeep} from 'lodash-bound';


/**
 * Create omega trees and lyphs tfor Kidney scenario
 * https://drive.google.com/file/d/0B89UZ62PbWq4ZkJkTjdkN1NBZDg/view
 */
export class DataService {

    constructor(){
        this._graphData = coreGraphData::cloneDeep();
        this._lyphs = [];
        this._coalescencePairs = [];
    }

    getLink(id) {
        return this._graphData.links.find(link => link.id === id);
    }

    getNode(id) {
        return this._graphData.nodes.find(node => node.id === id);
    }


    init(){
        this._coalescencePairs.forEach(({node1, node2}) => {
            this.getNode(node1).coalescence = node2;
            this.getNode(node2).coalescence = node1;
            this._graphData.links.push({
                "source": node1,
                "target": node2,
                "length": 0,
                "type": LINK_TYPES.COALESCENCE
            });
        });

        addColor(this._graphData.links, "#888");
        addColor(this._lyphs);
        createLyphModels(this._graphData.links, this._lyphs);

        console.log("Lyphs", this._lyphs);
        console.log("Graph", this._graphData);
    }

    get graphData(){
        return this._graphData;
    }

    get lyphs(){
        return this._lyphs;
    }
}