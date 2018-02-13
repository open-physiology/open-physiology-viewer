import * as three from 'three';
const THREE = window.THREE || three;
import { d3Lyph, d2Lyph} from './utils';
import {MaterialFactory}  from './materialFactory';

const materialRepo = new MaterialFactory({opacity: 0.6});

/**
 * @param link
 * @returns {length: number, thickness: number}
 */
function lyphDimensions(link){
    const scaleFactor = link.length? Math.log(link.length): 1;
    const length      =  6 * scaleFactor;
    const thickness   =  2 * scaleFactor;
    return {length, thickness};
}

function borders(lyphType){
    console.log(lyphType);
    switch (lyphType) {
        case "BAG" : return [true, true];
        case "CYST": return [true, false];
    }
    return [false, false];
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
    if (link.lyphModel){
        if (link.lyphModel.viewObjects[params.method ]){
            return link.lyphModel.viewObjects[params.method];
        }
        const lyphObj = new THREE.Object3D();
        const {length, thickness} = lyphDimensions(link);
        if (!link.lyphModel.layerModels){ return;}
        link.lyphModel.layerModels.forEach((layerModel, i) => {
            if (!layerModel.material) {
                layerModel.material = materialRepo.getMeshBasicMaterial(layerModel.color, {side: THREE.DoubleSide});
            }
            let layerObj;
            if (params.method === "3d"){
                layerObj = d3Lyph(
                    [ thickness * i + 1,       length,         thickness / 2, ...borders(layerModel.topology)],
                    [ thickness * (i + 1) + 1, length + i * 2, thickness / 2, ...borders(layerModel.topology)],
                    layerModel.material);
            } else {
                layerObj = d2Lyph(
                    [thickness * i, length,         thickness / 2, ...borders(layerModel.topology)],
                    [thickness,     length + i * 2, thickness / 2, ...borders(layerModel.topology)],
                    layerModel.material
                );
                layerObj.translateX(thickness * i);
            }
            layerModel.viewObjects[params.method] = layerObj;
            lyphObj.add(layerObj);
        });
        link.lyphModel.viewObjects[params.method] = lyphObj;
        return lyphObj;
    }
}

export {linkExtension}