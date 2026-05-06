import {modelClasses} from "../model";
import {copyCoords, direction, THREE} from "./utils";

const {StratifiedRegion, Stratification, VisualResource} = modelClasses;

/**
 * Create visual objects for a stratified region
 * @param state
 */
StratifiedRegion.prototype.createViewObjects = function(state) {
    if (this.supertype) {
        // Use a consistent color for all regions with the same supertype if not specified
        this.color = this.color || this.supertype.color;
        this.viewObjects['main'] = Stratification.prototype.createViewObjects.call(this.supertype, {
            ...state,
            reversed: this.axisWire?.reversed
        });
        this.viewObjects['main'].userData = this;
        (this.viewObjects['main'].children || []).forEach(child => {
            if (child.userData && child.userData.host === this.supertype) {
                child.userData.host = this;
            }
        });
        state.graphScene.add(this.viewObjects['main']);
    }
};

/**
 * Update visual objects for the stratification
 */
StratifiedRegion.prototype.updateViewObjects = function(state) {
    VisualResource.prototype.updateViewObjects.call(this, state);

    if (!this.viewObjects["main"]) {
       this.createViewObjects(state);
    }
    const obj = this.viewObjects["main"];
    if (!obj) { return; }
    obj.visible = this.isVisible && state.showStratifiedRegions;
    const wire = this.axisWire;
    if (wire && wire.viewObjects && wire.viewObjects["main"]) {
        copyCoords(obj.position, wire.center || wire.viewObjects["main"].position);
        let axis = direction(wire.source, wire.target).normalize();
        obj.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), axis);
    }
};
