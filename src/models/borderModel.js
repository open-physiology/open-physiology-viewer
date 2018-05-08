import { Entity } from './entityModel';
import { assign } from 'lodash-bound';
import { copyCoords } from '../three/utils';

/**
 * Complete lyph border
 */
export class Border extends Entity {
    //properties copied from manifest by Entity constructor

    get radialTypes(){
        return [this.borderTypes[1], this.borderTypes[2]];
    }

    get borderNodes(){
        let res = [];
        (this.borders || []).filter(border => border.nodes)
            .forEach(border => res = [...res, border.nodes]);
        return new Set(res);
    }

    /**
     * Creates links (objects with fields 'source' and 'target') to define sides of the lyph rectangle
     * @returns {Array}
     */
    get borderLinks(){
        /**
         * Creates links (objects with fields 'source' and 'target') to define
         * sides of the lyph rectangle in the center of coordinates
         * @param width  - lyph/layer width
         * @param height - lyph/layer height
         * @param offset - layer offset
         * @returns {Array}
         */
        function d2LyphBorderLinks({width, height, offset = 0}){
            let borders = new Array(4);
            borders[0] = {
                source: new THREE.Vector3(offset, -height / 2, 0),
                target: new THREE.Vector3(offset, height / 2, 0)};
            borders[1] = {
                source: borders[0].target.clone(),
                target: new THREE.Vector3(width + offset, height / 2, 0)};
            borders[2] = {
                source: borders[1].target.clone(),
                target: new THREE.Vector3(width + offset, -height / 2, 0)};
            borders[3] = {
                source: borders[2].target.clone(),
                target: new THREE.Vector3(offset, -height / 2, 0)};
            return borders;
        }
        this._borderLinks = this._borderLinks || d2LyphBorderLinks(this.borderInLyph);

        //Translate to the current location of the lyph/layer
        return this._borderLinks.map(({source, target}) => {
            return {
                source: this.borderInLyph.translate(source),
                target: this.borderInLyph.translate(target)
            }
        });
    }

    createViewObjects(state){
        //TODO test & revise to correctly handle layer offset (as in borderLinks)
        /**
         * Create shapes of lyph borders
         * @param width
         * @param height
         * @param radius
         * @param top
         * @param bottom
         * @returns {Array}
         */
        function d2LyphBorders([width,  height,  radius,  top,  bottom]){
            let borders = [0,1,2,3].map(x => new THREE.Shape());

            //Axial border
            borders[0].moveTo( 0, - height / 2);
            borders[0].lineTo( 0,   height / 2);
            borders[1].moveTo( 0,   height / 2);
            //Top radial border
            if (top){
                borders[1].lineTo( width - radius, height / 2);
                borders[1].quadraticCurveTo( width,  height / 2, width,  height / 2 - radius);
                borders[2].moveTo( width,  height / 2 - radius);
            } else {
                borders[1].lineTo( width,  height / 2);
                borders[2].moveTo( width,  height / 2);
            }
            //Non-axial border
            if (bottom){
                borders[2].lineTo( width, - height / 2 + radius);
                borders[2].quadraticCurveTo( width, -height / 2, width - radius, -height / 2);
                borders[3].moveTo( width - radius, -height / 2);
            } else {
                borders[2].lineTo( width, -height / 2);
                borders[3].moveTo( width, -height / 2);
            }

            //Finish Bottom radial border
            borders[3].lineTo( 0, - height / 2);
            return borders;
        }

        //Cannot create borders if host lyph is not defined
        if (!this.borderInLyph){ return; }

        //Make sure we always have 4 border objects regardless of data input
        this.borders = this.borders || [];
        for (let i = this.borders.length; i < 4; i++){ this.borders.push({}); }

        //Create and store border shapes
        this.viewObjects["shape"] = d2LyphBorders(
            [this.borderInLyph.width, this.borderInLyph.height, this.borderInLyph.width / 2, ...this.radialTypes]);
        this.viewObjects["shape"].forEach((obj, i) => {
             this.borders[i].viewObjects = this.borders[i].viewObjects || {};
             this.borders[i].viewObjects["shape"] = obj; //We will use "main" to store actual border lines
        });
    }

    updateViewObjects(state){
        (this.borders || []).forEach((border, i) => {
            if (border.nodes) {
                //position nodes on the lyph border (exact shape, use 'borderLinks' to place nodes on straight line)
                let points = border.viewObjects["shape"].getSpacedPoints(border.nodes.length + 1)
                    .map(p => new THREE.Vector3(p.x, p.y, 0));
                points = points.map(p => this.borderInLyph.translate(p));
                border.nodes.forEach((nodeID, i) => {
                    let node = state.graphData.nodes.find(node => node.id === nodeID);
                    if (node) { copyCoords(node, points[i + 1]); }
                });
            }
        });
    }
}