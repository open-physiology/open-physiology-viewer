import { VisualResource } from './visualResourceModel';
import * as three from 'three';
const THREE = window.THREE || three;
import { direction, bezierSemicircle, rectangleCurve, extractCoords, align } from '../three/utils';
import { MaterialFactory } from '../three/materialFactory';

import { copyCoords } from './utils';

import { LineSegments2 }        from '../three/lines/LineSegments2.js';
import { LineSegmentsGeometry } from '../three/lines/LineSegmentsGeometry.js';
import { Line2 }                from '../three/lines/Line2.js';
import { LineGeometry }         from '../three/lines/LineGeometry.js';
import { LineMaterial }         from '../three/lines/LineMaterial.js';

const arrowLength = 40;

/**
 * Recognized set of link geometries
 * @type {{LINK: string, SEMICIRCLE: string, PATH: string, SPLINE: string, INVISIBLE: string, FORCE: string}}
 */
export const LINK_GEOMETRY = {
    LINK       : "link",        //straight line
    SEMICIRCLE : "semicircle",  //line in the form of a semicircle
    RECTANGLE  : "rectangle",   //rectangular line with rounded corners
    PATH       : "path",        //path defined (e.g., in the shape for the edge bundling)
    SPLINE     : "spline",      //solid curve line that uses other nodes to produce a smooth path
    INVISIBLE  : "invisible",   //link with hidden visual geometry,
    FORCE      : "force"        //link without visual geometry, works as force to attract or repel nodes
};

export const LINK_STROKE = {
    DASHED     : "dashed",      //dashed line
    THICK      : "thick"        //thick line
};

const getPoint = (curve, s, t, offset) => (curve.getPoint)? curve.getPoint(offset): s.clone().add(t).multiplyScalar(offset);

/**
 * The class to visualize processes (edges)
 */
export class Link extends VisualResource {

    get polygonOffsetFactor(){
        let res = Math.min(...["hostedBy", "source", "target"].map(prop => this[prop]?
                (this[prop].polygonOffsetFactor || 0) - 1: 0));
        return res;
    }

    updateCurve(_start, _end){
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
    }

    /**
     * Create WebGL objects to visualize the link, labels and its conveying lyph
     * @param state - layout parameters
     */
    createViewObjects(state){

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
                        linewidth: this.linewidth,
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
                        arrowLength, material.color.getHex(),
                        arrowLength, arrowLength * 0.75);
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
    }

    /**
     * Update the position of the link and realign its conveying lyph
     * @param state - layout parameters
     */
    updateViewObjects(state) {
        if (!this.viewObjects["main"] || (!this.labels[state.labels[this.constructor.name]] && this[state.labels[this.constructor.name]])) {
            this.createViewObjects(state);
        }
        const obj = this.viewObjects["main"];

        let _start = extractCoords(this.source);
        let _end   = extractCoords(this.target);

        this.updateCurve(_start, _end);

        let curve = this.updateCurve(_start, _end);
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

        if (this.directed && obj.children[0]){
            if (obj.children[0] instanceof THREE.ArrowHelper){
                let arrow  = obj.children[0];
                let dir = direction(this.source, this.target);
                let length = curve? curve.getLength(): dir.length();
                let t = arrowLength / length;
                if (curve){ dir = curve.getTangent(1 - t); }
                let pos = getPoint(curve, _start, _end, 1 - t);
                copyCoords(arrow.position, pos);
                arrow.setDirection(dir.normalize());
            }
        }

        //Update buffered geometries
        //Do not update links with fixed node positions
        if (this.geometry === LINK_GEOMETRY.INVISIBLE && this.source.fixed && this.target.fixed)  { return; }

        if (obj) {
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
    }
}
