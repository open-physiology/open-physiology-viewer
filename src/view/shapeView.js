import {modelClasses} from "../model";
import {merge, values} from 'lodash-bound';
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
    isInRange,
    THREE
} from "./utils";
import { fitToTargetRegion, LYPH_H_PERCENT_MARGIN, maxLyphSize, pointAlongLine, DIMENSIONS } from "./render/autoLayout";
import { getBoundingBoxSize, getWorldPosition } from "./render/autoLayout/objects";
import { setLyphPosition, setLyphScale } from "./render/autoLayout/transform";

const {Region, Lyph, Border, Wire, VisualResource, Shape} = modelClasses;

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
        return (this._points||[]).map(p => this.translate(p));
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

Lyph.prototype.autoSize = function(){
    if (this.viewObjects["main"]) {
        let hostMesh = this.hostedBy?.viewObjects["main"];
        let lyph = this.viewObjects["main"];
        const lyphDim = getBoundingBoxSize(lyph);

        if ( hostMesh ) {
            fitToTargetRegion(hostMesh, lyph, false); 

            // extract host mesh size
            const maxSize = maxLyphSize(hostMesh);

            const hostMeshPosition = getWorldPosition(hostMesh);
            const refWidth  = lyphDim.x * lyph.scale.x;
            const refPaddingX = refWidth * LYPH_H_PERCENT_MARGIN * 0.5 ;
            const matchIndex = this.hostedBy?.hostedLyphs?.indexOf(lyph.userData);

            let targetX = hostMeshPosition.x - (((maxSize + refPaddingX )* this.hostedBy?.hostedLyphs.length) * .5 );
            let targetY = hostMeshPosition.y;

            targetX = targetX + refPaddingX + refWidth * matchIndex + ( 2 * refPaddingX * matchIndex);
            
            lyph.position.x = targetX ;
            lyph.position.y = targetY ;
            lyph.position.z = DIMENSIONS.SHAPE_MIN_Z * 2;

        } else {
            let wiredTo = this.wiredTo?.viewObjects["main"];

            if ( wiredTo && !lyph.hidden ) {
                let wiredLyphs = [];
                this.wiredTo?.wiredChains?.forEach( c => c.lyphs.forEach( l => !l.hidden && wiredLyphs.push(l)) );
                let index = wiredLyphs?.findIndex(l => l.id === this.id );

                let position = this.wiredTo.center;
                if ( wiredLyphs.length > 1 ){
                    const pointA = this.wiredTo?.points[0];
                    const pointB = this.wiredTo?.points[this.wiredTo?.points.length - 1];
                    position = pointAlongLine(pointA, pointB, (index + 1) / (wiredLyphs.length + 1)); 
                }
                setLyphScale(lyph);
                lyph.scale.setY(lyph.scale.y * .7);
                setLyphPosition(lyph, wiredTo, position);
                const refHeight  = lyphDim.y * lyph.scale.y;
                lyph.position.y = lyph.position.y + refHeight/3;
                wiredLyphs?.forEach( wL => wL.hostedLyphs?.forEach ( hL => fitToTargetRegion(wL.viewObjects["main"], hL.viewObjects["main"], false)));

            }
        }
        copyCoords(this, lyph.position);  
        this.updateLabels(this.viewObjects["main"].position.clone().addScalar(this.state.labelOffset.Lyph));       
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
    if (this.isTemplate){
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
        obj.visible = !this.hidden;
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

    let obj = this.viewObjects["main"];

    if (state.showLyphs3d && this.viewObjects["3d"]){
        obj = this.viewObjects["main"];
    }

    if (!obj){
        //Saves viewer from failing when trying to visualize a lyph template which was not replaced by an instance
        return;
    }

    obj.visible = !this.hidden;
    if (!this.layerIn) {//update label
        if (!this.internalIn) {
            const labelKey = state.labels[this.constructor.name];
            if (!(this.labels[labelKey] && this[labelKey])) {
                this.createViewObjects(this.state);
            }
        }
        //update lyph
        obj.visible = !this.hidden;
        this.setMaterialVisibility(!this.layers || this.layers.length === 0 || !state.showLayers); //do not show lyph if its layers are non-empty and are shown

        copyCoords(obj.position, this.center);

        //https://stackoverflow.com/questions/56670782/using-quaternions-for-rotation-causes-my-object-to-scale-at-specific-angle
        //preventing this
        if (!obj.userData.hostedBy)
          align(this.axis, obj, this.axis.reversed);
        // if (this.angle){
        //     this.viewObjects["2d"].rotateZ(Math.PI * this.angle / 180); //TODO test
        // }
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


///////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Positions a point on a region surface
 * @param p0 - initial point (coordinates)
 * @returns {Object} transformed point (coordinates)
 */
Region.prototype.translate = function (p0) {
    if (!p0 || !this.viewObjects["main"]) { return; }
    return p0.clone();
};

/**
 * Compute region border points
 * @param edgeResolution
 */
Region.prototype.updatePoints = function(edgeResolution){
    if (this.facets && this.facets.length > 1) {
        this.points = [];
        this.facets.forEach((wire, i) => {
            if (!wire.source || !wire.target) {
                return;
            }
            let start = extractCoords(wire.source.layout);
            let end = extractCoords(wire.target.layout);
            const next = this.facets[(i+1) % this.facets.length];
            if ((wire.source.id === next.source.id) || (wire.source.id === next.target.id)) {
                let tmp = start;
                start = end;
                end = tmp;
            }
            if (wire.geometry !== Wire.WIRE_GEOMETRY.LINK) {
                let curve = wire.getCurve(start, end);
                if (curve.getPoints) {
                    let points = curve.getPoints(edgeResolution-1);
                    this.points.push(...points);
                }
            } else {
                this.points.push(start);
            }
        });
    }
    this.points = this.points.map(p => new THREE.Vector3(p.x, p.y,0));
    this.center = getCenterOfMass(this.points);
}

/**
 * Create visual objects of a region
 * @param state
 */
Region.prototype.createViewObjects = function(state) {
    Shape.prototype.createViewObjects.call(this, state);
    if (!this.viewObjects["main"]) {
        this.updatePoints(state.edgeResolution);
        let shape = new THREE.Shape(this.points.map(p => new THREE.Vector2(p.x, p.y))); //Expects Vector2
        let obj = createMeshWithBorder(shape, {
                color: "#9acce3",
                polygonOffsetFactor: this.polygonOffsetFactor
            },
            !this.facets // draw border if region is not defined by facets (e.g., to distinguish regions in connectivity models)
        );
        obj.userData = this;
        this.viewObjects['main'] = obj;
        this.border.createViewObjects(state);
    }
    this.createLabels();
};

/**
 * Update visual objects of a region
 */
Region.prototype.updateViewObjects = function(state) {
    state &&  Shape.prototype.updateViewObjects.call(this, state);
    let obj = this.viewObjects["main"];

    if (obj) {
        let linkPos = obj.geometry.attributes && obj.geometry.attributes.position;
        if (linkPos) {
            state &&  this.updatePoints(state.edgeResolution);
            this.points.forEach((p, i) => p && ["x", "y", "z"].forEach((dim, j) => linkPos.array[3 * i + j] = p[dim]));
            linkPos.needsUpdate = true;
            obj.geometry.computeBoundingSphere();
        }
        obj.visible = !this.inactive;
    }

    state && this.border.updateViewObjects(state);
    state && this.updateLabels(this.center.clone().addScalar(this.state.labelOffset.Region));

    if ( this.hostedLyphs?.length > 0 && obj ) {
        this.hostedLyphs?.forEach( lyph => {
            if ( !lyph.hidden && lyph.viewObjects["main"] ) {
                const lyphMesh = lyph.viewObjects["main"];
                fitToTargetRegion(obj, lyphMesh, false); 

                // extract host mesh size
                const maxSize = maxLyphSize(obj);
                const lyphDim = getBoundingBoxSize(lyphMesh);
                const hostMeshPosition = getWorldPosition(obj);
                const refWidth  = lyphDim.x * lyphMesh.scale.x;
                const refPaddingX = refWidth * LYPH_H_PERCENT_MARGIN * 0.5 ;
                const matchIndex = this.hostedLyphs?.indexOf(lyph);
            
                let targetX = hostMeshPosition.x - (((maxSize + refPaddingX )* this.hostedLyphs.length) * .5 );
                let targetY = hostMeshPosition.y;
            
                targetX = targetX + refPaddingX + refWidth * matchIndex + ( 2 * refPaddingX * matchIndex);
                
                lyphMesh.position.x = targetX ;
                lyphMesh.position.y = targetY ;
                lyphMesh.position.z = DIMENSIONS.SHAPE_MIN_Z;
                copyCoords(lyph, lyphMesh.position);         
            }
        })
    }
};

Region.prototype.relocate = function (delta){
    (this.borderAnchors||[]).forEach(anchor => {
        anchor.relocate(delta);
    });
    (this.facets||[]).forEach(facet => facet.updateViewObjects(this.state));
    this.updateViewObjects(this.state);
}

/**
 * Resizes the rectangle when a border anchor is dragged
 * @param anchor  - anchor on the region border that has been relocated
 * @param delta   - vector to shift the anchor
 * @param epsilon - allowed distance between coordinates that are considered the same
 */
Region.prototype.resize = function (anchor, delta, epsilon = 5) {
    if (!anchor || !anchor.onBorderInRegion){ return; }
    let base = extractCoords(anchor);
    ["x", "y"].forEach(dim => {
        //shift straight wires
        function relocateAdjacent(wire, prop){
            if (wire.geometry === Wire.WIRE_GEOMETRY.LINK &&
                Math.abs(wire[prop][dim] - (base[dim] - delta[dim])) < epsilon) {
                relocate.add(wire[prop]);
            }
        }
        const relocate = new Set();
        (anchor.sourceOf||[]).forEach(wire => relocateAdjacent(wire, "target"));
        (anchor.targetOf||[]).forEach(wire => relocateAdjacent(wire, "source"));
        const anchors = [...relocate];
        let _delta = new THREE.Vector3(0, 0, 0);
        _delta[dim] = delta[dim];
        anchors.forEach(anchor => anchor.relocate(_delta, false));
    });
    (this.facets||[]).forEach(facet => facet.updateViewObjects(this.state));
    this.updatePoints(this.state.edgeResolution);
}

/**
 * @property polygonOffsetFactor
 */
Object.defineProperty(Region.prototype, "polygonOffsetFactor", {
    get: function() {
        const def = this.depth || 0;
        return this.internalIn? (this.internalIn.polygonOffsetFactor || 0) - 1 : def;
    }
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
    VisualResource.prototype.createViewObjects.call(this, state);
    //Make sure we always have border objects regardless of data input
    for (let i = 0; i < this.borders.length; i++){
        let points = this.host.points;
        this.borders[i]::merge({
            "length": points[(i + 1) % points.length].distanceTo(points[i])
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

    for (let i = 0; i < this.borders.length ; i++){
        copyCoords(this.borders[i].source, this.host.points[ i ]);
        copyCoords(this.borders[i].target, this.host.points[ (i + 1) % this.borders.length]);
        this.borders[i].updateViewObjects(state);

        //Position hostedNodes exactly on the edge shape
        //TODO move this into Link class as this is not applicable to Wires
        let borderLyph = this.borders[i].conveyingLyph;
        if (borderLyph && borderLyph.viewObjects) {
            borderLyph.viewObjects::values().forEach(obj => obj && this.state.graphScene.add(obj));
        }
        if (this.borders[i].hostedNodes) {
            //position nodes on the lyph border (exact shape)
            let n = this.borders[i].hostedNodes.length;
            const offset = 1 / (n + 1);
            let V = this.host.points[i + 1].clone().sub(this.host.points[i]);
            this.borders[i].hostedNodes.forEach((node, j) => {
                //For borders 2 and 3 position nodes in the reversed order to have parallel links
                let d_i = node.offset !== undefined? node.offset : offset * (j + 1);
                if (i > 1) {
                    d_i = 1 - d_i;
                }
                //TODO cysts may have shifted nodes on layer borders
                copyCoords(node, this.host.points[i].clone().add(V.clone().multiplyScalar(d_i)));
            })
        }
    }

    (this.host.internalNodes || []).forEach((node, i) => {
        let d_i = node.offset !== undefined? node.offset: (i + 1) / (this.host.internalNodes.length + 1);
        this.host.placeNodeInside(node, d_i);
    })

    const lyphsToLinks = lyphs => (lyphs || []).filter(lyph => lyph.axis).map(lyph => lyph.axis);

    const hostedLinks = lyphsToLinks(this.host.hostedLyphs);
    hostedLinks.forEach((link, i) => this.host.placeLinkInside(link, i, Math.floor(Math.sqrt(hostedLinks.length||1)), hostedLinks.length));

    const numCols = this.host.internalLyphColumns || 1;
    const internalLinks = lyphsToLinks(this.host.internalLyphs);
    internalLinks.forEach((link, i) => this.host.placeLinkInside(link, i, numCols, internalLinks.length));
};

/**
 * @property polygonOffsetFactor
 */
Object.defineProperty(Border.prototype, "polygonOffsetFactor", {
    get: function() {
        return this.host? this.host.polygonOffsetFactor: 0;
    }
});

