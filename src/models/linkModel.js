import {
  Model
} from './model';
import {
  assign
} from 'lodash-bound';

import * as three from 'three';
const THREE = window.THREE || three;
import {
  SpriteText2D
} from 'three-text2d';
import {
  direction,
  bezierSemicircle,
  copyCoords,
  getTubeGeom,
  getMeshLineGeometry
} from '../three/utils';

import {
  LineSegments2
} from '../three/lines/LineSegments2.js';
import {
  LineGeometry
} from '../three/lines/LineGeometry.js';
import {
  Line2
} from '../three/lines/Line2.js';
import {
  LineMaterial
} from '../three/lines/LineMaterial.js';



let MeshLine = require('three.meshline');

export const LINK_TYPES = {
  PATH: "path",
  LINK: "link",
  AXIS: 'axis',
  COALESCENCE: "coalescence",
  CONTAINER: "container"
};

export class LinkModel extends Model {
  source;
  target;
  length;
  conveyingLyph; //Rename to conveyingLyph
  type;
  geometryType;

  constructor(id) {
    super(id);

    this.fields.text.push('length', 'type');
    this.fields.objects.push('source', 'target', 'conveyingLyph');
  }

  toJSON() {
    let res = super.toJSON();
    res.source = this.source && this.source.id;
    res.target = this.target && this.target.id;
    res.conveyingLyph = this.conveyingLyph && this.conveyingLyph.id;
    res.type = this.type;
    res.length = this.length;
    return res;
  }

  static fromJSON(json, modelClasses = {}) {
    json.class = json.class || "Link";
    const result = super.fromJSON(json, modelClasses);
    result::assign(json); //TODO pick only valid properties
    return result;
  }

  // /**
  //  * @param tree
  //  * @returns {number} link's level in the tree
  //  */
  // level(tree){
  //     return -1; //TODO implement
  // }

  get direction() {
    return direction(this.source, this.target);
  }

  /**
   * Defines size of the conveying lyph based on the length of the link
   * @returns {{length: number, thickness: number}}
   */
  get lyphSize() {
    const scaleFactor = this.length ? Math.log(this.length) : 1;
    if (this.type === LINK_TYPES.CONTAINER) {
      return {
        length: 24 * scaleFactor,
        thickness: 8 * scaleFactor
      };
    }
    return {
      length: 6 * scaleFactor,
      thickness: 2 * scaleFactor
    };
  }

