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
} from "./utils";

const {Lyph, Shape} = modelClasses;

/**
 * @property center
 */
Object.defineProperty(Lyph.prototype, "center", {
    get: function() {
        let res = new THREE.Vector3();
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
 * Set visibility of object's material (children may remain visible even if the object is hidden)
 * @param isVisible
 */
Lyph.prototype.setMaterialVisibility = function(isVisible){
    if (this.viewObjects["2d"]) {
        const mat = this.viewObjects["2d"].material;
        mat.visible = isVisible;
        mat.depthWrite = !isVisible;
        mat.depthTest = !isVisible;
        mat.needsUpdate = isVisible;
        let children = this.viewObjects["2d"].children;
        if (children?.length > 0){
            const mat = children[0].material;
            mat.visible = isVisible;
            mat.depthWrite = !isVisible;
            mat.depthTest = !isVisible;
            mat.needsUpdate = isVisible;
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
    if (!this.axis || this.isTemplate){
        return;
    }
    Shape.prototype.createViewObjects.call(this, state);

    //Create a lyph object
    if (!this.viewObjects["2d"]) {
        for (let i = 1; i < (this.layers || []).length; i++) {
            this.layers[i].prev = this.layers[i - 1];
            this.layers[i].prev.next = this.layers[i];
        }
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
        state.graphScene.add(obj);

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
                state.graphScene.add(obj3d);
            }
        }

        this._points = [
            new THREE.Vector3(offset, -this.height / 2, 0),
            new THREE.Vector3(offset, this.height / 2, 0),
            new THREE.Vector3(offset + this.width, this.height / 2, 0),
            new THREE.Vector3(offset + this.width, -this.height / 2, 0),
            new THREE.Vector3(offset, -this.height / 2, 0)
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
            layer.layerWidth = layer.layerWidth || defaultWidth;
            layer.width = layer.layerWidth / 100 * this.width;
            layer.height = this.height;
            layer.createViewObjects(state);
            let layerObj = layer.viewObjects["2d"];
            if (layerObj) {
                this.viewObjects["2d"].add(layerObj);
                layerObj.translateX(relOffset);
            }
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
    // auto layout is handling this
    Shape.prototype.updateViewObjects.call(this, state);

    if (!this.axis) { return; }

    this.createViewObjects(state);

    let obj = this.viewObjects["main"] = this.viewObjects["2d"];

    if (state.showLyphs3d && this.viewObjects["3d"]){
        obj = this.viewObjects["main"] = this.viewObjects["3d"];
    }

    //Saves viewer from failing when trying to visualize a lyph template which was not replaced by an instance
    if (!obj) return;

    if (!this.layerIn) {//update label
        if (!this.internalIn) {
            const labelKey = state.labels[this.constructor.name];
            if (!(this.labels[labelKey] && this[labelKey])) {
                this.createViewObjects(this.state);
            }
        }
        //update lyph
        obj.visible = this.isVisible && state.showLyphs;
        this.setMaterialVisibility(!this.layers || this.layers.length === 0 || !state.showLayers); //do not show lyph if its layers are non-empty and are shown

        copyCoords(obj.position, this.center);

        //https://stackoverflow.com/questions/56670782/using-quaternions-for-rotation-causes-my-object-to-scale-at-specific-angle
        //preventing this
        if (!obj.userData.hostedBy)
          align(this.axis, obj, this.axis.reversed);
        if (this.angle){
            this.viewObjects["2d"].rotateZ(Math.PI * this.angle / 180);
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
