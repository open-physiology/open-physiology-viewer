import {copyCoords, getCenterOfMass, THREE} from "./util/utils";
import {modelClasses} from "../model";
const { Vertice, Node } = modelClasses;

Object.defineProperty(Node.prototype, "polygonOffsetFactor", {
  get: function() { return 0; }
});

/**
 * Create visual objects for a node
 * @param state
 */
Node.prototype.createViewObjects = function(state) {
  this.val = this.val || state.nodeVal;
  Vertice.prototype.createViewObjects.call(this, state);
};

/**
* Update visual objects for a node
*/
Node.prototype.updateViewObjects = function(state) {
  if (this.anchoredTo){
      copyCoords(this, this.anchoredTo);
  } else {
      if (this.fixed) {
          copyCoords(this, this.layout);
      }
      if (this.controlNodes) {
          copyCoords(this, getCenterOfMass(this.controlNodes));
      }
  }
  Vertice.prototype.updateViewObjects.call(this, state);
};
