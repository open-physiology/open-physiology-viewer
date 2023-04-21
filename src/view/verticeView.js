import {copyCoords, extractCoords, getCenterOfMass, THREE, direction} from "./utils";
import {MaterialFactory} from "./materialFactory";
import {modelClasses} from "../model";
import { on } from "events";
import { getHouseLyph } from "./render/neuroView";
import { pointAlongLine } from "./render/autoLayout"
import { getWorldPosition, getBoundingBoxSize } from "./render/autoLayout/objects";

const {VisualResource, Vertice, Node, Anchor} = modelClasses;

/**
 * Create visual object for vertice
 */
Vertice.prototype.createViewObjects = function(state) {
    VisualResource.prototype.createViewObjects.call(this, state);
    if (this.invisible){ return; }
    if (!this.viewObjects["main"]) {
        let geometry = new THREE.SphereGeometry(this.val * state.verticeRelSize,
            state.verticeResolution, state.verticeResolution);
        let material = MaterialFactory.createMeshLambertMaterial({
            color: this.color,
            polygonOffsetFactor: this.polygonOffsetFactor
        });
        let obj = new THREE.Mesh(geometry, material);
        // Attach vertice data
        obj.userData = this;
        if (this.layout) {
            let coords = extractCoords(this.layout);
            copyCoords(this, coords);
            copyCoords(obj.position, coords);
            this.updateLabels(coords?.clone().addScalar(this.state.labelOffset.Vertice));
        }
        obj.visible = !this.inactive;
        this.viewObjects["main"] = obj;
        this.viewObjects["main"].geometry.computeBoundingSphere();
    }
    this.createLabels();
};

/**
 * Update visual object for vertice
 */
Vertice.prototype.updateViewObjects = function(state) {
    VisualResource.prototype.updateViewObjects.call(this, state);
    if (!this.invisible) {
        this.viewObjects["main"].visible = !this.inactive
    }

    if (this.layout && this.viewObjects["main"]) {
        let coords = extractCoords(this.layout);
        copyCoords(this.viewObjects["main"].position, coords);
        this.updateLabels(coords?.clone().addScalar(this.state.labelOffset.Vertice));
    } else {
        this.updateLabels(this.center?.clone().addScalar(this.state.labelOffset.Vertice));
    }
};

/**
 * Create visual objects for a node
 * @param state
 */
Node.prototype.createViewObjects = function(state) {
    this.val = this.val || state.nodeVal;
    Vertice.prototype.createViewObjects.call(this, state);
};

/**
 * Update visual objects for a node
 */
