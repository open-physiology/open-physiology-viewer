
import {modelClasses} from "../model";
import { isInRange, copyCoords  } from "./util/utils"
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

/**
 * Place node inside of shape
 * @param node
 * @param offset
 */
 Shape.prototype.placeNodeInside = function (node, offset){
  let V = this.points[2].clone().sub(this.points[1]);
  let U = this.points[1].clone().sub(this.points[0]).multiplyScalar(0.5);
  let pos = this.points[0].clone().add(V.clone().multiplyScalar(offset)).add(U);
  copyCoords(node, pos);
  node.z += 1;
}

/**
   * Assigns fixed position on a grid inside border
   * @param link    - link to place inside border
   * @param index   - position
   * @param numCols - number of columns
   * @param length  - length of shape array
   */
Shape.prototype.placeLinkInside = function(link, index, numCols, length) {
  if (!link.source || !link.target){ return; }
  if (link.source.isConstrained || link.target.isConstrained){ return; }

  let delta = 0.05; //offset from the border
  let minX = Number.MAX_SAFE_INTEGER, maxX = Number.MIN_SAFE_INTEGER, minY = Number.MAX_SAFE_INTEGER, maxY = Number.MIN_SAFE_INTEGER;
  let avgZ = 0;
  (this.points||[]).forEach(p => {
      if (p.x < minX){ minX = p.x; }
      if (p.x > maxX){ maxX = p.x; }
      if (p.y < minY){ minY = p.y; }
      if (p.y > maxY){ maxY = p.y; }
      avgZ += p.z;
  });
  //TODO make projection if hosting layer is not on xy plane

  avgZ = avgZ / (this.points||[]).length;
  let p = [new THREE.Vector3(maxX, minY, 1), new THREE.Vector3(minX, minY, 1), new THREE.Vector3(minX, maxY, 1)];

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
}