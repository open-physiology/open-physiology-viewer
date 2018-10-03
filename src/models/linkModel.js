import { Entity } from './entityModel';
import * as three from 'three';
const THREE = window.THREE || three;
import { direction, bezierSemicircle, extractCoords } from '../three/utils';
import { copyCoords } from './utils';

import { LineSegments2 }        from '../three/lines/LineSegments2.js';
import { LineSegmentsGeometry } from '../three/lines/LineSegmentsGeometry.js';
import { Line2 }                from '../three/lines/Line2.js';
import { LineGeometry }         from '../three/lines/LineGeometry.js';
import { LineMaterial }         from '../three/lines/LineMaterial.js';

/**
 * Recognized set of link visualization options
 * @type {{LINK: string, SEMICIRCLE: string, DASHED: string, FORCE: string, CONTAINER: string, INVISIBLE: string}}
 */
export const LINK_TYPES = {
    LINK       : "link",        //straight line
    SEMICIRCLE : "semicircle",  //line in the form of a semicircle
    PATH       : "path",        //path defined (e.g., in the shape for the edge bundling)
    SPLINE     : "spline",      //solid curve line that uses other nodes to produce a smooth path
    INVISIBLE  : "invisible",   //link with hidden visual geometry,
    FORCE      : "force"        //link without visual geometry, works as force to attract or repel nodes
};

export const LINK_STROKE = {
    DASHED     : "dashed",      //dashed line
    THICK      : "thick"        //thick line
};

/**
 * The class to visualize processes (graph edges)
 */
export class Link extends Entity {
    /**
     * Get link's direction
     * @returns {THREE.Vector3} - a vector defining link direction
     */
    get direction(){
        return direction({source: this.source, target: this.target});
    }

    get polygonOffsetFactor(){
        let res = -100;
        if (this.linkOnBorder){ res = this.linkOnBorder.polygonOffsetFactor - 1; }
        return res;
    }

    /**
     * Create WebGL objects to visualize the link, labels and its conveying lyph
     * @param state - layout parameters
     */
    createViewObjects(state){

        //Do not visualize force-only links
        if (this.type === LINK_TYPES.FORCE) {return; }

        //Link
        if (!this.viewObjects["main"]) {
            let geometry, obj;
            if (!this.material) {
                if (this.stroke === LINK_STROKE.DASHED) {
                    this.material = state.materialRepo.createLineDashedMaterial({color: this.color});
                } else {
                    //Thick lines
                    if (this.stroke === LINK_STROKE.THICK) {
                        // Line 2 method: draws thick lines
                        this.material = state.materialRepo.createLine2Material({
                            color: this.color,
                            linewidth: this.linewidth,
                            polygonOffsetFactor: this.polygonOffsetFactor
                        });
                    } else {
                        //Normal lines
                        this.material = state.materialRepo.createLineBasicMaterial({
                            color: this.color,
                            polygonOffsetFactor: this.polygonOffsetFactor
                        });
                    }
                }
            }

            if (this.stroke === LINK_STROKE.THICK) {
                geometry = new THREE.LineGeometry();
                obj = new THREE.Line2(geometry, this.material);
            } else {
                //Thick lines
                if (this.stroke === LINK_STROKE.DASHED) {
                    geometry = new THREE.Geometry();
                } else {
                    geometry = new THREE.BufferGeometry();
                }
                obj = new THREE.Line(geometry, this.material);
            }
            let size = (this.type === LINK_TYPES.SEMICIRCLE || this.type === LINK_TYPES.SPLINE)
                ? state.linkResolution
                : (this.type === LINK_TYPES.PATH)
                    ? 66 // Edge bunding breaks a link into 66 points
                    : 2;
            if (this.stroke === LINK_STROKE.DASHED) {
                //Dashed lines cannot be drawn with buffered geometry?
                geometry.vertices = new Array(size);
                for (let i = 0; i < size; i++ ){ geometry.vertices[i] = new THREE.Vector3(0, 0, 0); }
            } else {
                //Buffered geometry
                if (this.stroke !== LINK_STROKE.THICK){
                    geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(size * 3), 3));
                }
            }