Node.prototype.updateViewObjects = function(state) {
    Vertice.prototype.updateViewObjects.call(this, state);
    if (this.anchoredTo){
        copyCoords(this, this.anchoredTo);
    } else {
        if (this.fixed && this.layout) {
            copyCoords(this, this.layout);
        } else if (this.hostedBy) {
            let hostedBy = this.hostedBy;
            if ( hostedBy.onBorder ){
                let onBorder = hostedBy.onBorder;
                let host = onBorder?.host;
                if ( host ) {
                    if ( host.viewObjects["main"] ){
                        let position = getWorldPosition(host?.viewObjects["main"]);
                        const houseDim = getBoundingBoxSize(host?.viewObjects["main"]);
                        const height  = (houseDim.x *  host?.viewObjects["main"].scale.x ) /2;
                        const widht = (houseDim.y * host?.viewObjects["main"].scale.y) /2;

                        let corners = [];
                        corners.push(new THREE.Vector3(position.x + widht, position.y - height, position.z));
                        corners.push(new THREE.Vector3(position.x - widht, position.y - height, position.z));
                        corners.push(new THREE.Vector3(position.x - widht, position.y + height, position.z));
                        corners.push(new THREE.Vector3(position.x + widht, position.y + height, position.z));
                        copyCoords(this, position);

                        if ( onBorder ) {
                            // Find border where link is hosted
                            let borderIndex = onBorder.borders.indexOf(hostedBy);
                            let start = corners[borderIndex];
                            let end = corners[borderIndex+1];

                            // If it's the last border, reset boundaries
                            borderIndex == 3 ? start = corners[borderIndex] : null;
                            borderIndex == 3 ? end = corners[0] : null;

                            // Get position of node along the border
                            let nodeIndex = hostedBy.hostedNodes?.indexOf(this);

                            // Place node along the border in link
                            let placeInLink = (nodeIndex + 1 ) / ( hostedBy.hostedNodes?.length + 1);
                            borderIndex > 2 ? placeInLink = (( hostedBy.hostedNodes?.length + 1 ) - (nodeIndex + 1)) / ( hostedBy.hostedNodes?.length + 1): null;
                            placeInLink == undefined || placeInLink < 0 ? placeInLink = .5 : null;
                            
                            // Get point along the curve
                            let pointAlonLink = pointAlongLine(start, end, placeInLink);
                            this.viewObjects["main"].position.x = pointAlonLink.x;
                            this.viewObjects["main"].position.y = pointAlonLink.y;
                            this.viewObjects["main"].geometry.verticesNeedUpdate = true;
                            this.viewObjects["main"]?.geometry?.computeBoundingSphere();
                            copyCoords(this, pointAlonLink);
                        }
                    }
                }
            }
        } else if (this.internalIn) {
            let housingLyph = this.internalIn;
            let position = getWorldPosition(housingLyph?.viewObjects["main"]);
            copyCoords(this, position);
        } else if (this.controlNodes) {
            copyCoords(this, getCenterOfMass(this.controlNodes));
        }
    }
};

Object.defineProperty(Node.prototype, "polygonOffsetFactor", {
    get: function() { return 0; }
});


/**
 * Create visual resources for an anchor
 * @param state
 */
Anchor.prototype.createViewObjects = function(state){
    this.val = this.val || state.anchorVal;
    Vertice.prototype.createViewObjects.call(this, state);
};

/**
 * Update visual resources for an anchor
 */
Anchor.prototype.updateViewObjects = function(state) {
    if (this.layout) {
        let coords = extractCoords(this.layout);
        copyCoords(this, coords);
    }
    Vertice.prototype.updateViewObjects.call(this, state);
};

Anchor.prototype.relocate = function(delta, updateDependent = true){
    let v = extractCoords(delta);
    let p0 = extractCoords(this);
    let p = p0.clone().add(v);
    if (this.hostedBy){
        if ((this.hostedBy.points||[]).length > 2) {
            //Anchor must move along a wire - we will move it to the nearest to p point on the curve
            let dMin = Number.MAX_VALUE;
            let idxMin = -1;
            (this.hostedBy.points || []).forEach((q, i) => {
                let d = q.distanceTo(p);
                if (d < dMin) {
                    dMin = d;
                    idxMin = i;
                }
            });
            this.offset = idxMin / this.hostedBy.points.length;
        } else {
            //Hosting wire is a line
            if (this.hostedBy.getCurve) {
                let source = extractCoords(this.hostedBy.source);
                let target = extractCoords(this.hostedBy.target);
                let lineCurve = this.hostedBy.getCurve(source, target);
                if (lineCurve.closestPointToPoint) {
                    let q = lineCurve.closestPointToPoint(p);
                    this.offset = q.distanceTo(source) / target.distanceTo(source);
                }
            }
        }
    } else {
        copyCoords(this.layout, p);
    }
    this.updateViewObjects(this.state);
    if (updateDependent) {
        (this.onBorderInRegion || []).forEach(region => region.resize(this, delta));
    }
    const updateWires = (wire, prop) => {
        wire.updateViewObjects(this.state);
        (wire[prop].sourceOf || []).forEach(w => w.updateViewObjects(this.state));
        (wire[prop].targetOf || []).forEach(w => w.updateViewObjects(this.state));
    }
    (this.sourceOf || []).forEach(wire => updateWires(wire, "target"));
    (this.targetOf || []).forEach(wire => updateWires(wire, "source"));
}

Object.defineProperty(Anchor.prototype, "polygonOffsetFactor", {
    get: function() { return -10; }
});