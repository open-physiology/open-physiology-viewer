import {modelClasses} from "../model";
const {Edge, VisualResource} = modelClasses;

Edge.prototype.createViewObjects = function(state) {
  VisualResource.prototype.createViewObjects.call(this, state);
};

/**
* Update visual object for edge
*/
Edge.prototype.updateViewObjects = function(state) {
  VisualResource.prototype.updateViewObjects.call(this, state);
};