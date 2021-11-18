import {copyCoords, THREE} from "./util/utils";
import {MaterialFactory} from "./util/materialFactory";
import {modelClasses} from "../model";
const {VisualResource, Vertice, Node, Anchor} = modelClasses;

import { GeometryFactory } from './util/geometryFactory'

/**
 * Create visual object for vertice
 */
 Vertice.prototype.createViewObjects = function(state) {
  VisualResource.prototype.createViewObjects.call(this, state);
  if (this.invisible){ return; }
  if (!this.viewObjects["main"]) {
      let geometry = GeometryFactory.instance().createSphereGeometry(this.val * state.verticeRelSize,
          state.verticeResolution, state.verticeResolution);
      let material = MaterialFactory.createMeshLambertMaterial({
          color: this.color,
          polygonOffsetFactor: this.polygonOffsetFactor
      });
      let obj = GeometryFactory.instance().createMesh(geometry, material);
      // Attach vertice data
      obj.userData = this;
      this.viewObjects["main"] = obj;
  }
  this.createLabels();
};

/**
* Update visual object for vertice
*/
Vertice.prototype.updateViewObjects = function(state) {
  VisualResource.prototype.updateViewObjects.call(this, state);
  if (!this.invisible) {
      copyCoords(this.viewObjects["main"].position, this);
      this.updateLabels( this.viewObjects["main"].position.clone().addScalar(this.state.labelOffset.Vertice));
  }
};