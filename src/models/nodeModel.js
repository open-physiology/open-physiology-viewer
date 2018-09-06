import { Entity } from './entityModel';
import * as three from 'three';
const THREE = window.THREE || three;
import { copyCoords } from './utils';

/**
 * Recognized set of node visualization options (optional)
 * @type {{CORE: string, FIXED: string, CONTROL: string}}
 */
export const NODE_TYPES = {
    CORE    : "core",     //node with given position constraints, satisfied by force-directed layout
    FIXED   : "fixed"     //node with fixed position, given position overrules forces
};

/**
 * The class to visualize nodes in the process graphs
 */
export class Node extends Entity {

    /**
     * Determines whether the node's position is constrained in the model
     */
    get isConstrained(){
        return (this.type === NODE_TYPES.CORE ||
             this.type === NODE_TYPES.FIXED   ||
            (this.controlNodes && this.controlNodes.length > 0) ||
            (this.host && this.host.isVisible) ||
            (this.internalNodeInLyph && this.internalNodeInLyph.isVisible));
    }

    get polygonOffsetFactor(){
        return -100;
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
                    polygonOffsetFactor: this.polygonOffsetFactor
                });
            }
            let obj = new THREE.Mesh(geometry, this.material);
            // Attach node data
            obj.__data = this;
            this.viewObjects["main"] = obj;
        }

        //Labels
        this.createLabels(state.labels[this.constructor.name], state.fontParams);
    }

    /**
     * Update type and positions of view objects in response to the graph state change
     * @param state
     */
    updateViewObjects(state){
        //Node
        if (!this.viewObjects["main"] ||
            (!this.skipLabel && !this.labels[state.labels[this.constructor.name]] && this[state.labels[this.constructor.name]])){
            this.createViewObjects(state);
        }

        if (this.type === NODE_TYPES.FIXED) {
            //Replace node coordinates with given ones
            copyCoords(this, this.layout);
        }

        if (this.controlNodes){
            let middle = new THREE.Vector3(0, 0, 0);
            this.controlNodes.forEach(p => {middle.x += p.x; middle.y += p.y; middle.z += p.z});
            middle = middle.multiplyScalar(1.0 / (this.controlNodes.length || 1));
            copyCoords(this, middle.clone().multiplyScalar(2)); //double the distance from center
        }

        copyCoords(this.viewObjects["main"].position, this);

        this.updateLabels(state.labels[this.constructor.name], state.showLabels[this.constructor.name],
            this.viewObjects["main"].position.clone().addScalar(5 + this.val * state.nodeRelSize));
    }
}
