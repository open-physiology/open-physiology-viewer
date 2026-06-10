import {modelClasses} from "../model";
import {
    extractCoords,
    THREE,
    semicircleCurve,
    rectangleCurve,
    arcCurve,
    getDefaultControlPoint
} from "./utils";

import {MaterialFactory} from "./materialFactory";

const {VisualResource, Edge, Link, Wire} = modelClasses;

// Minimum lineWidth at which an edge is drawn as a 3D tube instead of a 1px line.
// WebGL ignores Line linewidth > 1 on most platforms (incl. Chrome/macOS ANGLE), so genuinely
// thick edges are rendered as TubeGeometry meshes.
const TUBE_MIN_LINE_WIDTH = 5;

/**
 * Create visual object for edge
 */
Edge.prototype.createViewObjects = function (state) {
    VisualResource.prototype.createViewObjects.call(this, state);
};

/**
 * Update visual object for edge
 */
Edge.prototype.updateViewObjects = function (state) {
    VisualResource.prototype.updateViewObjects.call(this, state);
};

/**
 * Whether this edge should be drawn as a 3D tube (a thick edge wider than the line-width threshold).
 * @returns {boolean}
 */
Edge.prototype.isTube = function () {
    return this.stroke === Edge.EDGE_STROKE.THICK || (this.lineWidth || 0) > TUBE_MIN_LINE_WIDTH;
};

/**
 * Tube radius (world units) derived from the edge line width.
 * @returns {number}
 */
Edge.prototype.tubeRadius = function () {
    return Math.max(4, (this.lineWidth || 2) / 2);
};

Edge.prototype.getViewObject = function (state) {
    let material, geometry, obj;
    if (this.isTube()) {
        // Thick edge -> 3D tube mesh. The geometry is (re)built from the sampled curve points in
        // updateTubeGeometry(); this is just a placeholder so the mesh exists before the first update.
        material = MaterialFactory.createMeshBasicMaterial({
            color: this.color,
            polygonOffsetFactor: this.polygonOffsetFactor
        });
        geometry = new THREE.TubeGeometry(
            new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)),
            1, this.tubeRadius(), 10, false
        );
        obj = new THREE.Mesh(geometry, material);
    } else {
        if (this.stroke === Edge.EDGE_STROKE.DASHED) {
            material = MaterialFactory.createLineDashedMaterial({color: this.color});
        } else {
            material = MaterialFactory.createLineBasicMaterial({
                color: this.color,
                polygonOffsetFactor: this.polygonOffsetFactor
            });
        }
        geometry = new THREE.BufferGeometry();
        obj = new THREE.Line(geometry, material);
    }
    // Edge bundling breaks a link into 66 points
    this.pointLength = (!this.geometry || this.geometry === Edge.EDGE_GEOMETRY.LINK) ? 2 : (this.geometry === Edge.EDGE_GEOMETRY.PATH) ? 67 : state.edgeResolution;
    // We need better resolution for elliptic wires
    if (this.geometry === Edge.EDGE_GEOMETRY.ELLIPSE) {
        this.pointLength *= 10;
    }
    if (!this.isTube()) {
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.pointLength * 3), 3));
    }
    return obj;
}

/**
 * Rebuild the tube geometry of a thick edge from its current sampled points.
 * TubeGeometry cannot be updated in place, so the old geometry is disposed and replaced.
 * @param {THREE.Mesh} obj - the edge's tube mesh (viewObjects["main"])
 */
Edge.prototype.updateTubeGeometry = function (obj) {
    if (!obj) { return; }
    const pts = (this.points || [])
        .filter(p => p)
        .map(p => new THREE.Vector3(p.x || 0, p.y || 0, p.z || 0));
    if (pts.length < 2) { return; }
    // Build a tube-compatible 3D curve from the already-sampled points. We must NOT use getCurve():
    // it can return THREE.Line3 (no computeFrenetFrames) or THREE.EllipseCurve (2D), neither of which
    // TubeGeometry accepts. The sampled points already follow the real edge shape (arc/spline/ellipse/
    // path), so a poly-curve through them reproduces it and is always a valid 3D Curve.
    const curve = pts.length === 2
        ? new THREE.LineCurve3(pts[0], pts[1])
        : new THREE.CatmullRomCurve3(pts);
    const tubularSegments = Math.max(1, pts.length * 2);
    const newGeometry = new THREE.TubeGeometry(curve, tubularSegments, this.tubeRadius(), 10, false);
    if (obj.geometry) { obj.geometry.dispose(); }
    obj.geometry = newGeometry;
}

Edge.prototype.getCurve = function (start, end) {
    switch (this.geometry) {
        case Edge.EDGE_GEOMETRY.PATH:
            if (this.path){
                const points = [start];
                this.path.forEach(p => points.push(new THREE.Vector3(p.x||0, p.y||0, p.z||0)));
                points.push(end);
                return new THREE.CatmullRomCurve3(points);
            }
            return new THREE.Line3(start, end);
        case Edge.EDGE_GEOMETRY.ARC:
            return arcCurve(start, end, extractCoords(this.arcCenter));
        case Edge.EDGE_GEOMETRY.SEMICIRCLE:
            return semicircleCurve(start, end);
        case Edge.EDGE_GEOMETRY.RECTANGLE:
            return rectangleCurve(start, end);
        case Edge.EDGE_GEOMETRY.SPLINE:
            const control = this.controlPoint ? extractCoords(this.controlPoint) : getDefaultControlPoint(start, end, this.curvature);
            return new THREE.QuadraticBezierCurve3(start, control, end);
        case Edge.EDGE_GEOMETRY.ELLIPSE:
            let c = extractCoords(this.arcCenter);
            return new THREE.EllipseCurve(c.x, c.y, this.radius.x, this.radius.y, 0, 2*Math.PI, false);
        default:
            return new THREE.Line3(start, end);
    }
};

export {Edge};

