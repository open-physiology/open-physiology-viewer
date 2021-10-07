import {modelClasses} from "../model";
import {
    createMeshWithBorder,
    getCenterOfMass,
    extractCoords,
    THREE
} from "./util/utils";

const {Region, Wire, Shape} = modelClasses;

import { GeometryFactory } from './util/geometryFactory'

/**
 * @property polygonOffsetFactor
 */
 Object.defineProperty(Region.prototype, "polygonOffsetFactor", {
  get: function() {
      const def = this.depth || 0;
      return this.internalIn? (this.internalIn.polygonOffsetFactor || 0) - 1 : def;
  }
});

/**
* @property polygonOffsetFactor
*/
Object.defineProperty(Region.prototype, "polygonOffsetFactor", {
  get: function() {
      const def = this.depth || 0;
      return this.internalIn? (this.internalIn.polygonOffsetFactor || 0) - 1 : def;
  }
});

/**
 * Positions a point on a region surface
 * @param p0 - initial point (coordinates)
 * @returns {Object} transformed point (coordinates)
 */
 Region.prototype.translate = function (p0) {
  if (!p0 || !this.viewObjects["main"]) { return; }
  return p0.clone();
};

/**
* Compute region border points
* @param edgeResolution
*/
Region.prototype.updatePoints = function(edgeResolution){
  if (this.facets && this.facets.length > 1) {
      this.points = [];
      this.facets.forEach((wire, i) => {
          if (!wire.source || !wire.target) {
              return;
          }
          let start = extractCoords(wire.source.layout);
          let end = extractCoords(wire.target.layout);
          const next = this.facets[(i+1) % this.facets.length];
          if ((wire.source.id === next.source.id) || (wire.source.id === next.target.id)) {
              let tmp = start;
              start = end;
              end = tmp;
          }
          if (wire.geometry !== Wire.WIRE_GEOMETRY.LINK) {
              let curve = wire.getCurve(start, end);
              if (curve.getPoints) {
                  let points = curve.getPoints(edgeResolution-1);
                  this.points.push(...points);
              }
          } else {
              this.points.push(start);
          }
      });
  }
  this.points = this.points.map(p => GeometryFactory.instance().createVector3(p.x, p.y,0));
  this.center = getCenterOfMass(this.points);
}

/**
* Create visual objects of a region
* @param state
*/
Region.prototype.createViewObjects = function(state) {
  Shape.prototype.createViewObjects.call(this, state);
  if (!this.viewObjects["main"]) {
      this.updatePoints(state.edgeResolution);
      let shape = new THREE.Shape(this.points.map(p => GeometryFactory.instance().createVector2(p.x, p.y))); //Expects Vector2
      let obj = createMeshWithBorder(shape, {
              color: this.color,
              polygonOffsetFactor: this.polygonOffsetFactor
          },
          !this.facets // draw border if region is not defined by facets (e.g., to distinguish regions in connectivity models)
      );
      obj.userData = this;
      this.viewObjects['main'] = obj;
      this.border.createViewObjects(state);
  }
  this.createLabels();
};

/**
* Update visual objects of a region
*/
Region.prototype.updateViewObjects = function(state) {
  Shape.prototype.updateViewObjects.call(this, state);

  let obj = this.viewObjects["main"];
  if (obj) {
      let linkPos = obj.geometry.attributes && obj.geometry.attributes.position;
      if (linkPos) {
          this.updatePoints(state.edgeResolution);
          this.points.forEach((p, i) => p && ["x", "y", "z"].forEach((dim, j) => linkPos.array[3 * i + j] = p[dim]));
          linkPos.needsUpdate = true;
          obj.geometry.computeBoundingSphere();
      }
  }

  this.border.updateViewObjects(state);
  this.updateLabels(this.center.clone().addScalar(this.state.labelOffset.Region));
};

Region.prototype.relocate = function (delta){
  (this.borderAnchors||[]).forEach(anchor => {
      anchor.relocate(delta);
  });
  (this.facets||[]).forEach(facet => facet.updateViewObjects(this.state));
  this.updateViewObjects(this.state);
}

/**
* Resizes the rectangle when a border anchor is dragged
* @param anchor  - anchor on the region border that has been relocated
* @param delta   - vector to shift the anchor
* @param epsilon - allowed distance between coordinates that are considered the same
*/
Region.prototype.resize = function (anchor, delta, epsilon = 5) {
  if (!anchor || !anchor.onBorderInRegion){ return; }
  let base = extractCoords(anchor);
  ["x", "y"].forEach(dim => {
      //shift straight wires
      function relocateAdjacent(wire, prop){
          if (wire.geometry === Wire.WIRE_GEOMETRY.LINK &&
              Math.abs(wire[prop][dim] - (base[dim] - delta[dim])) < epsilon) {
              relocate.add(wire[prop]);
          }
      }
      const relocate = new Set();
      (anchor.sourceOf||[]).forEach(wire => relocateAdjacent(wire, "target"));
      (anchor.targetOf||[]).forEach(wire => relocateAdjacent(wire, "source"));
      const anchors = [...relocate];
      let _delta = GeometryFactory.instance().createVector3(0, 0, 0);
      _delta[dim] = delta[dim];
      anchors.forEach(anchor => anchor.relocate(_delta, false));
  });
  (this.facets||[]).forEach(facet => facet.updateViewObjects(this.state));
  this.updatePoints(this.state.edgeResolution);
}
