
import {modelClasses} from "../model";
import {
    align,
    copyCoords,
    createMeshWithBorder,
    d3Layer,
    d3Lyph,
    getCenterPoint,
    layerShape,
    lyphShape,
    THREE
} from "./util/utils";

const { Lyph, Shape} = modelClasses;
import { GeometryFactory } from './util/geometryFactory'

/**
 * @property polygonOffsetFactor
 */
 Object.defineProperty(Lyph.prototype, "polygonOffsetFactor", {
  get: function() {
      return Math.min(
          ...["axis", "layerIn", "internalIn", "hostedBy"].map(prop => this[prop]?
              (this[prop].polygonOffsetFactor || -1) - 1: -1));
  }
});

/**
 * @property center
 */
 Object.defineProperty(Lyph.prototype, "center", {
  get: function() {
      let res = GeometryFactory.instance().createVector3();
      //Note: Do not use lyph borders to compute center as border translation relies on this method
      if (this.axis){
          res = this.axis.center || res;
      }
      if (this.layerIn) {
          if (this.viewObjects["main"]) {
              //Note: it is difficult to compute center of a layer geometrically as we have to translate the host axis
              //in the direction orthogonal to the hosting lyph axis along the plane in which the lyph is placed
              //and it can be placed in any plane passing through the axis!
              res = getCenterPoint(this.viewObjects["main"]);
          } else {
              res = res.translateX(this.offset);
          }
      }
      return res;
  }
});

/**
* @property points
*/
Object.defineProperty(Lyph.prototype, "points", {
  get: function() {
      return (this._points||[]).map(p => this.translate(p))
  }
});

/**
 * @property center
 */
 Object.defineProperty(Lyph.prototype, "center", {
  get: function() {
      let res = GeometryFactory.instance().createVector3();
      //Note: Do not use lyph borders to compute center as border translation relies on this method
      if (this.axis){
          res = this.axis.center || res;
      }
      if (this.layerIn) {
          if (this.viewObjects["main"]) {
              //Note: it is difficult to compute center of a layer geometrically as we have to translate the host axis
              //in the direction orthogonal to the hosting lyph axis along the plane in which the lyph is placed
              //and it can be placed in any plane passing through the axis!
              res = getCenterPoint(this.viewObjects["main"]);
          } else {
              res = res.translateX(this.offset);
          }
      }
      return res;
  }
});

/**
 * @property points
 */
 Object.defineProperty(Lyph.prototype, "points", {
  get: function() {
      return (this._points||[]).map(p => this.translate(p))
  }
});

/*** Set visibility of object's material (children may remain visible even if the object is hidden)
 * @param isVisible
 */
Lyph.prototype.setMaterialVisibility = function(isVisible){
    if (this.viewObjects["2d"]) {
        this.viewObjects["2d"].material.visible = isVisible;
        let children = this.viewObjects["2d"].children;
        if (children && children.length > 0){
            children[0].material.visible = isVisible;
        }
    }
};

/**
 * Positions the point on the lyph surface
 * @param p0 - initial point (coordinates)
 * @returns {Object} transformed point (coordinates)
 */
Lyph.prototype.translate = function(p0) {
    let transformedLyph = this.layerIn ? this.layerIn : this;
    if (!p0 || !transformedLyph.viewObjects["main"]) { return p0; }
    let p = p0.clone();
    p.applyQuaternion(transformedLyph.viewObjects["main"].quaternion);
    p.add(transformedLyph.center);
    return p;
};

/**
 * Create visual objects for a lyph
 * @param state
 */
