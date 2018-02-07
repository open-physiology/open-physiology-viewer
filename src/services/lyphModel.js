import * as three from 'three';
const THREE = window.THREE || three;
import {lyphs}   from '../data/data';
import { MaterialFactory } from '../three/materialFactory';
import { d3Lyph, d2Lyph} from '../three/utils';
import { Model } from './model';
import { assign } from 'lodash-bound';

export class LyphModel extends Model {
    axis;
    layers;

    toJSON() {
        let res = super.toJSON();
        res.layers = this.layers && this.layers.forEach(layer => layer.id);
        res.axis   = this.axis && this.axis.id;
        return res;
    }

    static fromJSON(json, {modelClasses, modelsById} = {}) {
        const result = super.fromJSON(json, {modelClasses, modelsById});
        result::assign(json); //TODO use pick to choose only valid properties
        return result;
    }
}

const materialRepo = new MaterialFactory({opacity: 0.6});
const modelClasses = { "Lyph": LyphModel};
const modelsById = {};
Object.keys(lyphs).forEach(id => {
    lyphs[id].class = "Lyph";
    modelsById[id] = LyphModel.fromJSON(lyphs[id], {modelClasses, modelsById: modelsById});
});

/**
 *
 * @param link
 * @returns {length: number, thickness: number}
 */
function lyphDimensions(link){
    const scaleFactor = link.length? Math.log(link.length): 1;
    const length      =  6 * scaleFactor;
    const thickness   =  2 * scaleFactor;
    return {length, thickness};
}

/**
 *
 * @param link
 * @param params
 * @returns {THREE.SEA3D.Object3D|Object3D|SEA3D.Object3D|*}
 */
function linkExtension(link, params = {}){
    params.method = params.method || "2d";
    //Add lyphs and edge text
    if (link.lyph){
        const lyphModel = modelsById[link.lyph];
        if (!lyphModel) {return; }
        if (lyphModel.viewObjects[params.method ]){
            return lyphModel.viewObjects[params.method];
        }
        const lyphObj = new THREE.Object3D();
        const {length, thickness} = lyphDimensions(link);
        lyphModel.layers.forEach((id, i) => {
            let layerModel = modelsById[id];
            if (!layerModel.material) {
                layerModel.material = materialRepo.getMeshBasicMaterial(layerModel.color, {side: THREE.DoubleSide});
            }
            let layerObj;
            if (params.method === "3d"){
                layerObj = d3Lyph(
                    [ thickness * i + 1,       length,         thickness / 2, true, false],
                    [ thickness * (i + 1) + 1, length + i * 2, thickness / 2, true, false],
                    layerModel.material);
            } else {
                layerObj = d2Lyph(
                    [thickness * i, length,         thickness / 2, true, false],
                    [thickness,     length + i * 2, thickness / 2, true, false],
                    layerModel.material
                );
                layerObj.translateX(thickness * i);
            }
            layerModel.viewObjects[params.method] = layerObj;
            lyphObj.add(layerObj);
        });
        lyphModel.viewObjects[params.method] = lyphObj;
        return lyphObj;
    }
}

export {linkExtension}