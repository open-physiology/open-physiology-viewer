import { Model, tracePropAccess } from './model';
import { assign } from 'lodash-bound';

import * as three from 'three';
const THREE = window.THREE || three;
import { direction, bezierSemicircle, copyCoords} from '../three/utils';

import { LineSegments2 }        from '../three/lines/LineSegments2.js';
import { LineSegmentsGeometry } from '../three/lines/LineSegmentsGeometry.js';
import { Line2 }                from '../three/lines/Line2.js';
import { LineGeometry }         from '../three/lines/LineGeometry.js';
import { LineMaterial }         from '../three/lines/LineMaterial.js';

export const LINK_TYPES = {
    PATH: "path",
    LINK: "link",
    AXIS: 'axis',
    COALESCENCE: "coalescence",
    CONTAINER  : "container",
    BORDER     : "border"
};

export class LinkModel extends Model {
    length;
    conveyingLyph;
    type;
    source;
    target;

    constructor(id) {
        super(id);
        this.infoFields.text.push('length', 'type');
        this.infoFields.objects.push('source', 'target', 'conveyingLyph');
        //[this.source, this.target] = tracePropAccess(this, ['source', 'target']);
    }

    toJSON() {
        let res = super.toJSON();
        res.source = this.source && this.source.id;
        res.target = this.target && this.target.id;
        res.type   = this.type;
        res.length = this.length;
        res.conveyingLyph = this.conveyingLyph && this.conveyingLyph.id;
        return res;
    }

    static fromJSON(json, modelClasses = {}) {
        json.class = json.class || "Link";
        let result = super.fromJSON(json, modelClasses);
        result = tracePropAccess(result, ['source', 'target']);
        result::assign(json);
        return result;
    }

    // /**
    //  * @param tree
    //  * @returns {number} link's level in the tree
    //  */
    // level(tree){
    //     return -1; //TODO implement
    // }

    get direction(){
        if (this.reversed){
            return direction({source: this.target, target: this.source});
        }
        return direction({source: this.source, target: this.target});
    }

    /**
     * Defines size of the conveying lyph based on the length of the link
     * @returns {{height: number, width: number}}
     */
    get lyphSize(){
        if (this.type === LINK_TYPES.BORDER){
            return {height: this.length, width: this.length};
        }

        const scaleFactor = (this.length? Math.log(this.length): 1) * 5;
        let res = {height: scaleFactor, width: scaleFactor};
        if (this.lyphScale){
            if (this.lyphScale.width && this.lyphScale.height){
                res.width *= this.lyphScale.width;
                res.height *= this.lyphScale.height;
            } else {
                res.width  *= this.lyphScale || 1;
                res.height *= this.lyphScale || 1;
            }
        }
        return res;
    }

    /**
     * Create WebGL objects to visualize the link, labels and its conveying lyph
     * @param state - layout parameters
     */
    createViewObjects(state){

        //Do not visualize coalescence links
        if (this.type === LINK_TYPES.COALESCENCE) {return; }

        //Link
        if (!this.viewObjects["main"]) {
            let geometry;
            let obj;
            if (this.type === LINK_TYPES.AXIS) {
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
                        linewidth: 0.002,
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
                    let size = (this.type === LINK_TYPES.PATH)? state.linkResolution: 2;
                    geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(size * 3), 3));
                    obj = new THREE.Line(geometry, this.material);
                }
            }
            obj.renderOrder = 10;  // Prevent visual glitches of dark lines on top of nodes by rendering them last
            obj.__data = this;     // Attach link data
            this.viewObjects["main"] = obj;
        }

        //Link label
        this.createLabels(state.linkLabel, state.fontParams);

        //Icon (lyph)
        if (this.conveyingLyph) {
            this.conveyingLyph.axis = this;
            this.conveyingLyph.createViewObjects(state);
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
            || (!this.labels[state.linkLabel] && this[state.linkLabel])){
            this.createViewObjects(state);
        }
        const linkObj = this.viewObjects["main"];

        let _start = new THREE.Vector3(this.source.x, this.source.y, this.source.z || 0);
        let _end = new THREE.Vector3(this.target.x, this.target.y, this.target.z || 0);
        let points = [_start, _end];
        this.center = _start.clone().add(_end).multiplyScalar(0.5);

        switch(this.type){
            case LINK_TYPES.AXIS: {
                if (!linkObj) { return; }
                copyCoords(linkObj.geometry.vertices[0], this.source);
                copyCoords(linkObj.geometry.vertices[1], this.target);
                linkObj.geometry.verticesNeedUpdate = true;
                linkObj.geometry.computeLineDistances();

                break;
            }
            case LINK_TYPES.PATH: {
                const curve = bezierSemicircle(_start, _end);
                this.center = curve.getPoint(0.5);
                points = curve.getPoints(state.linkResolution - 1);

                //Position omega tree roots
                let hostedNodes = state.graphData.nodes.filter(node => (node.host === this.id) && node.isRoot);
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
        }

        this.updateLabels(state.linkLabel, state.showLinkLabel, this.center.clone().addScalar(5));

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
        //Do not visualize container links
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
