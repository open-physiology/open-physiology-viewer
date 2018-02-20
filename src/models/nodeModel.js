import { Model } from './model';
import { assign } from 'lodash-bound';

export class NodeModel extends Model {
    isRoot; //TODO remove when treeModel is completed
    layout; //Positioning constraints

    toJSON() {
        let res = super.toJSON();
        res.isRoot   = this.isRoot;
        res.layout   = this.layout;
        return res;
    }

    static fromJSON(json, {modelClasses, modelsById} = {}) {
        json.class = json.class || "Node";
        const result = super.fromJSON(json, {modelClasses, modelsById});
        result::assign(json); //TODO use pick to choose only valid properties
        return result;
    }

    //A node can be a root of a given tree
    // isRoot(tree){
    //     let node = tree.nodes.find(node => node.id === this.id) || {id: undefined} ;
    //     return node.id === tree.root;
    // }


    /**
     * @param tree
     * @returns {number} node's level in the tree
     */
    level(tree){
        return -1;
    }
}
