import { Entity } from './entityModel';
import * as three from 'three';
const THREE = window.THREE || three;
import { direction, bezierSemicircle, copyCoords} from '../three/utils';

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
    LINK       : "link",       //solid straight line
    DASHED     : "dashed",     //dashed straight line
    SEMICIRCLE : "semicircle", //solid line in the form of a semicircle
    PATH       : "path",       //solid path (e.g., in the shape for the edge bundling)
    CONTAINER  : "container",  //link with visual object (which may be hidden), not affected by graph forces (i.e., with fixed position)
    FORCE      : "force",      //link without visual object, works as force to attract or repel nodes
    INVISIBLE  : "invisible"   //link with hidden visual object affected by graph forces (i.e., dynamically positioned)
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
        if (this.reversed){
            return direction({source: this.target, target: this.source});
        }
        return direction({source: this.source, target: this.target});
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
            let geometry;
            let obj;
            if (this.type === LINK_TYPES.DASHED) {
                geometry = new THREE.Geometry();
                if (!this.material) {
                    //axis can stay behind any other visual objects
                    this.material = state.materialRepo.createLineDashedMaterial({color: this.color});
                }
                geometry.vertices = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];
                obj = new THREE.Line(geometry, this.material);

            } else {
                if (this.linkMethod === 'Line2'){
                    // Line 2 method: draws thick lines
                    geometry = new THREE.LineGeometry();
                    this.material = state.materialRepo.createLine2Material({
                        color: this.color,
                        linewidth: this.linewidth,
                        polygonOffsetFactor: -100
                    });
                    obj = new THREE.Line2(geometry, this.material);
                } else {
                    // Draw lines
                    geometry = new THREE.BufferGeometry();
                    this.material = state.materialRepo.createLineBasicMaterial({
                        color: this.color,
                        polygonOffsetFactor: -100
                    });
                    let size = (this.type === LINK_TYPES.SEMICIRCLE)? state.linkResolution:
                        (this.type === LINK_TYPES.PATH)? 66: 2; // Edge bunding breaks a link into 66 points
                    geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(size * 3), 3));
                    obj = new THREE.Line(geometry, this.material);
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
            this.conveyingLyph.axis = this;
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

        let _start = new THREE.Vector3(this.source.x, this.source.y, this.source.z || 0);
        let _end = new THREE.Vector3(this.target.x, this.target.y, this.target.z || 0);
        let points = [_start, _end];
        this.center = _start.clone().add(_end).multiplyScalar(0.5);

        switch(this.type){
            case LINK_TYPES.DASHED: {
                if (!linkObj) { return; }
                copyCoords(linkObj.geometry.vertices[0], this.source);
                copyCoords(linkObj.geometry.vertices[1], this.target);
                linkObj.geometry.verticesNeedUpdate = true;
                linkObj.computeLineDistances();
                break;
            }
            case LINK_TYPES.SEMICIRCLE: {
                const curve = bezierSemicircle(_start, _end);
                this.center = curve.getPoint(0.5);
                points = curve.getPoints(state.linkResolution - 1);

                //Position omega tree roots
                let hostedNodes = this.hostedNodes
                    || state.graphData.nodes.filter(node => node.host === this);
                if (hostedNodes.length > 0) {
                    const delta = ((hostedNodes.length % 2) === 1) ? 0.4 : 0;
                    const offset = 1 / (hostedNodes.length + 1 + delta);
                    hostedNodes.forEach((node, i) => {
                        const pos = curve.getPoint(node.offset? node.offset: offset * (i + 1));
                        copyCoords(node, pos);
                    });
                }
                break;
            }
            case LINK_TYPES.PATH: {
                points = this.path;
                break;
            }
        }

        this.updateLabels(state.labels[this.constructor.name], state.showLabels[this.constructor.name], this.center.clone().addScalar(5));

        if (this.conveyingLyph){
            this.conveyingLyph.updateViewObjects(state);
            this.viewObjects['icon'] = this.conveyingLyph.viewObjects["main"];
            this.viewObjects['iconLabel'] = this.conveyingLyph.viewObjects["label"];
            if (!this.viewObjects['iconLabel']) {delete  this.viewObjects['iconLabel'];}
        } else {
            delete this.viewObjects['icon'];
            delete this.viewObjects["iconLabel"];
        }

        //Update buffered geometries
        //Do not update positions of container links
        if (this.type === LINK_TYPES.CONTAINER)   {return; }

        if (linkObj && linkObj.geometry.attributes){
            if (this.linkMethod === 'Line2'){
                let coordArray = [];
                for (let i = 0; i < points.length; i++) {
                    coordArray.push(points[i].x, points[i].y, points[i].z);
                }
                linkObj.geometry.setPositions(coordArray);

            } else {
                let linkPos = linkObj.geometry.attributes.position;
                if (linkPos){
                    for (let i = 0; i < points.length; i++) {
                        linkPos.array[3 * i] = points[i].x;
                        linkPos.array[3 * i + 1] = points[i].y;
                        linkPos.array[3 * i + 2] = points[i].z;
                    }
                    linkPos.needsUpdate = true;
                    linkObj.geometry.computeBoundingSphere();
                }
            }
        }
    }
}
