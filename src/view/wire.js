import {modelClasses} from "../model";
const {Edge, Link, Wire} = modelClasses;

import {
  extractCoords,
  THREE,
  copyCoords,
  getPoint,
  arcCurve, getDefaultControlPoint
} from "./util/utils";

import './lines/Line2.js';
import {MaterialFactory} from "./util/materialFactory";
import { GeometryFactory } from './util/geometryFactory'

Object.defineProperty(Wire.prototype, "polygonOffsetFactor", {
  get: function() {
      return Math.min(...["source", "target"].map(prop => this[prop]?
          (this[prop].polygonOffsetFactor || 0) - 1: 0));
  }
});

/**
 * Create visual objects for a wire
 * @param state
 */
 Wire.prototype.createViewObjects = function(state){
  Edge.prototype.createViewObjects.call(this, state);
  if (!this.viewObjects["main"]) {
      let material;
      if (this.stroke === Link.EDGE_STROKE.DASHED) {
          material = MaterialFactory.createLineDashedMaterial({color: this.color});
      } else {
          //Thick lines
          if (this.stroke === Link.EDGE_STROKE.THICK) {
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

      if (this.geometry === Wire.WIRE_GEOMETRY.INVISIBLE)  { return; }
      let geometry, obj;
      if (this.stroke === Link.EDGE_STROKE.THICK) {
          geometry = GeometryFactory.instance().createLineGeometry();
          obj = GeometryFactory.instance().createLine2(geometry, material);
      } else {
          //Thick lines
          if (this.stroke === Link.EDGE_STROKE.DASHED) {
              geometry = GeometryFactory.instance().createGeometry();
          } else {
              geometry = new THREE.BufferGeometry();
          }
          obj = new THREE.Line(geometry, material);
      }
      // Edge bundling breaks a link into 66 points
      this.pointLength = (!this.geometry || this.geometry === Wire.WIRE_GEOMETRY.LINK)? 2 : state.edgeResolution;
      if (this.stroke === Link.EDGE_STROKE.DASHED) {
          geometry.vertices = new Array(this.pointLength);
          for (let i = 0; i < this.pointLength; i++ ){ geometry.vertices[i] = GeometryFactory.instance().createVector3(0, 0, 0); }
      } else {
          //Buffered geometry
          if (this.stroke !== Link.EDGE_STROKE.THICK){
              geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.pointLength * 3), 3));
          }
      }

      obj.renderOrder = 10;  // Prevents visual glitches of dark lines on top of nodes by rendering them last
      obj.userData = this;   // Attach link data
      this.viewObjects["main"] = obj;
  }
  this.createLabels();
};

Wire.prototype.getCurve = function(start, end){
  let curve = GeometryFactory.instance().createLine3(start, end);
  switch (this.geometry) {
      case Wire.WIRE_GEOMETRY.ARC:
          curve = arcCurve(start, end, extractCoords(this.arcCenter));
          break;
      case Wire.WIRE_GEOMETRY.SPLINE:
          const control = this.controlPoint? extractCoords(this.controlPoint): getDefaultControlPoint(start, end);
          curve = GeometryFactory.instance().createQuadraticBezierCurve3(start, control, end);
  }
  return curve;
};

Wire.prototype.relocate = function(delta, epsilon = 5){
  if (this.geometry === Wire.WIRE_GEOMETRY.LINK) {
      if (Math.abs(this.source.x - this.target.x) < epsilon) {
          delta.y = 0;
      } else {
          if (Math.abs(this.source.y - this.target.y) < epsilon) {
              delta.x = 0;
          }
      }
  }
  [$Field.source, $Field.target].forEach(prop => this[prop].relocate(delta));
  this.updateViewObjects(this.state);
  return [this.source, this.target];
}

/**
* Update visual objects for a wire
*/
Wire.prototype.updateViewObjects = function(state) {
  Edge.prototype.updateViewObjects.call(this, state);

  let start = extractCoords(this.source);
  let end   = extractCoords(this.target);
  let curve = this.getCurve(start, end);
  this.center = getPoint(curve, start, end, 0.5);
  this.points = curve.getPoints? curve.getPoints(this.pointLength): [start, end];

  if (this.geometry === Link.LINK_GEOMETRY.ARC){
      this.points = this.points.map(p => GeometryFactory.instance().createVector3(p.x, p.y, 0));
  }

  (this.hostedAnchors||[]).forEach((anchor, i) => {
      let d_i = anchor.offset? anchor.offset: 1. / (this.hostedAnchors.length + 1) * (i + 1);
      let pos = getPoint(curve, start, end, d_i);
      pos = GeometryFactory.instance().createVector3(pos.x, pos.y, 0); //Arc wires are rendered in 2d
      copyCoords(anchor, pos);
      if (anchor.viewObjects["main"]) {
          copyCoords(anchor.viewObjects["main"].position, anchor);
          anchor.updateLabels(anchor.viewObjects["main"].position.clone().addScalar(this.state.labelOffset.Vertice));
      }
      //When hoated anchor was repositioned, the wires that end in it should be updated too
      (anchor.sourceOf||[]).forEach(w => w.updateViewObjects(state));
      (anchor.targetOf||[]).forEach(w => w.updateViewObjects(state));
  });

  this.updateLabels(this.center.clone().addScalar(this.state.labelOffset.Edge));

  if (this.geometry === Wire.WIRE_GEOMETRY.INVISIBLE)  { return; }

  const obj = this.viewObjects["main"];
  if (obj) {
      if (this.stroke === Link.EDGE_STROKE.THICK){
          let coordArray = [];
          this.points.forEach(p => coordArray.push(p.x, p.y, p.z));
          obj.geometry.setPositions(coordArray);
      } else {
          if (obj && this.stroke === Link.EDGE_STROKE.DASHED) {
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