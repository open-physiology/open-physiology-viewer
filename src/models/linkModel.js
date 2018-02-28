import { Model } from './model';
import { assign } from 'lodash-bound';

import * as three from 'three';
const THREE = window.THREE || three;
import { SpriteText2D } from 'three-text2d';
import { align, bezierSemicircle, copyCoords, getBoundingBox, getCenterPoint } from '../three/utils';

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
    lyph;   //Rename to conveyingLyph
    type;

    toJSON() {
        let res = super.toJSON();
        res.source = this.source && this.source.id;
        res.target = this.target && this.target.id;
        res.lyph   = this.lyph && this.lyph.id;
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
        return (new THREE.Vector3(
            this.target.x - this.source.x,
            this.target.y - this.source.y,
            this.target.z - this.source.z
        )).normalize();
    }

    get lyphSize(){
        const scaleFactor = this.length? Math.log(this.length): 1;
        if (this.type === LINK_TYPES.CONTAINER){
            return {length: 24 * scaleFactor, thickness: 8 * scaleFactor};
        }
        return {length: 6 * scaleFactor, thickness: 2 * scaleFactor};
    }

    align(obj){
        return align(this, obj);
    }

    /**
     * Create a three.js object
     * @returns {Raycaster.params.Line|Line|SEA3D.Line|*}
     */
    createViewObjects(state){
        if (this.type === LINK_TYPES.COALESCENCE) {return; }

        //Link
        if (!this.viewObjects["main"]) {
            let geometry, material;
            if (this.type === LINK_TYPES.AXIS) {
                geometry = new THREE.Geometry();
                material = state.materialRepo.getLineDashedMaterial(this.color);
                geometry.vertices = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];
            } else {
                geometry = new THREE.BufferGeometry();
                material = state.materialRepo.getLineBasicMaterial(this.color);
                if (this.type === LINK_TYPES.PATH) {
                    geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(state.linkResolution * 3), 3));
                } else {
                    if (this.type === LINK_TYPES.LINK) {
                        geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(2 * 3), 3));
                    }
                }
            }
            let obj = new THREE.Line(geometry, material);
            obj.renderOrder = 10;  // Prevent visual glitches of dark lines on top of nodes by rendering them last
            obj.__data = this;     // Attach link data
            this.viewObjects["main"] = obj;
        }

        //Link label
        this.labelObjects = this.labelObjects || {};
        if (!this.labelObjects[state.linkLabel] && this[state.linkLabel]){
            this.labelObjects[state.linkLabel] = new SpriteText2D(this[state.linkLabel], state.fontParams);
        }
        if (this.labelObjects[state.linkLabel]){
            this.viewObjects["label"] = this.labelObjects[state.linkLabel];
        } else {
            delete this.viewObjects["label"];
        }

        //Icon (lyph)
        if (this.lyph) {
            this.lyph.createViewObjects(Object.assign(state, {axis: this}));
            this.viewObjects['icon']      = this.lyph.viewObjects['main'];
            if (this.lyph.viewObjects["label"]){
                this.viewObjects["iconLabel"] = this.lyph.viewObjects["label"];
            } else {
                delete this.viewObjects["iconLabel"];
            }
        }
    }

    updateLyphObjects(state, newPosition){
        if (this.lyph){
            this.lyph.updateViewObjects(state);
            this.viewObjects['icon'] = this.lyph.viewObjects["main"];
            this.viewObjects['iconLabel'] = this.lyph.viewObjects["label"];

            //lyph
            let lyphObj = this.viewObjects['icon'];
            if (lyphObj){
                lyphObj.visible = state.showIcon;
                copyCoords(lyphObj.position, newPosition);
                this.align(lyphObj);
            } else {

            }

            //position nodes on lyph border
            if (this.lyph.borderObjects["2d"]){
                if (this.boundaryNodes){
                    //Get spaced points on the border to place boundary nodes
                    let NUM_POINTS = 4 * this.boundaryNodes.length;
                    let points = this.lyph.borderObjects["2d"].getSpacedPoints(NUM_POINTS).map(p => new THREE.Vector3(p.x, p.y, 0));
                    let arrow = new THREE.ArrowHelper(this.direction, newPosition);
                    points.forEach(p => {
                        p.add(newPosition);
                        p.applyQuaternion(arrow.quaternion);
                    });

                    let boundaryNodes = state.graphData.nodes.filter(node => this.boundaryNodes.includes(node.id));
                    ["0", "1", "2", "3"].forEach((borderNum, j) => {
                        let nodesOnBorder = boundaryNodes.filter((node, i) => (this.boundaryNodeBorders[i] || 0) === borderNum);
                        nodesOnBorder.forEach((node, i) => {
                            let pos = points[boundaryNodes.length * j + i];
                            copyCoords(node, pos);
                            const nodeObj = node.viewObjects["main"];
                            if (!nodeObj) { return; }
                            copyCoords(nodeObj.position, pos);
                        });
                    });
                }
            }
            if (this.internalLyphs){
                const fociCenter = getCenterPoint(this.lyph.lyphObjects[state.method]) || newPosition;
                state.graphData.links
                    .filter(link =>  link.lyph && this.internalLyphs.includes(link.lyph.id))
                    .forEach(link => {
                        copyCoords(link.source.layout, fociCenter);
                        copyCoords(link.target.layout, fociCenter);
                    });

                //TODO force internal nodes to stay inside of the container lyph instead of just attracting to its center
            }

            //Lyph label
            let lyphLabelObj = this.viewObjects["iconLabel"];
            if (lyphLabelObj){
                lyphLabelObj.visible = state.showIconLabel;
                copyCoords(lyphLabelObj.position, newPosition);
                lyphLabelObj.position.addScalar(-5);
            } else {
                delete this.viewObjects["iconLabel"];
            }
        } else {
            delete this.viewObjects['icon'];
            delete this.viewObjects["iconLabel"];
        }
    }

    /**
     *
     * @param state
     */
    updateViewObjects(state){
        if (!this.viewObjects["main"]
            || (this.lyph && !this.lyph.lyphObjects[state.method])
            || (!this.labelObjects[state.linkLabel] && this[state.linkLabel])){
            this.createViewObjects(state);
        }

        const linkObj = this.viewObjects["main"];
        if (!linkObj) { return; } //No visible link

        let points, middle, linkPos;
        let _start = new THREE.Vector3(this.source.x, this.source.y, this.source.z || 0);
        let _end = new THREE.Vector3(this.target.x, this.target.y, this.target.z || 0);

        switch(this.type){
            case LINK_TYPES.AXIS: {
                copyCoords(linkObj.geometry.vertices[0], this.source);
                copyCoords(linkObj.geometry.vertices[1], this.target);
                linkObj.geometry.verticesNeedUpdate = true;
                linkObj.geometry.computeLineDistances();
                middle = _start.clone().add(_end).multiplyScalar(0.5);
                break;
            }
            case LINK_TYPES.CONTAINER: {
                //CONTAINER
                let controls = state.graphData.nodes.filter(node => (this.target.controls || []).includes(node.id));

                middle = new THREE.Vector3(0, 0, 0);
                controls.forEach(p => {middle.x += p.x; middle.y += p.y; middle.z += p.z});
                middle = middle.multiplyScalar(1.0 / (controls.length || 1));
                copyCoords(this.target, middle.clone().sub(_start).multiplyScalar(2));

                //For testing, draw container link
                // _start = new THREE.Vector3(this.source.x, this.source.y, this.source.z || 0);
                // _end = new THREE.Vector3(this.target.x, this.target.y, this.target.z || 0);
                // points = [_start, _end];

                break;
            }
            case LINK_TYPES.PATH: {
                const curve = bezierSemicircle(_start, _end);
                middle = curve.getPoint(0.5);
                points = curve.getPoints(state.linkResolution - 1);

                //Position omega tree roots
                let hostedNodes = state.graphData.nodes.filter(node => (node.host === this.id) && node.isRoot);
                if (hostedNodes.length > 0) {
                    const delta = ((hostedNodes.length % 2) === 1) ? 0.4 : 0;
                    const offset = 1 / (hostedNodes.length + 1 + delta);
                    hostedNodes.forEach((node, i) => {
                        const pos = curve.getPoint(offset * (i + 1));
                        copyCoords(node, pos);
                        const nodeObj = node.viewObjects["main"];
                        if (!nodeObj) { return; }
                        copyCoords(nodeObj.position, pos);
                    });
                }
                break;
            }
            case LINK_TYPES.LINK: {
                points = [_start, _end];
                middle = _start.clone().add(_end).multiplyScalar(0.5);
                break;
            }
        }
        //Update buffered geometries (LINK or PATH)
        if (points){
            linkPos = linkObj.geometry.attributes.position;
            for (let i = 0; i < points.length; i++) {
                linkPos.array[3 * i] = points[i].x;
                linkPos.array[3 * i + 1] = points[i].y;
                linkPos.array[3 * i + 2] = points[i].z;
            }
        }

        let labelObj = this.viewObjects["label"];
        if (labelObj) {
            labelObj.visible = state.showLinkLabel;
            copyCoords(labelObj.position, middle);
            labelObj.position.addScalar(5);
        } else {
            delete this.viewObjects["label"];
        }

        this.updateLyphObjects(state, middle);


        if (linkPos){
            linkPos.needsUpdate = true;
            linkObj.geometry.computeBoundingSphere();
        }
    }
}
