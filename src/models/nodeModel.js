import { VisualResource } from './visualResourceModel';
import { copyCoords } from './utils';
import { MaterialFactory } from '../three/materialFactory';
import { getCenterOfMass, THREE } from '../three/utils';

/**
 *  The class to visualize Node resources in the force-directed graphs
 * @class
 * @property {number} val
 * @property {Array<Node>} controlNodes
 * @property {Link} hostedBy
 * @property {Link} sourceOf
 * @property {Link} targetOf
 * @property {Shape} internalIn
 * @property {boolean} fixed
 * @property {Object} layout
 * @property {number} collide
 * @property {number} charge
 * @property {number} x
 * @property {number} y
 * @property {number} z
 */
export class Node extends VisualResource {

    /**
     * Determines whether the node's position is constrained in the model
     */
    get isConstrained() {
        return !!((this.fixed && this.layout) ||
            (this.controlNodes && this.controlNodes.length > 0) ||
            (this.hostedBy && this.hostedBy.isVisible) ||
            (this.internalIn && this.internalIn.isVisible));
    }

    get polygonOffsetFactor() {
        return Math.min(...["hostedBy", "internalIn"].map(prop => this[prop]?
            (this[prop].polygonOffsetFactor || 0) - 1: 0));
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
            let material = MaterialFactory.createMeshLambertMaterial({
                color: this.color,
                polygonOffsetFactor: this.polygonOffsetFactor
            });
            let obj = new THREE.Mesh(geometry, material);
            // Attach node data
            obj.userData = this;
            this.viewObjects["main"] = obj;
        }

        //Labels
        this.createLabels(state);
    }

    /**
     * Update type and positions of view objects in response to the graph state change
     * @param state
     */
    updateViewObjects(state) {
        //Node
        if (!this.viewObjects["main"] ||
            (!this.skipLabel && !this.labels[state.labels[this.constructor.name]] && this[state.labels[this.constructor.name]])) {
            this.createViewObjects(state);
        }

        if (this.fixed) { copyCoords(this, this.layout); }

        if (this.controlNodes) {
            copyCoords(this, getCenterOfMass(this.controlNodes).multiplyScalar(2)); //double the distance from center
        }

        copyCoords(this.viewObjects["main"].position, this);

        this.updateLabels(state,
            this.viewObjects["main"].position.clone().addScalar(1 + this.val * state.nodeRelSize));
    }
}
