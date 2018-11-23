import * as three from 'three';
const THREE = window.THREE || three;
import { copyCoords } from './utils';
import { Link, LINK_GEOMETRY } from './linkModel';
import { Node } from './nodeModel';
import { Lyph } from './lyphModel';
import { Entity } from './entityModel';
import { BorderPart } from "./borderPartModel";
import { isObject } from 'lodash-bound';
import { getCenterOfMass, lyphBorders, polygonBorders, polygonBorderLinks, extractCoords, boundToRectangle, boundToPolygon} from '../three/utils';

/**
 * Lyph or region border
 */
export class Border extends Entity {

    static fromJSON(json, modelClasses = {}, entitiesByID) {
        const res = super.fromJSON(json, modelClasses, entitiesByID);
        (res.borders||[]).forEach(border => {
            if (!border) { return; }
            (border.hostedNodes||[]).forEach(node => {
                if (!node::isObject()){
                    console.error("Border content not instantiated", node);
                } else {
                    node.host = res
                }
            });
            if (border.conveyingLyph){
                if (!border.conveyingLyph::isObject()){
                    console.error("Border content not instantiated", border.conveyingLyph);
                }
            }
        });
        return res;
    }

    get isVisible(){
        return super.isVisible && (this.host? this.host.isVisible: true);
    }

    get polygonOffsetFactor(){
        return this.host? this.host.polygonOffsetFactor: 0;
    }

    /**
     * Creates links (objects with fields 'source' and 'target') to define sides of the lyph rectangle
     * @returns {Array}
     */
    get borderLinks(){
        return (this._borderLinks||[]).map(({source, target}) => {
            return {
                source: this.host.translate(source),
                target: this.host.translate(target)
            }
        });
    }

    /**
     * Returns coordinates of the bounding box (min and max points defining a parallelogram containing the border points)
     */
    getBoundingBox(){
        let [x, y, z] = ["x","y","z"].map(key => this.host.points.map(p => p[key]));
        let min = {"x": Math.min(...x), "y": Math.min(...y), "z": Math.min(...z)};
        let max = {"x": Math.max(...x), "y": Math.max(...y), "z": Math.max(...z)};
        return [min, max];
    }

    /**
     * Assigns fixed position on a grid inside border
     * @param link - link to place inside border
     * @param i    - position
     * @param numCols - number of columns
     * @param numRows - number of Rows
     */
    placeLinkInside(link, i, numCols, numRows){//TODO this will only work well for rectangular shapes
        let delta = 0.05; //offset from the border
        let p = this.host.points.slice(0,3).map(p => p.clone());
        p.forEach(p => p.z += 1);
        let dX = p[1].clone().sub(p[0]);
        let dY = p[2].clone().sub(p[1]);
        let offsetY = dY.clone().multiplyScalar(delta + Math.floor(i / numCols) / (numRows * (1 + 2 * delta) ) );
        let sOffsetX = dX.clone().multiplyScalar(i % numCols / numCols + link.source.offset || 0);
        let tOffsetX = dX.clone().multiplyScalar(1 - (i % numCols + 1) / numCols + link.target.offset || 0);
        copyCoords(link.source, p[0].clone().add(sOffsetX).add(offsetY));
        copyCoords(link.target, p[1].clone().sub(tOffsetX).add(offsetY));
        link.source.z += 1;
    }

    placeNodeInside(node, i, n, center){//TODO this will only work well for rectangular shapes
        let [min, max] = this.getBoundingBox();
        let dX = max.x - min.x; let dY = max.y - min.y;
        let r = Math.min(dX, dY) / 4;
        let offset = new THREE.Vector3( r, 0, 0 );
        let axis   = new THREE.Vector3( 0, 0, 1);
        let angle  = 4 * Math.PI * i / n;
        offset.applyAxisAngle( axis, angle );
        let pos = center.clone().add(offset);
        copyCoords(node, pos);
        node.z += 2;
    }

