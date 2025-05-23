import {copyCoords, extractCoords, getCenterOfMass, THREE} from "./utils";
import {MaterialFactory} from "./materialFactory";
import {modelClasses} from "../model";

const {VisualResource, Vertice, Node, Anchor} = modelClasses;

/**
 * Create visual object for vertice
 */
Vertice.prototype.createViewObjects = function (state) {
    VisualResource.prototype.createViewObjects.call(this, state);
    if (this.invisible) {
        return;
    }
    if (!this.viewObjects["main"]) {
        const size = this.val * state.verticeRelSize;
        let obj;
        if (!this.generated) {
            let material = new THREE.PointsMaterial({
                color: this.color,
                size: size
              });
            //Nodes as spheres
            const geometry = new THREE.SphereGeometry(size, state.verticeResolution, state.verticeResolution);
            obj = new THREE.Mesh(geometry, material);
        } else {
            //Nodes as points
            let material = MaterialFactory.createMeshLambertMaterial({
                color: this.color,
                polygonOffsetFactor: this.polygonOffsetFactor
            });
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
            obj = new THREE.Points(geometry, material);
        }
        obj.userData = this;
        this.viewObjects["main"] = obj;
    }
    this.createLabels();
};

/**
 * Update visual object for vertice
 */
Vertice.prototype.updateViewObjects = function (state) {
    VisualResource.prototype.updateViewObjects.call(this, state);
    if (!this.invisible) {
        copyCoords(this.viewObjects["main"].position, this);
        this.updateLabels(this.viewObjects["main"].position.clone().addScalar(this.state.labelOffset.Vertice));
    }
};

/**
 * Create visual objects for a node
 * @param state
 */
Node.prototype.createViewObjects = function (state) {
    this.val = this.val || state.nodeVal;
    Vertice.prototype.createViewObjects.call(this, state);
};

/**
 * Update visual objects for a node
 */
Node.prototype.updateViewObjects = function (state) {
    if (this.anchoredTo) {
        copyCoords(this, this.anchoredTo);
    } else {
        if (this.fixed && this.layout) {
            copyCoords(this, this.layout);
        }
        if (this.hostedBy) {
            copyCoords(this, this.hostedBy);
        }
        if (this.controlNodes) {
            copyCoords(this, getCenterOfMass(this.controlNodes));
        }
    }
    Vertice.prototype.updateViewObjects.call(this, state);
};

Object.defineProperty(Node.prototype, "polygonOffsetFactor", {
    get: function () {
        return 0;
    }
});


/**
 * Create visual resources for an anchor
 * @param state
 */
Anchor.prototype.createViewObjects = function (state) {
    this.val = this.val || state.anchorVal;
    Vertice.prototype.createViewObjects.call(this, state);
};

/**
 * Update visual resources for an anchor
 */
Anchor.prototype.updateViewObjects = function (state) {
    if (this.layout) {
        let coords = extractCoords(this.layout);
        copyCoords(this, coords);
    }
    Vertice.prototype.updateViewObjects.call(this, state);
};

Anchor.prototype.relocate = function (delta, updateDependent = true) {
    let v = extractCoords(delta);
    let p0 = extractCoords(this);
    let p = p0.clone().add(v);
    if (this.hostedBy) {
        if ((this.hostedBy.points || []).length > 2) {
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
    get: function () {
        return -10;
    }
});