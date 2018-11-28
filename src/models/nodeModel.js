import {VisualResource} from './visualResourceModel';
import * as three from 'three';
const THREE = window.THREE || three;
import {copyCoords} from './utils';
import { MaterialFactory } from '../three/materialFactory';
import { getCenterOfMass } from '../three/utils';

/**
 * The class to visualize nodes in the process graphs
 */
export class Node extends VisualResource {

    /**
     * Determines whether the node's position is constrained in the model
     */
    get isConstrained() {
        return ((this.fixed && this.layout) ||
         (this.controlNodes && this.controlNodes.length > 0) ||
         (this.hostedBy && this.hostedBy.isVisible)  ||
         (this.internalIn   && this.internalIn.isVisible))
            ? true
            : false;
    }

    get polygonOffsetFactor() {
        let res = -10;
        ["hostedBy", "internalIn"].forEach((prop, i) => {
            if (this[prop]) {
                res = Math.min(res, this[prop].polygonOffsetFactor - i - 1);
            }
        });
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
        this.createLabels(state.labels[this.constructor.name], state.fontParams);
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

        if (this.fixed) { copyCoords(this, this.foci || this.layout); }

        if (this.controlNodes) {
            copyCoords(this, getCenterOfMass(this.controlNodes).multiplyScalar(2)); //double the distance from center
        }

        copyCoords(this.viewObjects["main"].position, this);

        this.updateLabels(state.labels[this.constructor.name], state.showLabels[this.constructor.name],
            this.viewObjects["main"].position.clone().addScalar(5 + this.val * state.nodeRelSize));
    }
}
