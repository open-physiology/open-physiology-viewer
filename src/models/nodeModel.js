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

    createViewObjects(state) {
        if (!this.viewObjects["main"]) {
            let geometry = new THREE.SphereGeometry(Math.cbrt(this.val || 1) * state.nodeRelSize,
                state.nodeResolution, state.nodeResolution);
            let obj = new THREE.Mesh(geometry, state.materialRepo.getMeshLambertMaterial(this.color));
            obj.__data = this; // Attach node data
            this.viewObjects["main"] = obj;
        }

        if (!this.labelObjects) {
            this.labelObjects = {};
            ['id', 'name', 'external'].filter(label => this[label]).forEach(label =>
                this.labelObjects[label] = new SpriteText2D(this[label], state.fontParams));
        }
        if (this.labelObjects[state.nodeLabel]){
            this.viewObjects["label"] = this.labelObjects[state.nodeLabel];
        } else {
            delete this.viewObjects["label"];
        }
    }

    updateViewObjects(state){
        const obj = this.viewObjects["main"];
        if (!obj) return;
        copyCoords(obj.position, this);

        const objLabel = this.viewObjects["label"];
        if (objLabel) {
            objLabel.visible = state.showNodeLabel;
            copyCoords(objLabel.position, obj.position);
            objLabel.position.addScalar(15);
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
