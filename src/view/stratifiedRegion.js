import {modelClasses} from "../model";
import {copyCoords, direction, THREE} from "./utils";

const {StratifiedRegion, Stratification, VisualResource} = modelClasses;

/**
 * Compute stratified region border points
 * @param edgeResolution
 */
StratifiedRegion.prototype.updatePoints = function(edgeResolution){
    // if (this.axisWire) {
    //     this.points = [];
    //     let start = extractCoords(this.axisWire.source.layout);
    //     let end = extractCoords(this.axisWire.target.layout);
    //     let curve = this.axisWire.getCurve(start, end);
    //     if (curve.getPoints) {
    //         this.points = curve.getPoints(edgeResolution);
    //     } else {
    //         this.points = [start, end];
    //     }
    //
    //     // Stratified regions look like thick wires or rectangles aligned with the wire
    //     // For now, we can create a thin rectangle around the wire
    //     const width = this.supertype?.width || 2;
    //     const normal = new THREE.Vector3(0, 0, 1);
    //     let pointsLeft = [];
    //     let pointsRight = [];
    //
    //     for (let i = 0; i < this.points.length; i++) {
    //         let p = this.points[i];
    //         let tangent;
    //         if (i < this.points.length - 1) {
    //             tangent = this.points[i+1].clone().sub(p).normalize();
    //         } else if (i > 0) {
    //             tangent = p.clone().sub(this.points[i-1]).normalize();
    //         } else {
    //             tangent = new THREE.Vector3(1, 0, 0);
    //         }
    //         let side = tangent.clone().cross(normal).normalize().multiplyScalar(width);
    //         pointsLeft.push(p.clone().add(side));
    //         pointsRight.push(p.clone().sub(side));
    //     }
    //     this.points = [...pointsLeft, ...pointsRight.reverse()];
    // }
    // this.points = this.points.map(p => new THREE.Vector3(p.x, p.y, 0));
    // this.center = getCenterOfMass(this.points);
}

/**
 * Create visual objects for a stratified region
 * @param state
 */
StratifiedRegion.prototype.createViewObjects = function(state) {
    if (this.supertype) {
        // Use a consistent color for all regions with the same supertype if not specified
        this.color = this.color || this.supertype.color;
        this.viewObjects['main'] = Stratification.prototype.createViewObjects.call(this.supertype, state);
    }
};

/**
 * Update visual objects for a stratification
 */
StratifiedRegion.prototype.updateViewObjects = function(state) {
    VisualResource.prototype.updateViewObjects.call(this, state);

    const obj = this.viewObjects["main"];
    if (!obj) {
       this.createViewObjects(state);
    }

    // Visibility: tie to showLyphs (no dedicated toggle exists)
    obj.visible = this.isVisible && state.showLyphs;

    // Center around the conveying link if available, but keep in world XY plane
    const wire = this.axisWire;
    if (wire && wire.viewObjects && wire.viewObjects["main"]) {
        copyCoords(obj.position, wire.center || wire.viewObjects["main"].position);
        let axis = direction(wire.source, wire.target).normalize();
        obj.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), axis);
    } else
        if (this.center) {
            copyCoords(obj.position, this.center);
        }
};
