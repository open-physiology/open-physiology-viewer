import {modelClasses} from "../model";
import {
    extractCoords,
    THREE,
    semicircleCurve,
    rectangleCurve,
    arcCurve, 
    getDefaultControlPoint
} from "./utils";

import './lines/Line2.js';
import {MaterialFactory} from "./materialFactory";

const {VisualResource, Edge, Link, Wire} = modelClasses;

/**
 * Create visual object for edge
 */
Edge.prototype.createViewObjects = function(state) {
    VisualResource.prototype.createViewObjects.call(this, state);
};

/**
 * Update visual object for edge
 */
Edge.prototype.updateViewObjects = function(state) {
    VisualResource.prototype.updateViewObjects.call(this, state);
};

Edge.prototype.getViewObject = function (state){
    let material;
    if (this.stroke === Edge.EDGE_STROKE.DASHED) {
        material = MaterialFactory.createLineDashedMaterial({color: this.color});
    } else {
        //Thick lines
        if (this.stroke === Edge.EDGE_STROKE.THICK) {
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
    if (this.stroke === Link.EDGE_STROKE.THICK) {
        geometry = new THREE.LineGeometry();
        obj = new THREE.Line2(geometry, material);
    } else {
        geometry = new THREE.BufferGeometry();
        obj = new THREE.Line(geometry, material);
    }
    // Edge bundling breaks a link into 66 points
    this.pointLength = (!this.geometry || this.geometry === Edge.EDGE_GEOMETRY.LINK)? 2 : (this.geometry === Link.LINK_GEOMETRY.PATH)? 67 : state.edgeResolution;
    // We need better resolution for elliptic wires
    if (this.geometry === Wire.WIRE_GEOMETRY.ELLIPSE){
        this.pointLength *= 10;
    }
    if (this.stroke !== Edge.EDGE_STROKE.THICK){
         geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.pointLength * 3), 3));
    }
    return obj;
}

Edge.prototype.getCurve = function(start, end) {
    switch (this.geometry) {
        case Edge.EDGE_GEOMETRY.ARC:
            return arcCurve(start, end, extractCoords(this.arcCenter));
        case Edge.EDGE_GEOMETRY.SEMICIRCLE:
            return semicircleCurve(start, end);
        case Edge.EDGE_GEOMETRY.RECTANGLE:
            return rectangleCurve(start, end);
        case Wire.WIRE_GEOMETRY.SPLINE:
            const control = this.controlPoint? extractCoords(this.controlPoint): getDefaultControlPoint(start, end, this.curvature);
            return new THREE.QuadraticBezierCurve3(start, control, end);
        default:
            return new THREE.Line3(start, end);
    }
};

export {Edge};

