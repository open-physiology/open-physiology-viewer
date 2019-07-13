import {modelClasses} from "../model/index.js";
import {merge} from 'lodash-bound';
import {
    align,
    copyCoords,
    createMeshWithBorder,
    d3Layer,
    d3Lyph,
    getCenterOfMass,
    getCenterPoint,
    layerShape,
    lyphShape,
    extractCoords,
    boundToPolygon,
    boundToRectangle,
    isInRange,
    THREE
} from "./utils";

const {Region, Lyph, Border} = modelClasses;

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
 * @returns {Vector3} transformed point (coordinates)
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
    }

    for (let i = 1; i < (this.layers || []).length; i++) {
        this.layers[i].prev = this.layers[i - 1];
        this.layers[i].prev.next = this.layers[i];
    }

    //Create a lyph object
    if (!this.viewObjects["2d"]) {
        //Either use given dimensions or set from axis
        this.width = this.width || this.size.width;
        this.height = this.height || this.size.height;

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
                [this.prev.width, prev.height, radius, ...this.prev.radialTypes],
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
    this.createLabels(state);
};

/**
 * Update visual objects for a lyph
 * @param state
 */
Lyph.prototype.updateViewObjects = function(state) {
    if (!this.axis) { return; }

    let viewObj = this.viewObjects["main"] = this.viewObjects["2d"];
    if (!viewObj) {
        this.createViewObjects(state);
        viewObj = this.viewObjects["main"];
    }

    if (state.showLyphs3d && this.viewObjects["3d"]){
        viewObj = this.viewObjects["main"] = this.viewObjects["3d"];
    }

    if (!this.layerIn) {//update label
        if (!this.internalIn) {
            if (!(this.labels[state.labels[this.constructor.name]] && this[state.labels[this.constructor.name]])) {
                this.createViewObjects(state);
            }
        }
        //update lyph
        viewObj.visible = this.isVisible && state.showLyphs;
        this.setMaterialVisibility(!this.layers || this.layers.length === 0 || !state.showLayers); //do not show lyph if its layers are non-empty and are shown

        copyCoords(viewObj.position, this.center);

        align(this.axis, viewObj, this.axis.reversed);
        if (this.angle){
            this.viewObjects["2d"].rotateZ(Math.PI * this.angle / 180); //TODO test
        }
    } else {
        viewObj.visible = state.showLayers;
    }

    //update layers
    (this.layers || []).forEach(layer => layer.updateViewObjects(state));

    this.border.updateViewObjects(state);

    //Layers and inner lyphs have no labels
    if (this.layerIn || this.internalIn) { return; }

    this.updateLabels(state, this.center.clone().addScalar(state.labelOffset.Lyph));
};


/**
 * @property polygonOffsetFactor
 */
Object.defineProperty(Lyph.prototype, "polygonOffsetFactor", {
    get: function() {
        return Math.min(
            ...["axis", "layerIn", "internalIn", "hostedBy"].map(prop => this[prop]?
                (this[prop].polygonOffsetFactor || 0) - 1: 0));
    }
});


///////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Positions a point on a region surface
 * @param p0 - initial point (coordinates)
 * @returns {Vector3} transformed point (coordinates)
 */
Region.prototype.translate = function (p0) {
    if (!p0 || !this.viewObjects["main"]) { return p0; }
    return p0.clone();
};

/**
 * Create visual objects of a region
 * @param state
 */
Region.prototype.createViewObjects = function(state) {
    this.points = this.points.map(p => new THREE.Vector3(p.x, p.y, 0));
    let shape = new THREE.Shape(this.points.map(p => new THREE.Vector2(p.x, p.y))); //Expects Vector2
    this.center = getCenterOfMass(this.points);

    let obj = createMeshWithBorder(shape, {
        color: this.color,
        polygonOffsetFactor: this.polygonOffsetFactor
    });
    obj.userData = this;
    this.viewObjects['main'] = obj;
    this.border.createViewObjects(state);
    this.createLabels(state);
};

/**
 * Update visual objects of a region
 * @param {Object} state - graph configuration
 */
Region.prototype.updateViewObjects = function(state) {
    this.border.updateViewObjects(state);
    this.updateLabels(state,  this.center.clone().addScalar(state.labelOffset.Region));
};


/**
 * @property polygonOffsetFactor
 */
Object.defineProperty(Region.prototype, "polygonOffsetFactor", {
    get: function() { return 1; }
});


/////////////////////////////////////////////////////////////////////////////////////////

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
    //Make sure we always have border objects regardless of data input
    for (let i = 0; i < this.borders.length; i++){
        this.borders[i]::merge({
            "length": this.host.points[i + 1].distanceTo(this.host.points[i])
        });
        if (this.borders[i].conveyingLyph) {
            this.borders[i].conveyingLyph.conveyedBy = this.borders[i];
            this.borders[i].createViewObjects(state);
            state.graphScene.add(this.borders[i].conveyingLyph.viewObjects["main"]);
        }
    }
};

/**
 * Update visual objects for a shape border
 * @param state
 */
