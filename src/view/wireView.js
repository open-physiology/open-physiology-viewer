import {$Field, modelClasses} from "../model";
import {
    extractCoords,
    THREE,
    copyCoords,
    getPoint
} from "./utils";
import {Edge} from "./edgeView";

const {Wire} = modelClasses;

/**
 * Create visual objects for a wire
 * @param state
 */
Wire.prototype.createViewObjects = function(state){
    Edge.prototype.createViewObjects.call(this, state);
    if (!this.viewObjects["main"]) {
        if (this.geometry === Wire.WIRE_GEOMETRY.INVISIBLE)  { return; }
        let obj = Edge.prototype.getViewObject.call(this, state);
        obj.renderOrder = 10;  // Prevents visual glitches of dark lines on top of nodes by rendering them last
        obj.userData = this;   // Attach link data
        this.viewObjects["main"] = obj;
    }
    this.createLabels();
};

Wire.prototype.getCurve = function(start, end){
    switch (this.geometry) {
        case Wire.WIRE_GEOMETRY.ELLIPSE:
            let c = extractCoords(this.arcCenter);
            return new THREE.EllipseCurve(c.x, c.y, this.radius.x, this.radius.y, 0, 2*Math.PI, false);
        default:
            return Edge.prototype.getCurve.call(this, start, end);
    }
};

Wire.prototype.relocate = function(delta, epsilon = 5){
    if (this.geometry === Wire.WIRE_GEOMETRY.LINK) {
        if (Math.abs(this.source.x - this.target.x) < epsilon) {
            delta.y = 0;
        } else {
            if (Math.abs(this.source.y - this.target.y) < epsilon) {
                delta.x = 0;
            }
        }
    }
    if (this.geometry === Wire.WIRE_GEOMETRY.ELLIPSE){
        this.radius.x = Math.max(10, this.radius.x + delta.x);
        this.radius.y = Math.max(10, this.radius.y + delta.y);
    } else {
        [$Field.source, $Field.target].forEach(prop => this[prop].relocate(delta));
    }
    this.updateViewObjects(this.state);
    return [this.source, this.target];
}

/**
 * Update visual objects for a wire
 */
Wire.prototype.updateViewObjects = function(state) {
    Edge.prototype.updateViewObjects.call(this, state);

    let start = extractCoords(this.source);
    let end   = extractCoords(this.target);
    let curve = this.getCurve(start, end);
    this.center = getPoint(curve, start, end, 0.5);
    this.points = curve.getPoints? curve.getPoints(this.pointLength): [start, end];

    if ([Wire.WIRE_GEOMETRY.ARC, Wire.WIRE_GEOMETRY.ELLIPSE].includes(this.geometry)){
        this.points = this.points.map(p => new THREE.Vector3(p.x, p.y, 0));
    }

    (this.hostedAnchors||[]).forEach((anchor, i) => {
        let d_i = anchor.offset !== undefined? anchor.offset : (i + 1) / (this.hostedAnchors.length + 1);
        let pos = getPoint(curve, start, end, d_i);
        pos = new THREE.Vector3(pos.x, pos.y, 0); //Arc wires are rendered in 2d
        copyCoords(anchor, pos);
        if (anchor.viewObjects["main"]) {
            copyCoords(anchor.viewObjects["main"].position, anchor);
            anchor.updateLabels(anchor.viewObjects["main"].position.clone().addScalar(this.state.labelOffset.Vertice));
        }
        //When hosted anchor is repositioned, the wires that end in it should be updated too
        (anchor.sourceOf||[]).forEach(w => w.updateViewObjects(state));
        (anchor.targetOf||[]).forEach(w => w.updateViewObjects(state));

    });

    // Update stratification (2D simplified icon)
    this.stratifiedRegion?.updateViewObjects(state);
    this.viewObjects['icon']      = this.stratifiedRegion?.viewObjects["main"];
    this.viewObjects['iconLabel'] = this.stratifiedRegion?.viewObjects["label"];

    this.updateLabels(this.center.clone().addScalar(this.state.labelOffset.Edge));

    if (this.geometry === Wire.WIRE_GEOMETRY.INVISIBLE)  { return; }

    const obj = this.viewObjects["main"];
    if (obj) {
        if (this.stroke === Wire.EDGE_STROKE.THICK){
            let coordArray = [];
            this.points.forEach(p => coordArray.push(p.x, p.y, p.z));
            obj.geometry.setPositions(coordArray);
        } else {
            if (this.stroke === Wire.EDGE_STROKE.DASHED) {
                obj.geometry.setFromPoints(this.points);
                obj.geometry.verticesNeedUpdate = true;
                obj.computeLineDistances();
            } else {
                let linkPos = obj.geometry.attributes && obj.geometry.attributes.position;
                if (linkPos) {
                    this.points.forEach((p, i) => p && ["x", "y", "z"].forEach((dim,j) => linkPos.array[3 * i + j] = p[dim]));
                    linkPos.needsUpdate = true;
                    obj.geometry.computeBoundingSphere();
                }
            }
        }
    }
};

Object.defineProperty(Wire.prototype, "polygonOffsetFactor", {
    get: function() {
        return Math.min(...["source", "target"].map(prop => this[prop]?
            (this[prop].polygonOffsetFactor || 0) - 1: 0));
    }
});
