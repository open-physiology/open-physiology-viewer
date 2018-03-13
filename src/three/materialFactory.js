import * as three from 'three';
const THREE = window.THREE || three;

import tinyColor from 'tinycolor2';
const colorStr2Hex = str => isNaN(str) ? parseInt(tinyColor(str).toHex(), 16) : str;

/**
 * A class that creates various types of reusable three.js materials of required color
 */
export class MaterialFactory {
    defaultParams = {};

    /**
     * Constructor of the material factory class
     * @param params - common params for all classes
     */
    constructor(params = {}) {
        this.defaultParams = params;
        if (this.defaultParams.color === undefined){
            this.defaultParams.color = "#666";
        }
        if (this.defaultParams.polygonOffset === undefined) {
            this.defaultParams.polygonOffset = true;
        }
        if (this.defaultParams.polygonOffsetUnits === undefined){
            this.defaultParams.polygonOffsetUnits = 1;
        }
        if (this.defaultParams.polygonOffsetFactor === undefined){
            this.defaultParams.polygonOffsetFactor = this.defaultParams.polygonOffsetFactor || 0;
        }
        this.defaultParams.side = this.defaultParams.side || THREE.DoubleSide;
    }

    createLineBasicMaterial(params = {}) {
        let p = Object.assign({}, this.defaultParams, params);
        p.color = colorStr2Hex(p.color);
        p.linewidth = p.linewidth || 3;
        return new THREE.LineBasicMaterial(p);
    }

    createLineDashedMaterial(params = {}) {
        let p = Object.assign({}, this.defaultParams, params);
        p.color = colorStr2Hex(p.color);
        p.scale    = p.scale    || 1;
        p.gapSize  = p.gapSize  || 2;
        p.dashSize = p.dashSize || 3;
        return new THREE.LineDashedMaterial(p);
    }

    createMeshBasicMaterial(params = {}){
        let p = Object.assign({}, this.defaultParams, params);
        p.color = colorStr2Hex(p.color);
        return new THREE.MeshBasicMaterial(p);
    }

    createMeshLambertMaterial(params = {}){
        let p = Object.assign({}, this.defaultParams, params);
        p.color = colorStr2Hex(p.color);
        return new THREE.MeshLambertMaterial(p);
    }
}