Border.prototype.updateViewObjects = function(state){

    /**
     * Assigns fixed position on a grid inside border
     * @param link - link to place inside border
     * @param i    - position
     * @param numCols - number of columns
     * @param numRows - number of Rows
     */
    const placeLinkInside = (link, i, numCols, numRows) => {//TODO this will only work well for rectangular shapes
        if (!link.source || !link.target){ return; }
        if (link.source.isConstrained || link.target.isConstrained){ return; }

        let delta = 0.05; //offset from the border
        let p = this.host.points.slice(0,3).map(p => p.clone());
        p.forEach(p => p.z += 1);

        let isReversed = link.reversed || isInRange(90, 270, link.conveyingLyph.angle);

        let dX = p[1].clone().sub(p[0]);
        let dY = p[2].clone().sub(p[1]);
        let tmp = delta + Math.floor(i / numCols) / (numRows * (1 + 2 * delta) );
        let offsetY  = dY.clone().multiplyScalar(isReversed? 1 - tmp: tmp);
        let sOffsetX = dX.clone().multiplyScalar(i % numCols / numCols + link.source.offset || 0);
        let tOffsetX = dX.clone().multiplyScalar(1 - (i % numCols + 1) / numCols + link.target.offset || 0);

        let v1 = p[0].clone().add(sOffsetX).add(offsetY);
        let v2 = p[1].clone().sub(tOffsetX).add(offsetY);
        copyCoords(link.source, v1);
        copyCoords(link.target, v2);

        //link.polygonOffsetFactor = this.polygonOffsetFactor - 1;
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
            console.warn(`Cannot place a node inside border ${this.id}`, node);
            return;
        }
        let [min, max] = this.getBoundingBox();
        let dX = max.x - min.x; let dY = max.y - min.y;
        let r  = Math.min(dX, dY) / 4;
        let offset = new THREE.Vector3( r, 0, 0 );
        let axis   = new THREE.Vector3( 0, 0, 1);
        let angle  = 4 * Math.PI * i / n;
        offset.applyAxisAngle( axis, angle );
        let pos = center.clone().add(offset);
        copyCoords(node, pos);
        node.z += 1;
    };

    const pushNodeInside = (node) => {
        const delta = 5;
        let points = this.host.points.map(p => p.clone());
        let [min, max] = this.getBoundingBox();
        if (Math.abs(max.z - min.z) <= delta) {
            node.z = points[0].z + 1;
        } else {
            //Project links with hosted lyphs to the container lyph plane
            let plane = new THREE.Plane();
            plane.setFromCoplanarPoints(...points.slice(0,3));
            let point = extractCoords(node);
            plane.projectPoint(point, point);
            node.z += 1;
            copyCoords(node, point);
        }
        boundToRectangle(node, min, max);
    };

    /**
     * Push existing link inside of the border
     * @param link
     */
    const pushLinkInside = (link) => {
        if (!link.source || !link.target){ return; }
        //TODO test || vs &&
        if (link.source.isConstrained || link.target.isConstrained){ return; }

        const delta = 5;
        let points = this.host.points.map(p => p.clone());
        let [min, max] = this.getBoundingBox();
        //Global force pushes content on top of lyph
        if (Math.abs(max.z - min.z) <= delta) {
            //Fast way to get projection for lyphs parallel to x-y plane
            link.source.z = link.target.z = points[0].z + 1;
        } else {
            //Project links with hosted lyphs to the container lyph plane
            let plane = new THREE.Plane();
            plane.setFromCoplanarPoints(...points.slice(0,3));

            ["source", "target"].forEach(key => {
                let point = extractCoords(link[key]);
                plane.projectPoint(point, point);
                point.z += 1;
                copyCoords(link[key], point);
            });
        }
        boundToRectangle(link.source, min, max);
        boundToRectangle(link.target, min, max);
        let [dX, dY] = ["x", "y"].map(key => points.map(p => Math.min(p[key] - min[key], max[key] - p[key])));
        if (Math.max(...[...dX,...dY]) > delta) { //if the shape is not rectangle
            //Push the link to the tilted lyph rectangle
            boundToPolygon(link, this.borders);
        }
    };

    for (let i = 0; i < this.borders.length ; i++){
        copyCoords(this.borders[i].source, this.host.points[ i ]);
        copyCoords(this.borders[i].target, this.host.points[i + 1]);
        this.borders[i].updateViewObjects(state);
        //Position hostedNodes exactly on the link shape
        if (this.borders[i].hostedNodes){
            //position nodes on the lyph border (exact shape)
            const offset = 1 / (this.borders[i].hostedNodes.length + 1);
            let V = this.host.points[i + 1].clone().sub(this.host.points[i]);
            this.borders[i].hostedNodes.forEach((node, j) => {
                let d_i = node.offset ? node.offset : offset * (j + 1);
                // let p = this.viewObjects["shape"][i].getPoint(d_i);
                // p = new THREE.Vector3(p.x, p.y, 1);
                // copyCoords(node, this.host.translate(p));
                //TODO this only works for tubes, cysts may have shifted nodes on layer borders
                copyCoords(node, this.host.points[i].clone().add(V.clone().multiplyScalar(d_i)));
            })
        }
    }

    //By doing the update here, we also support inner content in the region
    const lyphsToLinks = (lyphs) => (lyphs || []).filter(lyph => lyph.axis).map(lyph => lyph.axis);

    let hostedLinks   = lyphsToLinks(this.host.hostedLyphs);
    let internalLinks = lyphsToLinks(this.host.internalLyphs);

    hostedLinks.forEach((link) => { pushLinkInside(link); });
    let numCols = this.host.internalLyphColumns || 1;
    let numRows = internalLinks.length / numCols;
    internalLinks.forEach((link, i) => placeLinkInside(link, i, numCols, numRows));

    let center = getCenterOfMass(this.host.points);
    (this.host.internalNodes || []).forEach((node, i) => placeNodeInside(node, i, this.host.internalNodes.length, center));
};

/**
 * @property polygonOffsetFactor
 */
Object.defineProperty(Border.prototype, "polygonOffsetFactor", {
    get: function() {
        return this.host? this.host.polygonOffsetFactor: 0;
    }
});

