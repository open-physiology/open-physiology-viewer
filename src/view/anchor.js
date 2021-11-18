import {copyCoords, extractCoords } from "./util/utils";
import {modelClasses} from "../model";
const { Vertice, Anchor} = modelClasses;

/**
 * Create visual resources for an anchor
 * @param state
 */
 Anchor.prototype.createViewObjects = function(state){
  this.val = this.val || state.anchorVal;
  Vertice.prototype.createViewObjects.call(this, state);
};

/**
* Update visual resources for an anchor
*/
Anchor.prototype.updateViewObjects = function(state) {
  if (this.layout) {
      let coords = extractCoords(this.layout);
      copyCoords(this, coords);
  }
  Vertice.prototype.updateViewObjects.call(this, state);
};

Anchor.prototype.relocate = function(delta, updateDependent = true){
  let v = extractCoords(delta);
  let p0 = extractCoords(this);
  let p = p0.clone().add(v);
  copyCoords(this.layout, p);
  this.updateViewObjects(this.state);
  if (updateDependent) {
      (this.onBorderInRegion || []).forEach(region => region.resize(this, delta));
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