import {VisualResource, Link, Node, LINK_GEOMETRY, LINK_STROKE} from "../model/visualResourceModel";
import {SpriteText2D} from "three-text2d";
import {
    extractCoords,
    THREE,
    copyCoords,
    direction,
    bezierSemicircle,
    rectangleCurve,
    getPoint,
    getCenterOfMass
} from "./utils";

import '../three/lines/Line2.js';
import {MaterialFactory} from "./materialFactory";

/**
 * Create resource labels
 * @param {Object} state - graph configuration, relevant parameters: fontParams
 */
VisualResource.prototype.createLabels = function(state){
    if (this.skipLabel) { return; }
    let labelKey = state.labels[this.constructor.name];
    this.labels = this.labels || {};

    if (!this.labels[labelKey] && this[labelKey]) {
        this.labels[labelKey] = new SpriteText2D(this[labelKey], state.fontParams);
    }

    if (this.labels[labelKey]){
        this.viewObjects["label"] = this.labels[labelKey];
        this.viewObjects["label"].visible = this.isVisible;
    } else {
        delete this.viewObjects["label"];
    }
};

/**
 * Updates resource labels
 * @param {Object}  state    - graph configuration, relevant parameters: showLabels and labelRelSize
 * @param {Vector3} position - label position
 */
VisualResource.prototype.updateLabels = function(state, position){
    if (this.skipLabel) { return; }
    let labelKey  = state.labels[this.constructor.name];
    let isVisible = state.showLabels[this.constructor.name];
    if (this.labels[labelKey]){
        this.labels[labelKey].visible = isVisible;
        this.labels[labelKey].scale.set(state.labelRelSize , state.labelRelSize , state.labelRelSize );
        copyCoords(this.labels[labelKey].position, position);
        this.viewObjects['label'] = this.labels[labelKey];
    } else {
        delete this.viewObjects['label'];
    }
};

/**
 * Create visual objects for a node
 * @param state
 */
Node.prototype.createViewObjects = function(state) {
    //Nodes
    if (!this.viewObjects["main"]) {
        let geometry = new THREE.SphereGeometry(this.val * state.nodeRelSize,
            state.nodeResolution, state.nodeResolution);
        let material = MaterialFactory.createMeshLambertMaterial({
            color: this.color,
            polygonOffsetFactor: this.polygonOffsetFactor
        });
        let obj = new THREE.Mesh(geometry, material);
        // Attach node data
        obj.userData = this;
        this.viewObjects["main"] = obj;
    }

    //Labels
    this.createLabels(state);
};

/**
 * Update visual objects for a node
 * @param state
 */
Node.prototype.updateViewObjects = function(state) {
    //Node
    if (!this.viewObjects["main"] ||
        (!this.skipLabel && !this.labels[state.labels[this.constructor.name]] && this[state.labels[this.constructor.name]])) {
        this.createViewObjects(state);
    }

    if (this.fixed) { copyCoords(this, this.layout); }

    if (this.controlNodes) {
        copyCoords(this, getCenterOfMass(this.controlNodes).multiplyScalar(2)); //double the distance from center
    }

    copyCoords(this.viewObjects["main"].position, this);

    this.updateLabels(state,
        this.viewObjects["main"].position.clone().addScalar(1 + this.val * state.nodeRelSize));
};

/**
 * Create visual objects for a link
 * @param state
 */
