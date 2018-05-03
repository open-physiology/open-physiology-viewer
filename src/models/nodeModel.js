import { Entity } from './entityModel';
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
export class Node extends Entity {

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
}
