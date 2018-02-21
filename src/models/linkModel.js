import { Model } from './model';
import { assign } from 'lodash-bound';

import * as three from 'three';
const THREE = window.THREE || three;
import { SpriteText2D } from 'three-text2d';
import { d3Lyph, d2Lyph, bezierSemicircle, copyCoords } from '../three/utils';

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

    get iconSize(){
        const scaleFactor = this.length? Math.log(this.length): 1;
        return {length: 6 * scaleFactor, thickness: 2 * scaleFactor};
    }

    alignIcon(obj){
        if (!obj) {return; }
        let axis = new THREE.Vector3(0, 1, 0);
        let vector = new THREE.Vector3(
            this.target.x - this.source.x,
            this.target.y - this.source.y,
            this.target.z - this.source.z,
        );
        obj.quaternion.setFromUnitVectors(axis, vector.clone().normalize());
    }


    /**
     * Create a three.js object
     * @returns {Raycaster.params.Line|Line|SEA3D.Line|*}
     */
    createViewObjects(state){
        if (this.type === LINK_TYPES.COALESCENCE) {return; }

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

        if (!this.labelObjects) {
            this.labelObjects = {};
            ['id', 'name', 'external'].filter(label => this[label]).forEach(label =>
                this.labelObjects[label] = new SpriteText2D(this[label], state.fontParams));
        }
        if (this.labelObjects[state.linkLabel]){
            this.viewObjects["label"] = this.labelObjects[state.linkLabel];
        } else {
             delete this.viewObjects["label"];
        }

        this.createLyphViewObjects(state);
    }

    /**
     *
     * @param state
     * @returns {*}
     */
    createLyphViewObjects(state){
        if (!this.lyph)  { return; }
        const method = state.method || '2d';

        if (!this.lyph.viewObjects[method]){
            if (!this.lyph.layers){ return; }

            const lyphObj = new THREE.Object3D();
            const {length, thickness} = this.iconSize;
            this.lyph.layers.forEach((layer, i) => {
                if (!layer.material) {
                    layer.material = state.materialRepo.getMeshBasicMaterial(layer.color, {side: THREE.DoubleSide});
                }
                let layerObj;
                if (method === "3d"){
                    layerObj = d3Lyph(
                        [ thickness * i + 1,       length,         thickness / 2, ...layer.borders],
                        [ thickness * (i + 1) + 1, length + i * 2, thickness / 2, ...layer.borders],
                        layer.material);
                } else {
                    layerObj = d2Lyph(
                        [thickness * i, length,         thickness / 2, ...layer.borders],
                        [thickness,     length + i * 2, thickness / 2, ...layer.borders],
                        layer.material
                    );
                    layerObj.translateX(thickness * i);
                }
                lyphObj.add(layerObj);

            });
            this.lyph.viewObjects[method] = lyphObj;
        }

        this.viewObjects['icon'] = this.lyph.viewObjects[method];

        if (!this.lyph.labelObjects) {
            this.lyph.labelObjects = {};
            ['id', 'name', 'external'].filter(label => this.lyph[label]).forEach(label =>
                this.lyph.labelObjects[label] = new SpriteText2D(this.lyph[label], state.fontParams));
        }

        if (this.lyph.labelObjects[state.iconLabel]){
            this.viewObjects["iconLabel"] = this.lyph.labelObjects[state.iconLabel];
        } else {
            delete this.viewObjects["iconLabel"];
        }
    }

    /**
     * Update viewObject for the proper visualization in a container (graph, tree, etc.)
     * @param hostedNodes
     */
    updateViewObjects(state){
        const linkObj    = this.viewObjects["main"];
        if (!linkObj)    { return;}

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

        const objLabel = this.viewObjects["label"];
        if (objLabel) {
            objLabel.visible = state.showLinkLabel;
            copyCoords(objLabel.position, middle);
            objLabel.position.addScalar(5);
        }

        const objIcon = this.viewObjects['icon'];
        if (objIcon){
            objIcon.visible = state.showIcon;
            copyCoords(objIcon.position, middle);
            this.alignIcon(objIcon);
        }

        const objIconLabel = this.viewObjects["iconLabel"];
        if (objIconLabel){
            objIconLabel.visible = state.showIconLabel;
            copyCoords(objIconLabel.position, middle);
            objIconLabel.position.addScalar(-5);
        }

        if (linkPos){
            linkPos.needsUpdate = true;
            linkObj.geometry.computeBoundingSphere();
        }
    }

}