Link.prototype.createViewObjects = function(state){

    //Do not visualize force-only links
    if (this.geometry === LINK_GEOMETRY.FORCE) {return; }

    //Link
    if (!this.viewObjects["main"]) {
        let material;
        if (this.stroke === LINK_STROKE.DASHED) {
            material = MaterialFactory.createLineDashedMaterial({color: this.color});
        } else {
            //Thick lines
            if (this.stroke === LINK_STROKE.THICK) {
                // Line 2 method: draws thick lines
                material = MaterialFactory.createLine2Material({
                    color: this.color,
                    lineWidth: this.lineWidth,
                    polygonOffsetFactor: this.polygonOffsetFactor
                });
            } else {
                //Normal lines
                material = MaterialFactory.createLineBasicMaterial({
                    color: this.color,
                    polygonOffsetFactor: this.polygonOffsetFactor
                });
            }
        }

        let geometry, obj;
        if (this.stroke === LINK_STROKE.THICK) {
            geometry = new THREE.LineGeometry();
            obj = new THREE.Line2(geometry, material);
        } else {
            //Thick lines
            if (this.stroke === LINK_STROKE.DASHED) {
                geometry = new THREE.Geometry();
            } else {
                geometry = new THREE.BufferGeometry();
            }
            obj = new THREE.Line(geometry, material);
        }
        this.pointLength = (this.geometry === LINK_GEOMETRY.SEMICIRCLE
            || this.geometry === LINK_GEOMETRY.RECTANGLE
            || this.geometry === LINK_GEOMETRY.SPLINE)
            ? state.linkResolution
            : (this.geometry === LINK_GEOMETRY.PATH)
                ? 67 // Edge bunding breaks a link into 66 points
                : 2;
        if (this.stroke === LINK_STROKE.DASHED) {
            //Dashed lines cannot be drawn with buffered geometry?
            geometry.vertices = new Array(this.pointLength);
            for (let i = 0; i < this.pointLength; i++ ){ geometry.vertices[i] = new THREE.Vector3(0, 0, 0); }
        } else {
            //Buffered geometry
            if (this.stroke !== LINK_STROKE.THICK){
                geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(this.pointLength * 3), 3));
            }
        }

        if (this.directed){
            let dir    = direction(this.source, this.target);
            let arrow  = new THREE.ArrowHelper(dir.normalize(), extractCoords(this.target),
                state.arrowLength, material.color.getHex(),
                state.arrowLength, state.arrowLength * 0.75);
            obj.add(arrow);
        }

        if (this.geometry === LINK_GEOMETRY.SPLINE) {
            this.prev = (this.source.targetOf || this.source.sourceOf || []).find(x => x!== this);
            this.next = (this.target.sourceOf || this.target.targetOf || []).find(x => x!== this);
        }

        obj.renderOrder = 10;  // Prevepointnt visual glitches of dark lines on top of nodes by rendering them last
        obj.userData = this;     // Attach link data

        this.viewObjects["main"] = obj;
    }

    //Link label
    this.createLabels(state);

    //Icon (lyph)
    if (this.conveyingLyph) {
        this.conveyingLyph.createViewObjects(state);
        // Note: we do not make conveying lyphs children of links to include them to the scene
        // because we want to have them in the main scene for highlighting
        this.viewObjects['icon']      = this.conveyingLyph.viewObjects['main'];
        this.viewObjects['iconLabel'] = this.conveyingLyph.viewObjects["label"];
        if (!this.viewObjects['iconLabel']) {delete  this.viewObjects['iconLabel'];}
    }
};

/**
 * Update visual objects for a link
 * @param state
 */