Lyph.prototype.createViewObjects = function(state) {
    //Cannot draw a lyph without axis
    if (!this.axis) { return; }

    if (this.isTemplate){
        console.warn("Creating visual objects for an abstract lyph", this);
        return;
    }
    Shape.prototype.createViewObjects.call(this, state);

    for (let i = 1; i < (this.layers || []).length; i++) {
        this.layers[i].prev = this.layers[i - 1];
        this.layers[i].prev.next = this.layers[i];
    }

    //Create a lyph object
    if (!this.viewObjects["2d"]) {
        //Either use given dimensions or compute based on axis length
        this.updateSize();
        let params = {
            color: this.color,
            polygonOffsetFactor: this.polygonOffsetFactor
        };

        //The shape of the lyph depends on its position in its parent lyph as layer
        let offset = this.offset;
        let prev = this.prev || this.layerIn? (this.layerIn.prev || this): this;

        let radius = this.height / 8;
        let obj = createMeshWithBorder(this.prev
            ? layerShape(
                [offset, prev.height, radius, ...this.prev.radialTypes],
                [this.width, this.height, radius, ...this.radialTypes])
            : lyphShape([this.width, this.height, radius, ...this.radialTypes]),
            params);
        obj.userData = this;
        this.viewObjects['main'] = this.viewObjects['2d'] = obj;

        if (this.create3d){
            params.opacity = 0.5;
            let obj3d = (offset > 0)
                ? d3Layer(
                    [ offset || 1, prev.height, radius, ...prev.radialTypes],
                    [ offset + this.width, this.height, radius, ...this.radialTypes], params)
                : d3Lyph([this.width, this.height, radius, ...this.radialTypes], params) ;
            obj3d.userData = this;
            this.viewObjects["3d"] = obj3d;
            if (state.showLyphs3d){
                this.viewObjects["main"] = this.viewObjects["3d"];
            }
        }

        this._points = [
            GeometryFactory.instance().createVector3(offset, -this.height / 2, 0),
            GeometryFactory.instance().createVector3(offset, this.height / 2, 0),
            GeometryFactory.instance().createVector3(offset + this.width, this.height / 2, 0),
            GeometryFactory.instance().createVector3(offset + this.width, -this.height / 2, 0),
            GeometryFactory.instance().createVector3(offset, -this.height / 2, 0)
        ];

        //Border uses corner points
        this.border.createViewObjects(state);

        //Layers
        //Define proportion each layer takes
        let numLayers = (this.layers || [this]).length;
        let resizedLayers = (this.layers || []).filter(layer => layer.layerWidth);
        let layerTotalWidth = 0;
        (resizedLayers || []).forEach(layer => layerTotalWidth += layer.layerWidth);
        let defaultWidth = (resizedLayers.length < numLayers) ?
            (100. - layerTotalWidth) / (numLayers - resizedLayers.length) : 0;

        let relOffset = 0;
        (this.layers || []).forEach(layer => {
            layer.create3d = this.create3d;
            //TODO place sizing code for layers to Lyph.updateSize
            layer.layerWidth = layer.layerWidth || defaultWidth;
            layer.width = layer.layerWidth / 100 * this.width;
            layer.height = this.height;
            layer.createViewObjects(state);
            let layerObj = layer.viewObjects["2d"];
            this.viewObjects["2d"].add(layerObj);
            layerObj.translateX(relOffset);
            relOffset += layer.width;

            let layerObj3d = layer.viewObjects["3d"];
            if (layerObj3d) {
                this.viewObjects["3d"].add(layerObj3d);
            }
        });
    }
    //Do not create labels for layers and nested lyphs
    if (this.layerIn || this.internalIn) { return; }
    this.createLabels();
};

/**
 * Update visual objects for a lyph
 */
Lyph.prototype.updateViewObjects = function(state) {
    Shape.prototype.updateViewObjects.call(this, state);

    if (!this.axis) { return; }

    let obj = this.viewObjects["main"] = this.viewObjects["2d"];
    if (this.state.showLyphs3d && this.viewObjects["3d"]){
        obj = this.viewObjects["main"] = this.viewObjects["3d"];
    }

    if (!this.layerIn) {//update label
        if (!this.internalIn) {
            const labelKey = state.labels[this.constructor.name];
            if (!(this.labels[labelKey] && this[labelKey])) {
                this.createViewObjects(this.state);
            }
        }
        //update lyph
        obj.visible = this.isVisible && this.state.showLyphs;
        this.setMaterialVisibility(!this.layers || this.layers.length === 0 || !state.showLayers); //do not show lyph if its layers are non-empty and are shown

        copyCoords(obj.position, this.center);

        align(this.axis, obj, this.axis.reversed);
        if (this.angle){
            this.viewObjects["2d"].rotateZ(Math.PI * this.angle / 180); //TODO test
        }
    } else {
        obj.visible = this.state.showLayers;
    }

    //update layers
    (this.layers || []).forEach(layer => layer.updateViewObjects(state));

    this.border.updateViewObjects(state);

    //Layers and inner lyphs have no labels
    if (this.layerIn || this.internalIn) { return; }

    this.updateLabels(this.center.clone().addScalar(this.state.labelOffset.Lyph));
};
