import { Model } from './model';
import { assign } from 'lodash-bound';
import * as three from 'three';
const THREE = window.THREE || three;
import { SpriteText2D } from 'three-text2d';
import { copyCoords } from '../three/utils';

export const NODE_TYPES = {
    CORE   : "core",
    CONTROL: "control",
    OMEGA: 'omega'
};

export class NodeModel extends Model {
    host;
    isRoot; //TODO remove when treeModel is completed
    layout; //Positioning constraints
    type;
    val;    //Currently used to compute radius

    toJSON() {
        let res = super.toJSON();
        res.host     = this.host;
        res.isRoot   = this.isRoot;
        res.layout   = this.layout;
        res.type     = this.type;
        res.val      = this.val;
        return res;
    }

    static fromJSON(json, modelClasses = {}) {
        json.class = json.class || "Node";
        const result = super.fromJSON(json, modelClasses);
        result::assign(json); //TODO pick only valid properties
        return result;
    }

    /**
     * Create visual objects to represent the model according to the user preferences
     * @param state
     */
    createViewObjects(state) {
        //Nodes
        if (!this.viewObjects["main"]) {
            let geometry = new THREE.SphereGeometry(Math.cbrt(this.val || 1) * state.nodeRelSize,
                state.nodeResolution, state.nodeResolution);
            if (!this.material){
                this.material = state.materialRepo.createMeshLambertMaterial({color: this.color});
            }
            let obj = new THREE.Mesh(geometry, this.material);
            // Attach node data
            obj.__data = this;
            this.viewObjects["main"] = obj;
        }

        //Labels
        this.labelObjects = this.labelObjects || {};

        if (!this.labelObjects[state.nodeLabel] && this[state.nodeLabel]) {
            this.labelObjects[state.nodeLabel] = new SpriteText2D(this[state.nodeLabel], state.fontParams);
        }

        if (this.labelObjects[state.nodeLabel]){
            this.viewObjects["label"] = this.labelObjects[state.nodeLabel];
        } else {
            delete this.viewObjects["label"];
        }
    }

    /**
     * Update type and positions of view objects in response to the graph state change
     * @param state
     */
    updateViewObjects(state){
        //Node
        if (!this.viewObjects["main"]
            || (!this.labelObjects[state.iconLabel] && this[state.nodeLabel])
        ){ this.createViewObjects(state); }

        //TODO move code to reposition dependent nodes here?

        copyCoords(this.viewObjects["main"].position, this);

        //Labels
        if (this.labelObjects[state.nodeLabel]){
            this.viewObjects['label'] = this.labelObjects[state.nodeLabel];
            this.viewObjects["label"].visible = state.showNodeLabel;
            copyCoords(this.viewObjects["label"].position, this.viewObjects["main"].position);
            this.viewObjects["label"].position.addScalar(15);
        } else {
            delete this.viewObjects['label'];
        }
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
