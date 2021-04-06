import {copyCoords, getCenterOfMass, THREE} from "./utils";
import {MaterialFactory} from "./materialFactory";
import {modelClasses} from "../model";
const {VisualResource, Node} = modelClasses;

/**
 * Create visual objects for a node
 * @param state
 */
Node.prototype.createViewObjects = function(state) {
    VisualResource.prototype.createViewObjects.call(this, state);
    if (this.invisible){ return; }
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
    this.createLabels();
};

/**
 * Update visual objects for a node
 */
Node.prototype.updateViewObjects = function(state) {
    VisualResource.prototype.updateViewObjects.call(this, state);
    if (this.anchoredTo){
        copyCoords(this, this.anchoredTo);
    } else {
        if (this.fixed) {
            copyCoords(this, this.layout);
        }
        if (this.controlNodes) {
            copyCoords(this, getCenterOfMass(this.controlNodes));
        }
    }
    if (!this.invisible) {
        copyCoords(this.viewObjects["main"].position, this);
        this.updateLabels( this.viewObjects["main"].position.clone().addScalar(this.state.labelOffset.Node));
    }
};

Object.defineProperty(Node.prototype, "polygonOffsetFactor", {
    get: function() { return 0; }
});
