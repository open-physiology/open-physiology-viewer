import * as three from 'three';
const THREE = window.THREE || three;

import tinyColor from 'tinycolor2';
const colorStr2Hex = str => isNaN(str) ? parseInt(tinyColor(str).toHex(), 16) : str;

/**
 * A class that creates various types of reusable three.js materials of required color
 */
export class MaterialFactory {
    defaultParams = {};
    meshBasicMaterials   = {};
    meshLambertMaterials = {};
    lineBasicMaterials   = {};
    lineDashedMaterials  = {};
    specialMaterials     = {};

    /**
     * Constructor of the material factory class
     * @param params - common params for all classes
     */
    constructor(params = {}) {
        this.defaultParams = params;
        if (!this.defaultParams["color"]){
            this.defaultParams["color"] = "#888";
        }
    }

    //TODO define default values for all material properties

    getSpecialMaterial(color, params){
        if (!this.specialMaterials.hasOwnProperty(color)) {
            this.specialMaterials[color] = new THREE.MeshBasicMaterial({
                color      : colorStr2Hex(color || this.defaultParams.color),
                transparent: true,
                opacity    : params.opacity || this.defaultParams.opacity,
                side       : THREE.DoubleSide
            });
        }
        return this.specialMaterials[color];
    }

    getLineBasicMaterial(color, params = {}) {
        if (!this.lineBasicMaterials.hasOwnProperty(color)) {
            this.lineBasicMaterials[color] = new THREE.LineBasicMaterial({
                color      : colorStr2Hex(color || this.defaultParams.color),
                transparent: true,
                opacity    : params.opacity || this.defaultParams.opacity
            });
        }
        return this.lineBasicMaterials[color];
    }

    getLineDashedMaterial(color, params = {}) {
        if (!this.lineDashedMaterials.hasOwnProperty(color)) {
            this.lineDashedMaterials[color] = new THREE.LineDashedMaterial({
                color      : colorStr2Hex(color || this.defaultParams.color),
                transparent: true,
                scale      : 1,
                dashSize   : 3,
                gapSize    : 2,
                opacity    : params.opacity || this.defaultParams.opacity
            });
        }
        return this.lineDashedMaterials[color];
    }

    getMeshBasicMaterial(color, params = {}){
        if (!this.meshBasicMaterials.hasOwnProperty(color)) {
            this.meshBasicMaterials[color] = new THREE.MeshBasicMaterial({
                color      : colorStr2Hex(color || this.defaultParams.color),
                transparent: true,
                opacity    : params.opacity || this.defaultParams.opacity,
                side       : THREE.DoubleSide
            });
        }
        return this.meshBasicMaterials[color];
    }

    getMeshLambertMaterial(color, params = {}){
        if (!this.meshLambertMaterials.hasOwnProperty(color)) {
            this.meshLambertMaterials[color] = new THREE.MeshLambertMaterial({
                color      : colorStr2Hex(color || this.defaultParams.color),
                transparent: true,
                opacity    : params.opacity || this.defaultParams.opacity
            });
        }
        return this.meshLambertMaterials[color];
    }
}
