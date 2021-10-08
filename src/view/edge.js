import {modelClasses} from "../model";
import { GeometryFactory } from './util/geometryFactory'
import { MaterialFactory } from './util/materialFactory'
import {  extractCoords, arcCurve, semicircleCurve, rectangleCurve, getDefaultControlPoint } from "./util/utils";

const {Edge, Link, Wire, VisualResource} = modelClasses;

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
      geometry = GeometryFactory.instance().createLineGeometry();
      obj = GeometryFactory.instance().createLine2(geometry, material);
  } else {
      geometry = GeometryFactory.instance().createBufferGeometry();
      obj = GeometryFactory.instance().createLine(geometry, material);
  }
  // Edge bundling breaks a link into 66 points
  this.pointLength = (!this.geometry || this.geometry === Edge.EDGE_GEOMETRY.LINK)? 2 : (this.geometry === Link.LINK_GEOMETRY.PATH)? 67 : state.edgeResolution;
  // We need better resolution for elliptic wires
  if (this.geometry === Wire.WIRE_GEOMETRY.ELLIPSE){
      this.pointLength *= 10;
  }
  if (this.stroke !== Edge.EDGE_STROKE.THICK){
       geometry.setAttribute('position', GeometryFactory.instance().createBufferAttribute(new Float32Array(this.pointLength * 3), 3));
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
          return GeometryFactory.instance().createQuadraticBezierCurve3(start, control, end);
      default:
          return GeometryFactory.instance().createLine3(start, end);
  }
};