    /**
     * Push existing link inside of the border
     * @param link
     */
    pushLinkInside(link) {
        const delta = 5;
        let points = this.host.points.map(p => p.clone());
        let [min, max] = this.getBoundingBox();
        //Global force pushes content on top of lyph
        if (Math.abs(max.z - min.z) <= delta) {
            //Fast way to get projection for lyphs parallel to x-y plane
            link.source.z = link.target.z = points[0].z + 1;
        } else {
            //Project links with hosted lyphs to the container lyph plane
            let plane = new THREE.Plane();
            plane.setFromCoplanarPoints(...points.slice(0,3));

            ["source", "target"].forEach(key => {
                let node = extractCoords(link[key]);
                plane.projectPoint(node, node);
                node.z += 1;
                copyCoords(link[key], node);
            });
        }
        boundToRectangle(link.source, min, max);
        boundToRectangle(link.target, min, max);
        let [dX, dY] = ["x", "y"].map(key => points.map(p => Math.min(p[key] - min[key], max[key] - p[key])));
        if (Math.max(...[...dX,...dY]) > delta) { //if the shape is not rectangle
            //Push the link to the tilted lyph rectangle
            boundToPolygon(link, this.borderLinks);
        }
    }

    createViewObjects(state){
        //Make sure we always have border objects regardless of data input
        for (let i = this.borders.length; i < (this.host.points||[]).length -1 ; i++){
            this.borders.push(BorderPart.fromJSON({}));
        }

        this.viewObjects["shape"] = (this.host instanceof Lyph)
            ? lyphBorders([this.host.width, this.host.height, this.host.width / 2, ...this.host.radialTypes])
            : polygonBorders(this.host.points);

        this._borderLinks = polygonBorderLinks(this.host.points);

        this.borders.forEach((border, i) => {
            if (border.conveyingLyph) {
                let id = `${this.id}`;
                let [s, t] = ["s", "t"].map(prefix => Node.fromJSON({"id": `${prefix}_${id}`}));
                border.link = Link.fromJSON({
                    "id"           : `lnk_${id}`,
                    "source"       : s,
                    "target"       : t,
                    "geometry"     : LINK_GEOMETRY.INVISIBLE,
                    "length"       : this._borderLinks[i].target.distanceTo(this._borderLinks[i].source),
                    "conveyingLyph": border.conveyingLyph,
                    "linkOnBorder" : border  //Save the border as the link's host
                });
                border.conveyingLyph.conveyedBy = border.link;
                border.link.createViewObjects(state);
            }
        });
    }

    updateViewObjects(state){

        //By doing the update here, we also support inner content in the region
        const lyphsToLinks = (lyphs) => (lyphs || []).filter(lyph => lyph.axis).map(lyph => lyph.axis);

        let internalLinks = lyphsToLinks(this.host.internalLyphs);
        let numCols = this.host.internalLyphColumns || 1;
        let numRows = internalLinks.length / numCols;
        internalLinks.forEach((link, i) => { this.placeLinkInside(link, i, numCols, numRows); });
        lyphsToLinks(this.host.hostedLyphs).forEach((link) => { this.pushLinkInside(link); });

         let center = getCenterOfMass(this.host.points);
        (this.host.internalNodes || []).forEach((node, i) => {
            this.placeNodeInside(node, i,
            this.host.internalNodes.length, center)
        });

        (this.borders || []).forEach((border, i) => {
            if (border.hostedNodes){
                //position nodes on the lyph border (exact shape, we use 'borderLinks' to place nodes on straight line)
                const offset = 1 / (border.hostedNodes.length + 1);
                border.hostedNodes.forEach((node, j) => {
                    let p = this.viewObjects["shape"][i].getPoint(node.offset ? node.offset : offset * (j + 1));
                    p = new THREE.Vector3(p.x, p.y, 0);
                    copyCoords(node, this.host.translate(p));
                })
            }
            if (border.link) {
                let tmp = this.borderLinks[i];
                copyCoords(border.link.source, tmp.source);
                copyCoords(border.link.target, tmp.target);
                border.link.updateViewObjects(state);
                //Add border conveyingLyph to the scene
                state.graphScene.add(border.link.conveyingLyph.viewObjects["main"]);
            }
        });
    }
}