Link.prototype.updateViewObjects = function(state) {
    const updateCurve = (_start, _end) => {
        let curve = new THREE.Line3(_start, _end);
        switch (this.geometry) {
            case LINK_GEOMETRY.SEMICIRCLE:
                curve = bezierSemicircle(_start, _end);
                break;
            case LINK_GEOMETRY.RECTANGLE :
                curve = rectangleCurve(_start, _end);
                break;
            case LINK_GEOMETRY.PATH      :
                if (this.path){
                    curve = new THREE.CatmullRomCurve3(this.path);
                }
                break;
            case LINK_GEOMETRY.SPLINE    :
                let prev = this.prev ? direction(this.prev.center, _start).multiplyScalar(2) : null;
                let next = this.next ? direction(this.next.center, _end).multiplyScalar(2) : null;
                if (prev) {
                    curve = next
                        ? new THREE.CubicBezierCurve3(_start, _start.clone().add(prev), _end.clone().add(next), _end)
                        : new THREE.QuadraticBezierCurve3(_start, _start.clone().add(prev), _end);
                } else {
                    if (next) {
                        curve = new THREE.QuadraticBezierCurve3(_start, _end.clone().add(next), _end);
                    }
                }
        }
        return curve;
    };

    if (!this.viewObjects["main"] || (!this.labels[state.labels[this.constructor.name]] && this[state.labels[this.constructor.name]])) {
        this.createViewObjects(state);
    }
    const obj = this.viewObjects["main"];

    let _start = extractCoords(this.source);
    let _end   = extractCoords(this.target);

    let curve = updateCurve(_start, _end);
    this.center = getPoint(curve, _start, _end, 0.5);
    this.points = curve.getPoints? curve.getPoints(this.pointLength): [_start, _end];

    //Merge nodes of a collapsible link
    if (this.collapsible){
        if (!this.source.isConstrained && !this.target.isConstrained) {
            copyCoords(this.source, this.center);
            copyCoords(this.target, this.center);
        } else {
            if (!this.source.isConstrained) {
                copyCoords(this.source, this.target);
            }
            if (!this.target.isConstrained) {
                copyCoords(this.target, this.source);
            }
        }
    }

    //Position omega tree roots
    (this.hostedNodes||[]).forEach((node, i) => {
        let d_i = node.offset? node.offset: 1 / (this.hostedNodes.length + 1) * (i + 1);
        const pos = getPoint(curve, _start, _end, d_i);
        copyCoords(node, pos);
    });

    this.updateLabels(state, this.center.clone().addScalar(5));

    if (this.conveyingLyph){
        this.conveyingLyph.updateViewObjects(state);
        this.viewObjects['icon']      = this.conveyingLyph.viewObjects["main"];
        this.viewObjects['iconLabel'] = this.conveyingLyph.viewObjects["label"];
        if (!this.viewObjects['iconLabel']) {delete this.viewObjects['iconLabel'];}
    } else {
        delete this.viewObjects['icon'];
        delete this.viewObjects["iconLabel"];
    }

    //Update buffered geometries
    //Do not update links with fixed node positions
    if (this.geometry === LINK_GEOMETRY.INVISIBLE && this.source.fixed && this.target.fixed)  { return; }

    if (obj) {
        if (this.directed && obj.children[0] && (obj.children[0] instanceof THREE.ArrowHelper)){
            let arrow  = obj.children[0];
            let dir = direction(this.source, this.target);
            let length = curve && curve.getLength? curve.getLength(): dir.length();
            let t = state.arrowLength / length;
            if (curve && curve.getTangent){
                dir = curve.getTangent(1 - t);
            }
            let pos = getPoint(curve, _start, _end, 1 - t);
            copyCoords(arrow.position, pos);
            arrow.setDirection(dir.normalize());
        }
        if (this.stroke === LINK_STROKE.THICK){
            let coordArray = [];
            for (let i = 0; i < this.points.length; i++) {
                coordArray.push(this.points[i].x, this.points[i].y, this.points[i].z);
            }
            obj.geometry.setPositions(coordArray);
        } else {
            if (obj && this.stroke === LINK_STROKE.DASHED) {
                obj.geometry.setFromPoints(this.points);
                obj.geometry.verticesNeedUpdate = true;
                obj.computeLineDistances();
            } else {
                let linkPos = obj.geometry.attributes && obj.geometry.attributes.position;
                if (linkPos) {
                    for (let i = 0; i < this.points.length; i++) {
                        linkPos.array[3 * i] = this.points[i].x;
                        linkPos.array[3 * i + 1] = this.points[i].y;
                        linkPos.array[3 * i + 2] = this.points[i].z;
                    }
                    linkPos.needsUpdate = true;
                    obj.geometry.computeBoundingSphere();
                }
            }
        }
    }
};