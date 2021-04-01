import {modelClasses} from "../model";
import {
    extractCoords,
    THREE,
    copyCoords,
    getPoint,
    getDefaultControlPoint,
    getControlPointForArcCenter
} from "./utils";

import './lines/Line2.js';
import {MaterialFactory} from "./materialFactory";

const {VisualResource, Link, Wire} = modelClasses;

/**
 * Create visual objects for a wire
 * @param state
 */
Wire.prototype.createViewObjects = function(state){
    VisualResource.prototype.createViewObjects.call(this, state);
    if (!this.viewObjects["main"]) {
        let material;
        if (this.stroke === Link.LINK_STROKE.DASHED) {
            material = MaterialFactory.createLineDashedMaterial({color: this.color});
        } else {
            //Thick lines
            if (this.stroke === Link.LINK_STROKE.THICK) {
                // Line 2 method: draws thick lines
                material = MaterialFactory.createLine2Material({
                    color: this.color,
                    lineWidth: this.lineWidth,
                    polygonOffsetFactor: this.polygonOffsetFactor
                });
            } else {
                //Normal lines
                material = MaterialFactory.createLineBasicMaterial({
                    color: this.color,
                    polygonOffsetFactor: this.polygonOffsetFactor
                });
            }
        }

        let geometry, obj;
        if (this.stroke === Link.LINK_STROKE.THICK) {
            geometry = new THREE.LineGeometry();
            obj = new THREE.Line2(geometry, material);
        } else {
            //Thick lines
            if (this.stroke === Link.LINK_STROKE.DASHED) {
                geometry = new THREE.Geometry();
            } else {
                geometry = new THREE.BufferGeometry();
            }
            obj = new THREE.Line(geometry, material);
        }
        // Edge bundling breaks a link into 66 points
        this.pointLength = (!this.geometry || this.geometry === Link.LINK_GEOMETRY.LINK)? 2 : state.linkResolution;
        if (this.stroke === Link.LINK_STROKE.DASHED) {
            geometry.vertices = new Array(this.pointLength);
            for (let i = 0; i < this.pointLength; i++ ){ geometry.vertices[i] = new THREE.Vector3(0, 0, 0); }
        } else {
            //Buffered geometry
            if (this.stroke !== Link.LINK_STROKE.THICK){
                geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.pointLength * 3), 3));
            }
        }

        obj.renderOrder = 10;  // Prevents visual glitches of dark lines on top of nodes by rendering them last
        obj.userData = this;   // Attach link data
        this.viewObjects["main"] = obj;
    }

    //Wire label
    this.createLabels();
};

Wire.prototype.getCurve = function(start, end){
    let curve = new THREE.Line3(start, end);
    let control;
    switch (this.geometry) {
        case Wire.WIRE_GEOMETRY.ARC:
            const arcCenter = extractCoords(this.arcCenter);
            control = getControlPointForArcCenter(start, end, arcCenter);
            curve = new THREE.QuadraticBezierCurve3(start, control, end);
            break;
        case Wire.WIRE_GEOMETRY.SPLINE:
            control = this.controlPoint? extractCoords(this.controlPoint): getDefaultControlPoint(start, end);
            curve = new THREE.QuadraticBezierCurve3(start, control, end);
    }
    return curve;
};

Wire.prototype.relocate = function(delta, epsilon = 5){
    if (Math.abs(this.source.x - this.target.x) < epsilon) {
        delta.y = 0;
    } else {
        if (Math.abs(this.source.y - this.target.y) < epsilon) {
            delta.x = 0;
        }
    }
    ['source', 'target'].forEach(prop => this[prop].relocate(delta));
    this.updateViewObjects(this.state);
}

/**
 * Update visual objects for a wire
 */
Wire.prototype.updateViewObjects = function(state) {
    VisualResource.prototype.updateViewObjects.call(this, state);

    let start = extractCoords(this.source);
    let end   = extractCoords(this.target);
    let curve = this.getCurve(start, end);
    this.center = getPoint(curve, start, end, 0.5);
    this.points = curve.getPoints? curve.getPoints(this.pointLength): [start, end];

    if (this.geometry === Link.LINK_GEOMETRY.ARC){
        this.points = this.points.map(p => new THREE.Vector3(p.x, p.y, 0));
    }

    (this.hostedAnchors||[]).forEach((anchor, i) => {
        let d_i = anchor.offset? anchor.offset: 1. / (this.hostedAnchors.length + 1) * (i + 1);
        let pos = getPoint(curve, start, end, d_i);
        pos = new THREE.Vector3(pos.x, pos.y, 0); //Arc wires are rendered in 2d
        copyCoords(anchor, pos);
        if (anchor.viewObjects["main"]) {
            copyCoords(anchor.viewObjects["main"].position, anchor);
        }
    });

    this.updateLabels(this.center.clone().addScalar(this.state.labelOffset.Wire));

    const obj = this.viewObjects["main"];
    if (obj) {
        if (this.stroke === Link.LINK_STROKE.THICK){
            let coordArray = [];
            this.points.forEach(p => coordArray.push(p.x, p.y, p.z));
            obj.geometry.setPositions(coordArray);
        } else {
            if (obj && this.stroke === Link.LINK_STROKE.DASHED) {
                obj.geometry.setFromPoints(this.points);
                obj.geometry.verticesNeedUpdate = true;
                obj.computeLineDistances();
            } else {
                let linkPos = obj.geometry.attributes && obj.geometry.attributes.position;
                if (linkPos) {
                    this.points.forEach((p, i) => p && ["x", "y", "z"].forEach((dim,j) => linkPos.array[3 * i + j] = p[dim]));
                    linkPos.needsUpdate = true;
                    obj.geometry.computeBoundingSphere();
                }
            }
        }
    }
};

Object.defineProperty(Wire.prototype, "polygonOffsetFactor", {
    get: function() {
        return Math.min(...["source", "target"].map(prop => this[prop]?
            (this[prop].polygonOffsetFactor || 0) - 1: 0));
    }
});
