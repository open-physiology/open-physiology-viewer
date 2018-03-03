import * as three from 'three';
const THREE = window.THREE || three;

import tinyColor from 'tinycolor2';
const colorStr2Hex = str => isNaN(str) ? parseInt(tinyColor(str).toHex(), 16) : str;

/**
 * A class that creates various types of reusable three.js materials of required color
 */
export class MaterialFactory {
    defaultParams = {}; //TODO define default values for all material properties

    /**
     * Constructor of the material factory class
     * @param params - common params for all classes
     */
    constructor(params = {}) {
        this.defaultParams = params;
        if (!this.defaultParams["color"]){
            this.defaultParams["color"] = "#666";
        }
    }

    createLineBasicMaterial(params = {}) {
        return new THREE.LineBasicMaterial({
            color      : colorStr2Hex(params.color || this.defaultParams.color),
            transparent: params.transparent || this.defaultParams.transparent,
            opacity    : params.opacity || this.defaultParams.opacity
        });
    }

    createLineDashedMaterial(params = {}) {
       return new THREE.LineDashedMaterial({
            color      : colorStr2Hex(params.color || this.defaultParams.color),
            transparent: params.transparent || this.defaultParams.transparent,
            scale      : params.scale    || 1,
            dashSize   : params.dashSize || 3,
            gapSize    : params.gapSize  || 2,
            opacity    : params.opacity  || this.defaultParams.opacity
       });
    }

    createMeshBasicMaterial(params = {}){
        return new THREE.MeshBasicMaterial({
            color      : colorStr2Hex(params.color || this.defaultParams.color),
            transparent: params.transparent || this.defaultParams.transparent,
            opacity    : params.opacity || this.defaultParams.opacity,
            side       : params.side || THREE.DoubleSide
        });
    }

    createMeshLambertMaterial(params = {}){
        return new THREE.MeshLambertMaterial({
            color      : colorStr2Hex(params.color || this.defaultParams.color),
            transparent: params.transparent || this.defaultParams.transparent,
            opacity    : params.opacity || this.defaultParams.opacity,
            side       : params.side || THREE.DoubleSide
        });
    }
}
