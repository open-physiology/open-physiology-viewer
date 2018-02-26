import { Model } from './model';
import { assign } from 'lodash-bound';

import * as three from 'three';
const THREE = window.THREE || three;
import { SpriteText2D } from 'three-text2d';
import { align, bezierSemicircle, copyCoords } from '../three/utils';

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

    /**
     *
     * @param tree
     * @returns {number} link's level in the tree
     */
    level(tree){
        return -1; //TODO implement
    }

    get lyphSize(){
        const scaleFactor = this.length? Math.log(this.length): 1;
        if (this.type === LINK_TYPES.CONTAINER){
            return {length: 12 * scaleFactor, thickness: 4 * scaleFactor};
        }
        return {length: 6 * scaleFactor, thickness: 2 * scaleFactor};
    }

    alignLyph(obj){
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
                    if (this.type === LINK_TYPES.LINK || this.type === LINK_TYPES.AXIS) {
                        geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(2 * 3), 3));
                    }
                }
            }
            let obj = new THREE.Line(geometry, material);
            obj.renderOrder = 10;     // Prevent visual glitches of dark lines on top of nodes by rendering them last
            obj.__data = this;   // Attach link data
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
            this.viewObjects['icon'] = this.lyph.viewObjects['main'];
            this.viewObjects["iconLabel"] = this.lyph.labelObjects[state.iconLabel];
        }
    }

    /**
     * Update viewObject for the proper visualization in a container (graph, tree, etc.)
     * @param hostedNodes
     */
    updateViewObjects(state){
        if (!this.viewObjects["main"] ||
            (!this.labelObjects[state.linkLabel] && this[state.linkLabel])){
            this.createViewObjects();
        }

        const linkObj = this.viewObjects["main"];
        if (!linkObj) { return; } //No visible link
        let middle, linkPos;
        const _start = new THREE.Vector3(this.source.x, this.source.y, this.source.z || 0);
        const _end = new THREE.Vector3(this.target.x, this.target.y, this.target.z || 0);

        if (this.type === LINK_TYPES.AXIS){
            copyCoords(linkObj.geometry.vertices[0], this.source);
            copyCoords(linkObj.geometry.vertices[1], this.target);
            linkObj.geometry.verticesNeedUpdate = true;
            linkObj.geometry.computeLineDistances();
            middle = _start.clone().add(_end).multiplyScalar(0.5);

        } else {

            if (this.type === LINK_TYPES.CONTAINER){
                //CONTAINER
                let controls = state.graphData.nodes.filter(node => (this.target.controls || []).includes(node.id));
                middle = new THREE.Vector3(0, 0, 0);
                controls.forEach(p => {middle.x += p.x; middle.y += p.y; middle.z += p.z});
                middle = middle.multiplyScalar(1.0 / (controls.length || 1));
                copyCoords(this.target, middle.clone().sub(_start).multiplyScalar(2));

            } else {
                //PATH or LINK
                linkPos = linkObj.geometry.attributes.position;
                if (!linkPos) {return; }

                let points;

                if (this.type === LINK_TYPES.PATH) {
                    const curve = bezierSemicircle(_start, _end);
                    middle = curve.getPoint(0.5);
                    points = curve.getPoints(state.linkResolution - 1);

                    //Position omega tree roots
                    let hostedNodes = state.graphData.nodes.filter(node => (node.host === this.id) && node.isRoot);
                    if (hostedNodes.length > 0) {
                        const delta = ((hostedNodes.length % 2) === 1) ? 0.4 : 0;
                        const offset = 1 / (hostedNodes.length + 1 + delta);
                        hostedNodes.forEach((root, i) => {
                            const rootObj = root.viewObjects["main"];
                            if (!rootObj) { return; }
                            const pos = curve.getPoint(offset * (i + 1));
                            copyCoords(rootObj.position, pos);
                            copyCoords(root, pos);
                        });
                    }
                } else {//this.type === LINK_TYPE.LINK
                    points = [_start, _end];
                    middle = _start.clone().add(_end).multiplyScalar(0.5);
                }

                for (let i = 0; i < points.length; i++) {
                    linkPos.array[3 * i] = points[i].x;
                    linkPos.array[3 * i + 1] = points[i].y;
                    linkPos.array[3 * i + 2] = points[i].z;
                }
            }
        }

        if (this.viewObjects["label"]) {
            this.viewObjects["label"].visible = state.showLinkLabel;
            copyCoords(this.viewObjects["label"].position, middle);
            this.viewObjects["label"].position.addScalar(5);
        } else {
            delete this.viewObjects["label"];
        }

        if (this.lyph){
            this.lyph.updateViewObjects(state);
            this.viewObjects['icon'] = this.lyph.viewObjects["main"];
            this.viewObjects['iconLabel'] = this.lyph.viewObjects["label"];

            if (this.viewObjects['icon']){
                this.viewObjects['icon'].visible = state.showIcon;
                copyCoords(this.viewObjects['icon'].position, middle);
                this.alignLyph(this.viewObjects['icon']);
            }

            if (this.viewObjects["iconLabel"]){
                this.viewObjects["iconLabel"].visible = state.showIconLabel;
                copyCoords(this.viewObjects["iconLabel"].position, middle);
                this.viewObjects["iconLabel"].position.addScalar(-5);
            } else {
                delete this.viewObjects["iconLabel"];
            }
        } else {
            delete this.viewObjects['icon'];
            delete this.viewObjects["iconLabel"];
        }

        if (linkPos){
            linkPos.needsUpdate = true;
            linkObj.geometry.computeBoundingSphere();
        }
    }

}
