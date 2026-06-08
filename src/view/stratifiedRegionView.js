import {modelClasses} from "../model";
import {copyCoords, direction, THREE} from "./utils";

const {StratifiedRegion, Stratification, VisualResource} = modelClasses;

/**
 * Create visual objects for a stratified region
 * @param state
 */
StratifiedRegion.prototype.createViewObjects = function(state) {
    // Resolve supertype if it's an ID
    if (typeof this.supertype === 'string' && state.graphData?.entitiesByID) {
        this.supertype = state.graphData.entitiesByID[this.supertype] || this.supertype;
    }
    // Resolve axisWire if it's an ID
    if (typeof this.axisWire === 'string' && state.graphData?.entitiesByID) {
        this.axisWire = state.graphData.entitiesByID[this.axisWire] || this.axisWire;
    }

    if (this.supertype && this.supertype instanceof Stratification) {
        // Use a consistent color for all regions with the same supertype if not specified
        this.color = this.color || this.supertype.color;
        this.viewObjects['main'] = Stratification.prototype.createViewObjects.call(this.supertype, {
            ...state,
            reversed: this.reversed || this.axisWire?.reversed
        });
        this.viewObjects['main'].userData = this;
        (this.viewObjects['main'].children || []).forEach(child => {
            if (child.userData && child.userData.host === this.supertype) {
                child.userData.host = this;
            }
        });
    }
};

/**
 * Update visual objects for the stratification
 */
StratifiedRegion.prototype.updateViewObjects = function(state) {
    VisualResource.prototype.updateViewObjects.call(this, state);

    if (this.viewObjects["main"] && this._stratifiedRegionSize !== state.stratifiedRegionSize) {
        if (state.graphScene) {
            state.graphScene.remove(this.viewObjects["main"]);
        }
        delete this.viewObjects["main"];
    }

    if (!this.viewObjects["main"]) {
       this.createViewObjects(state);
       this._stratifiedRegionSize = state.stratifiedRegionSize;
       if (state.graphScene) {
           state.graphScene.add(this.viewObjects["main"]);
       }
    }
    const obj = this.viewObjects["main"];
    if (!obj) { return; }
    obj.visible = this.isVisible && state.showStratifiedRegions && (this.axisWire ? this.axisWire.isVisible : true);
    const wire = this.axisWire;
    if (wire && wire.viewObjects && wire.viewObjects["main"]) {
        copyCoords(obj.position, wire.center || wire.viewObjects["main"].position);
        let axis = direction(wire.source, wire.target).normalize();
        obj.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), axis);
    }
};
