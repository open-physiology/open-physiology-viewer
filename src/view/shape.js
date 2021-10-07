
import {modelClasses} from "../model";
const { Shape, VisualResource} = modelClasses;

/**
 * Create visual object for shape
 */
 Shape.prototype.createViewObjects = function(state) {
  VisualResource.prototype.createViewObjects.call(this, state);
};

/**
* Update visual object for shape
*/
Shape.prototype.updateViewObjects = function(state) {
  VisualResource.prototype.updateViewObjects.call(this, state);
};

