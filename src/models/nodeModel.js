import { Model } from './model';
import { assign } from 'lodash-bound';
import * as three from 'three';
const THREE = window.THREE || three;
import { copyCoords } from '../three/utils';

export const NODE_TYPES = {
    FIXED  : "fixed",
    CORE   : "core",
    CONTROL: "control",
    OMEGA  : 'omega',
    BORDER : "border",
    CENTER : "center",
    INTERNAL: "internal"
};

/**
 * ApiNATOMY node
 */
export class NodeModel extends Model {
    host;
    isRoot; //TODO remove when treeModel is completed
    layout; //Positioning constraints
    type;
    val;    //Currently used to compute radius
    x; y; z;

    constructor(id) {
        super(id);
        this.infoFields.text.push ('host', 'type');
        this.val = this.val || 1; // Defines default radius
        this.links = [];
    }

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
        json.links = json.links || []; //TODO replace with Set?
        const result = super.fromJSON(json, modelClasses);
        result::assign(json); //TODO pick only valid properties
        return result;
    }

    get sourceInLinks(){
        return this.links.filter(link => link.source && link.source.id === this.id);
    }

    get targetInLinks(){
        return this.links.filter(link => link.target && link.target.id === this.id);
    }

    /**
     * Create visual objects to represent the model according to the user preferences
     * @param state
     */
    createViewObjects(state) {
        //Nodes
        if (!this.viewObjects["main"]) {
            let geometry = new THREE.SphereGeometry(this.val * state.nodeRelSize,
                state.nodeResolution, state.nodeResolution);
            if (!this.material){
                this.material = state.materialRepo.createMeshLambertMaterial({
                    color: this.color,
                    polygonOffsetFactor: -100 //Draw nodes in front of lyphs
                });
            }
            let obj = new THREE.Mesh(geometry, this.material);
            // Attach node data
            obj.__data = this;
            this.viewObjects["main"] = obj;
        }

        //Labels
        this.createLabels(state.nodeLabel, state.fontParams);
    }

    /**
     * Update type and positions of view objects in response to the graph state change
     * @param state
     */
    updateViewObjects(state){
        //Node
        if (!this.viewObjects["main"] ||
            (!this.skipLabel && !this.labels[state.iconLabel] && this[state.nodeLabel])){
            this.createViewObjects(state);
        }

        switch(this.type){
            case NODE_TYPES.FIXED: {
                //Replace node coordinates with given ones
                copyCoords(this, this.layout);
                break;
            }
            case NODE_TYPES.CONTROL: {
                //Redefine position of the control node
                let controlNodes = state.graphData.nodes.filter(node => (this.controlNodes || []).includes(node.id));
                if (controlNodes){
                    let middle = new THREE.Vector3(0, 0, 0);
                    controlNodes.forEach(p => {middle.x += p.x; middle.y += p.y; middle.z += p.z});
                    middle = middle.multiplyScalar(1.0 / (controlNodes.length || 1));
                    copyCoords(this, middle.clone().multiplyScalar(2)); //double the distance from center
                }
                break;
            }
        }
        copyCoords(this.viewObjects["main"].position, this);

        this.updateLabels(state.nodeLabel, state.showNodeLabel,
            this.viewObjects["main"].position.clone().addScalar(5 + this.val * state.nodeRelSize));
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
