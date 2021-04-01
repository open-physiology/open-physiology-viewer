import {modelClasses} from "../model";
import {
    extractCoords,
    THREE,
    copyCoords,
} from "./utils";

import './lines/Line2.js';
import {MaterialFactory} from "./materialFactory";

const {VisualResource, Anchor} = modelClasses;

/**
 * Create visual resources for an anchor
 * @param state
 */
Anchor.prototype.createViewObjects = function(state){
    VisualResource.prototype.createViewObjects.call(this, state);
    if (!this.viewObjects["main"]) {
        let geometry = new THREE.CircleGeometry(10);
        let material = MaterialFactory.createMeshBasicMaterial({
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
 * Update visual resources for an anchor
 */
Anchor.prototype.updateViewObjects = function(state) {
    VisualResource.prototype.updateViewObjects.call(this, state);
    if (this.layout) {
        let coords = extractCoords(this.layout);
        coords.z = 1; //put anchors in front of regions
        copyCoords(this, coords);
    }
    copyCoords(this.viewObjects["main"].position, this);
    this.updateLabels( this.viewObjects["main"].position.clone().addScalar(this.state.labelOffset.Anchor));
};

Anchor.prototype.relocate = function(delta, updateDependent = true){
    let v = extractCoords(delta);
    let p0 = extractCoords(this);
    let p = p0.clone().add(v);
    copyCoords(this.layout, p);
    this.updateViewObjects(this.state);
    if (updateDependent) {
        (this.onBorder || []).forEach(region => region.resize(this, delta));
    }
    const updateWires = (wire, prop) => {
        wire.updateViewObjects(this.state);
        (wire[prop].sourceOf || []).forEach(w => w.updateViewObjects(this.state));
        (wire[prop].targetOf || []).forEach(w => w.updateViewObjects(this.state));
    }
    (this.sourceOf || []).forEach(wire => updateWires(wire, "target"));
    (this.targetOf || []).forEach(wire => updateWires(wire, "source"));
}

Object.defineProperty(Anchor.prototype, "polygonOffsetFactor", {
    get: function() { return -10; }
});