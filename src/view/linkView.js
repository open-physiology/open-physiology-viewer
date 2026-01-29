import {modelClasses} from "../model";
import {
    extractCoords,
    THREE,
    copyCoords,
    direction,
    getPoint
} from "./utils";
import {Edge} from "./edgeView";

const {Link} = modelClasses;

/**
 * Create visual objects for a link
 * @param state
 */
Link.prototype.createViewObjects = function(state){
    Edge.prototype.createViewObjects.call(this, state);
    //Link
    if (!this.viewObjects["main"]) {
        let obj = Edge.prototype.getViewObject.call(this, state);

        if (this.directed){
            let dir    = direction(this.source, this.target);
            let arrow  = new THREE.ArrowHelper(dir.normalize(), extractCoords(this.target),
                state.arrowLength, obj.material.color.getHex(),
                state.arrowLength, state.arrowLength * 0.75);
            obj.add(arrow);
        }

        obj.renderOrder = 10;  // Prevents visual glitches of dark lines on top of nodes by rendering them last
        obj.userData = this;   // Attach link data
        this.viewObjects["main"] = obj;
    }

    //Link label
    this.createLabels();

    //Icon (lyph)
    // if (this.conveyingLyph) {
    //     this.conveyingLyph.createViewObjects(state);
    // }

    // Note: we do not make conveying lyphs children of links to include them to the scene
    // because we want to have them in the main scene for highlighting
    // this.viewObjects['icon']      = this.conveyingLyph.viewObjects['main'];
    // this.viewObjects['iconLabel'] = this.conveyingLyph.viewObjects["label"];
};

Link.prototype.getCurve = function(start, end){
    let curve = new THREE.Line3(start, end);
    switch (this.geometry) {
        case Link.LINK_GEOMETRY.PATH:
            if (this.path){
                curve = new THREE.CatmullRomCurve3(this.path);
            }
            break;
        default:
            curve = Edge.prototype.getCurve.call(this, start, end);
    }
    return curve;
};

/**
 * Update visual objects for a link
 */
Link.prototype.updateViewObjects = function(state) {
    Edge.prototype.updateViewObjects.call(this, state);

    const obj = this.viewObjects["main"];
    let start = extractCoords(this.source);
    let end   = extractCoords(this.target);
    let curve = this.getCurve(start, end);
    this.center = getPoint(curve, start, end, 0.5);
    this.points = curve.getPoints? curve.getPoints(this.pointLength): [start, end];

    if (this.geometry === Link.LINK_GEOMETRY.ARC){
        this.points = this.points.map(p => new THREE.Vector3(p.x, p.y,0));
    }

    //Merge nodes of a collapsible link
    if (this.collapsible){
        if (!this.source.isConstrained && !this.target.isConstrained) {
            copyCoords(this.source, this.center);
            copyCoords(this.target, this.center);
        } else {
            if (!this.source.isConstrained) {
                copyCoords(this.source, this.target);
            } else {
                if (!this.target.isConstrained) {
                    copyCoords(this.target, this.source);
                }
            }
        }
    }

    //Position hosted nodes
    (this.hostedNodes||[]).forEach((node, i) => {
        let d_i = node.offset !== undefined? node.offset:  (i + 1) / (this.hostedNodes.length + 1);
        const pos = getPoint(curve, start, end, d_i);
        copyCoords(node, pos);
    });

    this.updateLabels( this.center.clone().addScalar(this.state.labelOffset.Edge));

    // Lyphs are now created on first update - to have a correct size for wired/anchored chains
    this.conveyingLyph?.updateViewObjects(state);
    this.viewObjects['icon']      = this.conveyingLyph?.viewObjects["main"];
    this.viewObjects['iconLabel'] = this.conveyingLyph?.viewObjects["label"];

    //Update buffered geometries
    //Do not update links with fixed node positions
    if (this.geometry === Link.LINK_GEOMETRY.INVISIBLE && this.source.fixed && this.target.fixed)  { return; }

    if (obj) {
        if (this.directed && obj.children[0] && (obj.children[0] instanceof THREE.ArrowHelper)){
            let arrow  = obj.children[0];
            let dir = direction(this.source, this.target);
            let length = curve && curve.getLength? curve.getLength(): dir.length();
            let t = this.state.arrowLength / length;
            if (curve && curve.getTangent){
                dir = curve.getTangent(1 - t);
            }
            let pos = getPoint(curve, start, end, 1 - t);
            copyCoords(arrow.position, pos);
            arrow.setDirection(dir.normalize());
        }
        if (this.stroke === Link.EDGE_STROKE.THICK){
            let coordArray = [];
            this.points.forEach(p => coordArray.push(p.x, p.y, p.z));
            obj.geometry.setPositions(coordArray);
        } else {
            if (this.stroke === Link.EDGE_STROKE.DASHED) {
                obj.geometry.setFromPoints(this.points);
                obj.geometry.verticesNeedUpdate = true;
                obj.computeLineDistances();
            } else {
                let linkPos = obj.geometry.attributes && obj.geometry.attributes.position;
                if (linkPos) {
                    this.points.forEach((p, i) => ["x", "y", "z"].forEach((dim,j) => linkPos.array[3 * i + j] = p[dim]));
                    linkPos.needsUpdate = true;
                    obj.geometry.computeBoundingSphere();
                }
            }
        }
    }
};

Object.defineProperty(Link.prototype, "polygonOffsetFactor", {
    get: function() {
        return Math.min(...["source", "target"].map(prop => this[prop]?
            (this[prop].polygonOffsetFactor || 0) - 1: 0));
    }
});
