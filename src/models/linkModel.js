import { Model } from './model';
import { assign } from 'lodash-bound';

import * as three from 'three';
const THREE = window.THREE || three;
import { SpriteText2D } from 'three-text2d';
import { direction, bezierSemicircle, copyCoords} from '../three/utils';

require('../three/lines/LineSegments2');
require('../three/lines/LineSegmentsGeometry');
require('../three/lines/LineMaterial');

require('../three/lines/LineGeometry');
require('../three/lines/Line2');


export const LINK_TYPES = {
    PATH: "path",
    LINK: "link",
    AXIS: 'axis',
    COALESCENCE: "coalescence",
    CONTAINER: "container"
};

export class LinkModel extends Model {
    source;
    target;
    length;
    conveyingLyph;   //Rename to conveyingLyph
    type;

    constructor(id) {
        super(id);

        this.fields.text.push('length', 'type');
        this.fields.objects.push('source', 'target', 'conveyingLyph');
    }

    toJSON() {
        let res = super.toJSON();
        res.source = this.source && this.source.id;
        res.target = this.target && this.target.id;
        res.conveyingLyph = this.conveyingLyph && this.conveyingLyph.id;
        res.type   = this.type;
        res.length = this.length;
        return res;
    }

    static fromJSON(json, modelClasses = {}) {
        json.class = json.class || "Link";
        const result = super.fromJSON(json, modelClasses);
        result::assign(json); //TODO pick only valid properties
        return result;
    }

    // /**
    //  *
    //  * @param tree
    //  * @returns {number} link's level in the tree
    //  */
    // level(tree){
    //     return -1; //TODO implement
    // }

    get direction(){
        return direction(this.source, this.target);
    }

    /**
     * Defines size of the conveying lyph based on the length of the link
     * @returns {{length: number, thickness: number}}
     */
    get lyphSize(){
        const scaleFactor = this.length? Math.log(this.length): 1;
        if (this.type === LINK_TYPES.CONTAINER){
            return {length: 24 * scaleFactor, thickness: 8 * scaleFactor};
        }
        return {length: 6 * scaleFactor, thickness: 2 * scaleFactor};
    }

    /**
     * Create WebGL objects to visualize the link, labels and its conveying lyph
     * @param state - layout parameters
     */
    createViewObjects(state){
        if (this.type === LINK_TYPES.COALESCENCE) {return; }

        //Link
        var positions;
        if (!this.viewObjects["main"]) {
            let geometry;
            if (this.type === LINK_TYPES.AXIS) {
                // geometry = new THREE.Geometry();
                geometry = new THREE.LineSegmentsGeometry();
                if (!this.material) {
                //     //axis can stay behind any other visual objects
                //     // this.material = state.materialRepo.createLineDashedMaterial({color: this.color});
                  this.material = new THREE.LineMaterial({ color: this.color, linewidth: 0.002, dashed:true, gapSize: 0.1, dashSize: 0.05 });
                }
                // if (!this.material) {
                // }
                geometry.vertices = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];


            } else {
                // geometry = new THREE.BufferGeometry();
                geometry = new THREE.LineGeometry();

                if (!this.material) {
                    // this.material = state.materialRepo.createLineBasicMaterial({
                    this.material = new THREE.LineMaterial({ color: this.color, linewidth: 0.002, dashed:false})
                }
                // this.material = new THREE.LineMaterial({ color: this.color, linewidth: 0.002, dashed:true})

                if (this.type === LINK_TYPES.PATH) {
                    // geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(state.linkResolution * 3), 3));
                    positions = new Float32Array(state.linkResolution * 3);

                } else {
                    if (this.type === LINK_TYPES.LINK) {
                        // geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(2 * 3), 3));
                        positions = new Float32Array(2 * 3);

                    }
                }
            }

            let obj = new THREE.Line2(geometry, this.material);
            obj.renderOrder = 10;  // Prevent visual glitches of dark lines on top of nodes by rendering them last
            obj.__data = this;     // Attach link data
            this.viewObjects["main"] = obj;
        }

        //Link label
        this.labelObjects = this.labelObjects || {};
        if (!this.labelObjects[state.linkLabel] && this[state.linkLabel]){
            this.labelObjects[state.linkLabel] = new SpriteText2D(this[state.linkLabel], state.fontParams);
        }

        this.viewObjects["label"] = this.labelObjects[state.linkLabel];
        if (!this.viewObjects["label"]){ delete this.viewObjects["label"]; }

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
            || (this.conveyingLyph && !this.conveyingLyph.lyphObjects[state.method])
            || (!this.labelObjects[state.linkLabel] && this[state.linkLabel])){
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
                // console.log("before computelinedistances: ", linkObj)
                // linkObj.geometry.computeLineDistances();
                break;
            }
            case LINK_TYPES.PATH: {
                const curve = bezierSemicircle(_start, _end);
                this.center = curve.getPoint(0.5);
                points = curve.getPoints(state.linkResolution-1);

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

        let labelObj = this.viewObjects["label"];
        if (labelObj) {
            labelObj.visible = state.showLinkLabel;
            copyCoords(labelObj.position, this.center);
            labelObj.position.addScalar(5);
        } else {
            delete this.viewObjects["label"];
        }

        if (this.conveyingLyph){
            this.conveyingLyph.updateViewObjects(state);
            this.viewObjects['icon'] = this.conveyingLyph.viewObjects["main"];
            this.viewObjects['iconLabel'] = this.conveyingLyph.viewObjects["label"];
            if (!this.viewObjects['iconLabel']) {delete  this.viewObjects['iconLabel'];}
        } else {
            delete this.viewObjects['icon'];
            delete this.viewObjects["iconLabel"];
        }

        if (this.type == LINK_TYPES.LINK) {
          console.log(linkObj);
        }
        //Update buffered geometries
        if (linkObj && linkObj.geometry.attributes){
            let linkPos = linkObj.geometry.attributes.position;
            // console.log("linkObj.geometry.attributes.position: ", linkObj.geometry.attributes.position)
            var newPoints = linkPos.array.slice();

            // If statement to troubleshoot by line type.
            // if (this.type == LINK_TYPES.AXIS) {
            // if (this.type !== LINK_TYPES.PATH) {

              if (linkPos){
                  // console.log("pre position: ", linkObj)
                  // console.log("pre position points: ", points)

                  for (let i = 0; i < points.length; i++) {
                      newPoints[3 * i] = points[i].x;
                      newPoints[3 * i + 1] = points[i].y;
                      newPoints[3 * i + 2] = points[i].z;
                  }


                  linkPos.needsUpdate = true;
                  linkObj.geometry.setPositions(newPoints);

                  if (this.type == LINK_TYPES.AXIS) {
                    linkObj.computeLineDistances();
                  }
            }

        }


    }
}
