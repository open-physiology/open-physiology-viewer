import * as three from 'three';
const THREE = window.THREE || three;
import {Entity} from './entityModel';
import { align, getCenterPoint, createMeshWithBorder, layerShape, lyphShape} from '../three/utils';
import {copyCoords} from './utils';

/**
 * Class that creates visualization objects of lyphs
 */
export class Lyph extends Entity {

    static fromJSON(json, modelClasses = {}, entitiesByID) {
        json.border      = json.border || {};
        json.border.id   = json.border.id || json.id + "_border";
        let res = super.fromJSON(json, modelClasses, entitiesByID);
        res.border.host  = res;
        return res;
    }

    radialTypes(topology) {
        switch (topology) {
            case "BAG"  :
                return [true, false];
            case "BAG2" :
                return [false, true];
            case "CYST" :
                return [true, true];
        }
        return [false, false];
    }

    get isVisible() {
        return super.isVisible && (this.layerInLyph ? this.layerInLyph.isVisible : true);
    }

    //lyph's center = the center of its rotational axis
    get center() {
        let res = new THREE.Vector3();
        //Note: Do not use lyph borders to compute center as border translation relies on this method
        if (this.layerInLyph && this.viewObjects["main"]) {
            //Note: it is difficult to compute center of a layer geometrically as we have to translate the host axis
            //in the direction orthogonal to the hosting lyph axis along the plane in which the lyph is placed
            //and it can be placed in any plane passing through the axis!
            res = getCenterPoint(this.viewObjects["main"]);
        } else {
            res = this.axis.center || res;
        }
        return res;
    }

    get axis() {
        if (this.conveyedBy) {
            return this.conveyedBy;
        }
        if (this.layerInLyph) {
            return this.layerInLyph.axis;
        }
    }

    get polygonOffsetFactor() {
        let res = 0;
        //Lyphs positioned on top of the given lyph should be rendered first
        //This prevents blinking of polygons with equal z coordinates
        ["layerInLyph", "internalInLyph", "internalInRegion", "hostedByLyph"].forEach((prop, i) => {
            if (this[prop]) {
                res = Math.min(res, this[prop].polygonOffsetFactor - i - 1);
            }
        });
        return res;
    }

    /**
     * Defines size of the conveying lyph based on the length of the link
     * @returns {{height: number, width: number}}
     */
    get size() {
        let res = {height: this.axis.length || 1, width: this.axis.length || 1};
        if (this.scale) {
            res.width  *= this.scale.width / 100;
            res.height *= this.scale.height / 100;
        }
        return res;
    }

    /**
     * Positions the point on the lyph surface
     * @param p0 - initial point (coordinates)
     * @returns {THREE.Vector3} - transformed point (coordinates)
     */
    translate(p0) {
        let transformedLyph = this.layerInLyph ? this.layerInLyph : this;
        if (!p0 || !transformedLyph.viewObjects["main"]) { return p0; }
        let p = p0.clone();
        p.applyQuaternion(transformedLyph.viewObjects["main"].quaternion);
        p.add(transformedLyph.center);
        return p;
    }

    get points(){
        return (this._points||[]).map(p => this.translate(p));
    }

    /**
     * Create view model for the class instance
     * @param state - layout settings
     */
    createViewObjects(state) {
        //Cannot draw a lyph without axis
        if (!this.axis) { return; }

        //Create a lyph object
        if (!this.viewObjects["main"]) {
            //Either use given dimensions or set from axis
            this.width  = this.width  || this.size.width;
            this.height = this.height || this.size.height;

            let numLayers = (this.layers || [this]).length;

            let params = {
                color: this.color,
                polygonOffsetFactor: this.polygonOffsetFactor
            };

            //The shape of the lyph depends on its position in its parent lyph as layer
            let obj = createMeshWithBorder(
                this.prev
                    ? layerShape(
                        [this.prev.width, this.prev.height, this.height / 4, ...this.prev.radialTypes],
                        [this.width, this.height, this.height / 4, ...this.radialTypes])
                    : lyphShape([this.width, this.height, this.height / 4, ...this.radialTypes]),
                params);

            obj.userData = this;
            this.viewObjects['main'] = obj;

            this.offset = this.offset ||0;
            this._points = [
                new THREE.Vector3(this.offset, -this.height / 2, 0),
                new THREE.Vector3(this.offset,  this.height / 2, 0),
                new THREE.Vector3(this.width + this.offset, this.height / 2, 0),
                new THREE.Vector3(this.width + this.offset, -this.height / 2,0),
                new THREE.Vector3(this.offset, -this.height / 2, 0)
            ];

            //Border uses corner points
            this.border.createViewObjects(state);

            //Layers

            //Define proportion each layer takes
            let resizedLayers = (this.layers || []).filter(layer => layer.layerWidth);
            let layerTotalWidth = 0;
            (resizedLayers || []).forEach(layer => layerTotalWidth += layer.layerWidth);
            let defaultWidth = (resizedLayers.length < numLayers) ?
                (100. - layerTotalWidth) / (numLayers - resizedLayers.length) : 0;

            //Link layers
            for (let i = 1; i < (this.layers || []).length; i++) {
                this.layers[i].prev = this.layers[i - 1];
                this.layers[i].prev.next = this.layers[i];
            }

            //Draw layers
            let offset = 0;
            (this.layers || []).forEach(layer => {
                if (!layer.layerWidth) {
                    layer.layerWidth = defaultWidth;
                }
                layer.width = layer.layerWidth / 100 * this.width;
                layer.height = this.height;
                layer.offset = offset;
                offset += layer.width;
                layer.createViewObjects(state);
                let layerObj = layer.viewObjects["main"];
                layerObj.translateX(layer.offset);
                layerObj.translateZ(1);
                obj.add(layerObj);
            });
        }

        //Do not create labels for layers and nested lyphs
        if (this.layerInLyph || this.internalInLyph) { return; }
        this.createLabels(state.labels[this.constructor.name], state.fontParams);

    }

    /**
     * Update positions of lyphs in the force-directed graph (and their inner content)
     * @param state - view settings
     */
    updateViewObjects(state) {
        if (!this.axis) { return; }

        if (!this.viewObjects["main"]) { this.createViewObjects(state); }

        if (!this.layerInLyph) {//update label
            if (!this.internalInLyph) {
                if (!(this.labels[state.labels[this.constructor.name]] && this[state.labels[this.constructor.name]])) {
                    this.createViewObjects(state);
                }
            }
            //update lyph
            this.viewObjects["main"].visible = this.isVisible && state.showLyphs;
            copyCoords(this.viewObjects["main"].position, this.center);
            align(this.axis, this.viewObjects["main"], this.axis.reversed);
        } else {
            this.viewObjects["main"].visible = state.showLayers;
        }

        //update layers
        (this.layers || []).forEach(layer => { layer.updateViewObjects(state); });
        this.border.updateViewObjects(state);

        //Layers and inner lyphs have no labels
        if (this.layerInLyph || this.internalInLyph) { return; }

        this.updateLabels(state.labels[this.constructor.name],
            state.showLabels[this.constructor.name], this.center.clone().addScalar(-5));
    }
}
