import {modelClasses} from "../model";
import {merge, values} from 'lodash-bound';
import {
    copyCoords,
    getCenterOfMass,
    THREE,
    isInRange
} from "./util/utils";

const { Border, VisualResource } = modelClasses;
import { GeometryFactory } from './util/geometryFactory'

/**
 * @property polygonOffsetFactor
 */
 Object.defineProperty(Border.prototype, "polygonOffsetFactor", {
  get: function() {
      return this.host? this.host.polygonOffsetFactor: 0;
  }
});

/**
 * Returns coordinates of the bounding box (min and max points defining a parallelogram containing the border points)
 */
 Border.prototype.getBoundingBox = function(){
  let [x, y, z] = ["x","y","z"].map(key => this.host.points.map(p => p[key]));
  let min = {"x": Math.min(...x), "y": Math.min(...y), "z": Math.min(...z)};
  let max = {"x": Math.max(...x), "y": Math.max(...y), "z": Math.max(...z)};
  return [min, max];
};

/**
* Create visual objects for a shape border
* @param state
*/
Border.prototype.createViewObjects = function(state){
  VisualResource.prototype.createViewObjects.call(this, state);
  //Make sure we always have border objects regardless of data input
  for (let i = 0; i < this.borders.length; i++){
      this.borders[i]::merge({
          "length": this.host.points[i + 1].distanceTo(this.host.points[i])
      });
      if (this.borders[i].conveyingLyph) {
          this.borders[i].conveyingLyph.conveys = this.borders[i];
          this.borders[i].createViewObjects(state);
          this.borders[i].conveyingLyph.viewObjects::values().forEach(obj => obj && state.graphScene.add(obj));
      }
  }
};

/**
* Update visual objects for a shape border
*/
Border.prototype.updateViewObjects = function(state){
  VisualResource.prototype.updateViewObjects.call(this, state);
  /**
   * Assigns fixed position on a grid inside border
   * @param link    - link to place inside border
   * @param index   - position
   * @param numCols - number of columns
   * @param length  - length of lyph array
   */
  const placeLinkInside = (link, index, numCols, length) => {
      if (!link.source || !link.target){ return; }
      if (link.source.isConstrained || link.target.isConstrained){ return; }

      let delta = 0.05; //offset from the border
      let minX = Number.MAX_SAFE_INTEGER, maxX = Number.MIN_SAFE_INTEGER, minY = Number.MAX_SAFE_INTEGER, maxY = Number.MIN_SAFE_INTEGER;
      let avgZ = 0;
      (this.host.points||[]).forEach(p => {
          if (p.x < minX){ minX = p.x; }
          if (p.x > maxX){ maxX = p.x; }
          if (p.y < minY){ minY = p.y; }
          if (p.y > maxY){ maxY = p.y; }
          avgZ += p.z;
      });

      //TODO make projection if hosting layer is not on xy plane

      avgZ = avgZ / (this.host.points||[]).length;
      let p = [GeometryFactory.instance().createVector3(maxX, minY, 1), GeometryFactory.instance().createVector3(minX, minY, 1), GeometryFactory.instance().createVector3(minX, maxY, 1)];

      let isReversed = link.reversed || isInRange(90, 270, link.conveyingLyph.angle);
      let numRows = Math.ceil(length / numCols);

      let w = p[1].clone().sub(p[0]); //width
      let h = p[2].clone().sub(p[1]); //height

      let W = w.length() + 1;
      let H = h.length() + 1;

      let [i, j] = [Math.floor(index / numCols), index % numCols]; //grid position
      let [dW, dH] = [W / numCols, H / numRows];
      let [dX, dY] = [j*dW, i*dH];

      let dy = dY + (isReversed? dH : 0);
      let offsetY  = h.clone().multiplyScalar(dy / H + delta);
      let sOffsetX = w.clone().multiplyScalar(dX / W + delta); //link.source.offset || 0;
      let tOffsetX = w.clone().multiplyScalar((dX + dW) / W - delta); //link.target.offset || 0;

      let v1 = p[0].clone().add(sOffsetX).add(offsetY);
      let v2 = p[0].clone().add(tOffsetX).add(offsetY);

      copyCoords(link.source, v1);
      copyCoords(link.target, v2);
  };

  /**
   * Assign fixed position on a circle inside border
   * @param node   - node to place inside border
   * @param i      - position
   * @param n      - total number of nodes inside
   * @param center - shape center
   */
  const placeNodeInside = (node, i, n, center) => {//TODO this will only work well for rectangular shapes
      if (!node || !node.class) {
          console.warn("Cannot place a node inside border" , this.id, node);
          return;
      }
      let [min, max] = this.getBoundingBox();
      let dX = max.x - min.x; let dY = max.y - min.y;
      let r  = Math.min(dX, dY) / 4;
      let offset = GeometryFactory.instance().createVector3( r, 0, 0 );
      let axis   = GeometryFactory.instance().createVector3( 0, 0, 1);
      let angle  = 4 * Math.PI * i / n;
      offset.applyAxisAngle( axis, angle );
      let pos = center.clone().add(offset);
      copyCoords(node, pos);
      node.z += 1;
  };

  for (let i = 0; i < this.borders.length ; i++){
      copyCoords(this.borders[i].source, this.host.points[ i ]);
      copyCoords(this.borders[i].target, this.host.points[i + 1]);
      this.borders[i].updateViewObjects(state);
      //Position hostedNodes exactly on the link shape
      let borderLyph = this.borders[i].conveyingLyph;
      if (borderLyph && borderLyph.viewObjects) {
          borderLyph.viewObjects::values().forEach(obj => obj && this.state.graphScene.add(obj));
      }
      if (this.borders[i].hostedNodes){
          //position nodes on the lyph border (exact shape)
          let n = this.borders[i].hostedNodes.length;
          const offset = 1 / (n + 1);
          let V = this.host.points[i + 1].clone().sub(this.host.points[i]);
          this.borders[i].hostedNodes.forEach((node, j) => {
              //For borders 2 and 3 position nodes in the reversed order to have parallel links
              let d_i = node.offset ? node.offset : offset * (j + 1);
              if (i > 1){
                  d_i = 1 - d_i;
              }
              //TODO cysts may have shifted nodes on layer borders
              copyCoords(node, this.host.points[i].clone().add(V.clone().multiplyScalar(d_i)));
          })
      }
  }

  //By doing the update here, we also support inner content in the region
  const lyphsToLinks = (lyphs) => (lyphs || []).filter(lyph => lyph.axis).map(lyph => lyph.axis);

  const hostedLinks = lyphsToLinks(this.host.hostedLyphs);
  hostedLinks.forEach((link, i) => placeLinkInside(link, i, Math.floor(Math.sqrt(hostedLinks.length||1)), hostedLinks.length));

  const numCols = this.host.internalLyphColumns || 1;
  const internalLinks = lyphsToLinks(this.host.internalLyphs);
  internalLinks.forEach((link, i) => placeLinkInside(link, i, numCols, internalLinks.length));

  const center = getCenterOfMass(this.host.points);
  (this.host.internalNodes || []).forEach((node, i) => placeNodeInside(node, i, this.host.internalNodes.length, center));
};
