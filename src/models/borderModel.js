import { Entity } from './entityModel';
import * as three from 'three';
const THREE = window.THREE || three;
import { copyCoords } from './utils';
import { Link, LINK_GEOMETRY } from './linkModel';
import { Node } from './nodeModel';
import { Lyph } from './lyphModel';
import { isObject } from 'lodash-bound';
import {d2LyphBorders, d2LyphBorderLinks} from '../three/utils';

/**
 * Lyph or region border
 */
export class Border extends Entity {
    static fromJSON(json, modelClasses = {}, entitiesByID) {
        const result = super.fromJSON(json, modelClasses, entitiesByID);
        (result.borders || []).filter(border => border.hostedNodes)
            .forEach(border =>
                    border.hostedNodes.forEach(node => {
                        if (!node::isObject()){
                            console.error("Border content not instantiated", node); return;
                        }
                        node.host = result
                    })
            );
        return result;
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

    createViewObjects(state){
        //Make sure we always have border objects regardless of data input
        this.borders = this.borders || [];
        this.links   = new Array(this.borders.length);

        //Create lyph borders
        if (this.host instanceof Lyph){
            for (let i = this.borders.length; i < 4; i++){ this.borders.push({}); }
            this.viewObjects["shape"] = d2LyphBorders([
                this.host.width, this.host.height,
                this.host.width / 2, ...this.host.radialTypes]);
            this._borderLinks = d2LyphBorderLinks(this.host); //TODO generalize to work with regions (polygons)
        }

        (this.viewObjects["shape"]||[]).forEach((obj, i) => {
             this.borders[i].viewObjects = this.borders[i].viewObjects || {};
             this.borders[i].viewObjects["shape"] = obj; //Reserve "main" to store actual border lines
        });

        //TODO create a BorderPart class?
        this.borders.forEach((border, i) => {
            //Important: do not filter the borders array to retain the right border number
            if (!border.conveyingLyph) { return; }
            let id = `${this.id}`;
            //Turn border into a link if we need to draw its nested content (conveying lyph)
            let s = Node.fromJSON({"id": `s_${id}`});
            let t = Node.fromJSON({"id": `t_${id}`});
            this.links[i] = Link.fromJSON({
                "id"    : `lnk_${id}`,
                "source": s,
                "target": t,
                "geometry"  : LINK_GEOMETRY.INVISIBLE,
                "length": this._borderLinks[i].target.distanceTo(this._borderLinks[i].source),
                "conveyingLyph" : border.conveyingLyph,
                "linkOnBorder"  : border  //Save the border as the link's host
            });
            border.conveyingLyph.conveyedBy = this.links[i];

            this.links[i].createViewObjects(state);
        });
    }

    updateViewObjects(state){
        (this.borders || []).filter(border => border.hostedNodes).forEach(border => {
            //position nodes on the lyph border (exact shape, we use 'borderLinks' to place nodes on straight line)
            const offset = 1 / (border.hostedNodes.length + 1);
            border.hostedNodes.forEach((node, i) => {
                let p = border.viewObjects["shape"].getPoint(node.offset ? node.offset : offset * (i + 1));
                p = new THREE.Vector3(p.x, p.y, 0);
                copyCoords(node, this.host.translate(p));
            })
        });

        (this.links || []).forEach((lnk, i) => {
            //Important: do not filter the links array to retain the right border number
            if (!lnk) { return; }
            let tmp = this.borderLinks[i];
            copyCoords(lnk.source, tmp.source);
            copyCoords(lnk.target, tmp.target);
            lnk.updateViewObjects(state);
            //Add border conveyingLyph to the scene
            state.graphScene.add(this.links[i].conveyingLyph.viewObjects["main"]);
        })
    }
}