  /**
   * Create WebGL objects to visualize the link, labels and its conveying lyph
   * @param state - layout parameters
   */
  createViewObjects(state) {
    if (this.type === LINK_TYPES.COALESCENCE) {
      return;
    }
    let obj;

    this.viewObjects = {};

    this.lineWidth = 1.5;


    if (this.type === LINK_TYPES.AXIS) {
      this.geometry = new THREE.Geometry();
        //axis can stay behind any other visual objects (default polygonOffsetFactor)
        this.material = state.materialRepo.createLineDashedMaterial({
          color: this.color
        });
      this.geometry.vertices = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];
      obj = new THREE.Line(this.geometry, this.material);

    } else {

      if (state.linkGeometry === 'LINE') {
        this.geometry = new THREE.BufferGeometry();
        this.material = state.materialRepo.createLineBasicMaterial({
          color: this.color,
          polygonOffsetFactor: -4
        });
        if (this.type === LINK_TYPES.PATH) {
          this.geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(state.linkResolution * 3), 3));
        } else {
          if (this.type === LINK_TYPES.LINK) {
            this.geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(2 * 3), 3));
          }
        }
        obj = new THREE.Line(this.geometry, this.material);
      } else if (state.linkGeometry === 'LINE2') {
        this.geometry = new THREE.LineGeometry();
        this.material = new THREE.LineMaterial({
          color: this.color,
          linewidth: 0.002 * this.lineWidth
        });

        obj = new THREE.Line2(this.geometry, this.material);

      } else if (state.linkGeometry === 'TUBE') {
        this.material = new THREE.MeshBasicMaterial({
          color: this.color,
          polygonOffsetFactor: -4
        });
        this.radialSegments = 3; // Increase this to make linewidth rounder. Min of 3.
        this.closed = false;

        if (this.type == LINK_TYPES.PATH) {
          this.nLongitudinalSegments = 50; // For longtiduinally rounded lines
        } else {
          this.nLongitudinalSegments = 1; // Straight lines only need 1 segment
        }

        let path = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, 0),
        ]);

        this.geometry = new THREE.TubeGeometry(path, this.nLongitudinalSegments, this.lineWidth, this.radialSegments, this.closed);

        this.geometry = new THREE.BufferGeometry().fromGeometry(this.geometry);
        obj = new THREE.Mesh(this.geometry, this.material);

      } else if (state.linkGeometry === 'MESHLINE') {
        this.geometry = new THREE.Geometry();

        let path = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, 0),
        ]);

        this.meshLineMaterial = new MeshLine.MeshLineMaterial({
          color: new THREE.Color(this.color),
          lineWidth: this.lineWidth
        });
        this.material = this.meshLineMaterial;

        this.geometry = new THREE.BufferGeometry().fromGeometry(this.geometry);
        obj = new THREE.Mesh(this.geometry, this.material);
      }

    }

    obj.renderOrder = 10; // Prevent visual glitches of dark lines on top of nodes by rendering them last
    obj.__data = this; // Attach link data

    this.viewObjects["main"] = obj;

    //Link label
    this.labelObjects = this.labelObjects || {};
    if (!this.labelObjects[state.linkLabel] && this[state.linkLabel]) {
      this.labelObjects[state.linkLabel] = new SpriteText2D(this[state.linkLabel], state.fontParams);
    }

    this.viewObjects["label"] = this.labelObjects[state.linkLabel];
    if (!this.viewObjects["label"]) {
      delete this.viewObjects["label"];
    }

    //Icon (lyph)
    if (this.conveyingLyph) {
      this.conveyingLyph.axis = this;
      this.conveyingLyph.createViewObjects(state);
      this.viewObjects['icon'] = this.conveyingLyph.viewObjects['main'];

      this.viewObjects['iconLabel'] = this.conveyingLyph.viewObjects["label"];
      if (!this.viewObjects['iconLabel']) {
        delete this.viewObjects['iconLabel'];
      }
    }
  }

  /**
   * Update the position of the link and realign its conveying lyph
   * @param state - layout parameters
   */
  updateViewObjects(state) {
    if (!this.viewObjects["main"] ||
      (this.conveyingLyph && !this.conveyingLyph.lyphObjects[state.method]) ||
      (!this.labelObjects[state.linkLabel] && this[state.linkLabel])) {
      this.createViewObjects(state);
    }
    let linkObj = this.viewObjects["main"];

    let _start = new THREE.Vector3(this.source.x, this.source.y, this.source.z || 0);
    let _end = new THREE.Vector3(this.target.x, this.target.y, this.target.z || 0);
    let points = [_start, _end];
    this.center = _start.clone().add(_end).multiplyScalar(0.5);

    switch (this.type) {
      case LINK_TYPES.AXIS:
        {
          if (!linkObj) {
            return;
          }
          copyCoords(linkObj.geometry.vertices[0], this.source);
          copyCoords(linkObj.geometry.vertices[1], this.target);
          linkObj.geometry.verticesNeedUpdate = true;
          linkObj.computeLineDistances();
          break;
        }
      case LINK_TYPES.PATH:
        {
          const curve = bezierSemicircle(_start, _end);
          this.center = curve.getPoint(0.5);
          points = curve.getPoints(state.linkResolution - 1);

          //Position omega tree roots
          let hostedNodes = state.graphData.nodes.filter(node => (node.host === this.id) && node.isRoot);
          if (hostedNodes.length > 0) {
            const delta = ((hostedNodes.length % 2) === 1) ? 0.4 : 0;
            const offset = 1 / (hostedNodes.length + 1 + delta);
            hostedNodes.forEach((node, i) => {
              const pos = curve.getPoint(node.offset ? node.offset : offset * (i + 1));
              copyCoords(node, pos);
            });
          }
          break;
        }
    }

    let labelObj = this.viewObjects["label"];
    if (labelObj) {
      labelObj.visible = state.showLinkLabel;
      copyCoords(labelObj.position, this.center);
      labelObj.position.addScalar(5);
    } else {
      delete this.viewObjects["label"];
    }

    if (this.conveyingLyph) {
      this.conveyingLyph.updateViewObjects(state);
      this.viewObjects['icon'] = this.conveyingLyph.viewObjects["main"];
      this.viewObjects['iconLabel'] = this.conveyingLyph.viewObjects["label"];
      if (!this.viewObjects['iconLabel']) {
        delete this.viewObjects['iconLabel'];
      }
    } else {
      delete this.viewObjects['icon'];
      delete this.viewObjects["iconLabel"];
    }

    //Update buffered geometries
    if ((this.type === LINK_TYPES.LINK) || (this.type === LINK_TYPES.PATH)) {
      if (linkObj && linkObj.geometry.attributes) {
        let newGeom;
        if (state.linkGeometry === 'TUBE') {
          newGeom = getTubeGeom(points, this.nLongitudinalSegments, this.lineWidth, this.radialSegments, this.closed);
          linkObj.geometry = newGeom;

        } else if (state.linkGeometry === 'MESHLINE') {
          newGeom = getMeshLineGeometry(points);

          linkObj.geometry = newGeom;

          if (linkObj.material.type !== 'MeshLineMaterial') {
            this.meshLineMaterial = new MeshLine.MeshLineMaterial({
              color: new THREE.Color(this.color),
              lineWidth: this.lineWidth
            });
            linkObj.material = this.meshLineMaterial;
          }

        } else if (state.linkGeometry === 'LINE') {
          let linkPos = linkObj.geometry.attributes.position;

          for (let i = 0; i < points.length; i++) {
            linkPos.array[3 * i] = points[i].x;
            linkPos.array[3 * i + 1] = points[i].y;
            linkPos.array[3 * i + 2] = points[i].z;
          }
          linkPos.needsUpdate = true;
          linkObj.geometry.computeBoundingSphere();
        } else if (state.linkGeometry === 'LINE2') {
          let linkPos = linkObj.geometry.attributes.position;
          let newPoints = [];

          for (let i = 0; i < points.length; i++) {
            newPoints.push(points[i].x, points[i].y, points[i].z);
          }

          linkPos.needsUpdate = true;
          linkObj.geometry.setPositions(newPoints);

        }
        linkObj.geometry.attributes.position.dynamic = true;

      }


    }


  }
}
