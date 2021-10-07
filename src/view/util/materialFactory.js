import * as three from 'three';
import {clone, merge} from 'lodash-bound';
import tinycolor from 'tinycolor2';
import { GeometryFactory } from './geometryFactory'

const defaultParams = {
    transparent: true,
    opacity : 0.6,
    side    : THREE.DoubleSide,
    color   : "#666",
    polygonOffsetUnits : 1,
    polygonOffset      : true,
    polygonOffsetFactor: 0
};

/**
 * Convert color string to hex
 * @param {string} str - string with color
 * @returns {number} - color hex
 */
const colorStr2Hex = str => isNaN(str) ? parseInt(tinycolor(str).toHex(), 16) : str;

/**
 * The class to create materials with predefined default parameters
 */
export class MaterialFactory {
    static createLine2Material(params = {}){
        let p       = defaultParams::clone()::merge(params);
        p.color     = colorStr2Hex(p.color);
        p.lineWidth = p.lineWidth || 0.003;
        return GeometryFactory.instance().createLineMaterial(p);
    }

    static createLineBasicMaterial(params = {}) {
        let p       = defaultParams::clone()::merge(params);
        p.color     = colorStr2Hex(p.color);
        return GeometryFactory.instance().createLineBasicMaterial(p);
    }

    static createLineDashedMaterial(params = {}) {
        let p = defaultParams::clone()::merge(params);
        p.color = colorStr2Hex(p.color);
        p.scale    = p.scale    || 1;
        p.gapSize  = p.gapSize  || 2;
        p.dashSize = p.dashSize || 3;
        return GeometryFactory.instance().createLineDashedMaterial(p);
    }

    static createMeshBasicMaterial(params = {}){
        let p   = defaultParams::clone()::merge(params);
        p.color = colorStr2Hex(p.color);
        return GeometryFactory.instance().createMeshBasicMaterial(p);
    }

    static createMeshLambertMaterial(params = {}){
        let p   = defaultParams::clone()::merge(params);
        p.color = colorStr2Hex(p.color);
        return GeometryFactory.instance().createMeshLambertMaterial(p);
    }
}