            obj.renderOrder = 10;  // Prevent visual glitches of dark lines on top of nodes by rendering them last
            obj.__data = this;     // Attach link data
            this.viewObjects["main"] = obj;
        }

        //Link label
        this.createLabels(state.labels[this.constructor.name], state.fontParams);

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
    updateViewObjects(state){
        if (!this.viewObjects["main"]
            || (this.conveyingLyph && !this.conveyingLyph.viewObjects["lyphs"][state.method])
            || (!this.labels[state.labels[this.constructor.name]] && this[state.labels[this.constructor.name]])){
            this.createViewObjects(state);
        }
        const linkObj = this.viewObjects["main"];

        let _start = extractCoords(this.source);
        let _end   = extractCoords(this.target);
        let curve  = new THREE.Line3(_start, _end);
        this.points = [_start, _end];

        if (this.type === LINK_TYPES.SEMICIRCLE) {
            curve = bezierSemicircle(_start, _end);
            this.points = curve.getPoints(state.linkResolution - 1);
        }

        if (this.type === LINK_TYPES.SPLINE) {
            //Direction without normalization
            let prev = (this.source.targetOf || this.source.sourceOf || []).find(x => x!== this);
            if (prev) {
                prev = (this.source === prev.source)? _start.clone().sub(prev.direction) :_start.clone().add(prev.direction);
            }
            let next = (this.target.sourceOf || this.target.targetOf || []).find(x => x!== this);
            if (next) {
                next = (this.target === next.target)? _end.clone().add(next.direction) : _end.clone().sub(next.direction);
            }
            if (prev && next){
                curve = new THREE.CubicBezierCurve3(_start, prev, next,  _end);
                this.points = curve.getPoints(state.linkResolution - 1);
            }
        }

        if (this.type === LINK_TYPES.PATH) {
            curve  = new THREE.CatmullRomCurve3(this.path);
            this.points = this.path;
        }

        this.center = (curve.getPoint)? curve.getPoint(0.5): _start.clone().add(_end).multiplyScalar(0.5);

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
        if (this.hostedNodes) {
            const offset = 1 / (this.hostedNodes.length + 1);
            this.hostedNodes.forEach((node, i) => {
                let d_i = node.offset? node.offset: offset * (i + 1);
                const pos = curve.getPoint? curve.getPoint(d_i): _start.clone().add(_end).multiplyScalar(d_i);
                copyCoords(node, pos);
            });
        }

        this.updateLabels(state.labels[this.constructor.name], state.showLabels[this.constructor.name], this.center.clone().addScalar(5));

        if (this.conveyingLyph){
            this.conveyingLyph.updateViewObjects(state);
            this.viewObjects['icon']      = this.conveyingLyph.viewObjects["main"];
            this.viewObjects['iconLabel'] = this.conveyingLyph.viewObjects["label"];
            if (!this.viewObjects['iconLabel']) {delete  this.viewObjects['iconLabel'];}
        } else {
            delete this.viewObjects['icon'];
            delete this.viewObjects["iconLabel"];
        }

        //Update buffered geometries
        //Do not update links with fixed node positions
        if (this.type === LINK_TYPES.INVISIBLE && this.source.fixed && this.target.fixed)  { return; }

        if (linkObj) {
            if (this.stroke === LINK_STROKE.THICK){
                let coordArray = [];
                for (let i = 0; i < this.points.length; i++) {
                    coordArray.push(this.points[i].x, this.points[i].y, this.points[i].z);
                }
                linkObj.geometry.setPositions(coordArray);
            } else {
                if (linkObj && this.stroke === LINK_STROKE.DASHED) {
                    linkObj.geometry.setFromPoints(this.points);
                    linkObj.geometry.verticesNeedUpdate = true;
                    linkObj.computeLineDistances();
                } else {
                    let linkPos = linkObj.geometry.attributes && linkObj.geometry.attributes.position;
                    if (linkPos) {
                        for (let i = 0; i < this.points.length; i++) {
                            linkPos.array[3 * i] = this.points[i].x;
                            linkPos.array[3 * i + 1] = this.points[i].y;
                            linkPos.array[3 * i + 2] = this.points[i].z;
                        }
                        linkPos.needsUpdate = true;
                        linkObj.geometry.computeBoundingSphere();
                    }
                }
            }
        }
    }
}
