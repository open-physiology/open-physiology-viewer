import * as three from 'three';
const THREE = window.THREE || three;
import { SpriteText2D } from 'three-text2d';
import { Model } from './model';
import { assign } from 'lodash-bound';
import { d3Lyph, d2Lyph, align} from '../three/utils';

const avgDimension = (obj, property) => {
    if (obj && obj[property]){
        if (obj[property].min){
            if (obj[property].max){
                return (obj[property].min + obj[property].max) / 2
            } else {
                return obj[property].min;
            }
        } else {
            return obj[property].max || 1;
        }
    }
    return 1;
};

export class LyphModel extends Model {
    axis;
    layers;
    topology;

    toJSON() {
        let res = super.toJSON();
        res.layers   = this.layers && this.layers.forEach(layer => layer.id);
        res.axis     = this.axis && this.axis.id;
        res.topology = this.topology;
        return res;
    }

    static fromJSON(json, modelClasses = {}) {
        json.class = json.class || "Lyph";
        const result = super.fromJSON(json, modelClasses);
        result::assign(json); //TODO pick only valid properties
        return result;
    }

    get borders(){
        switch (this.topology) {
            case "BAG" : return [true, false];
            case "CYST": return [true, true];
        }
        return [false, false];
    }

    align(method){
        return align(this.axis, this.viewObjects[method]);
    }

    createViewObjects(state){
        this.axis = state.axis;
        let {thickness, length} = this.axis.lyphSize;

        this.lyphObjects = this.lyphObjects || {};

        if (!this.lyphObjects[state.method]){
             const lyphObj = new THREE.Object3D();

            (this.layers || [this]).forEach((layer, i) => {
                if (!layer.material) {
                    layer.material = state.materialRepo.getMeshBasicMaterial(layer.color, {side: THREE.DoubleSide});
                }
                let layerObj;
                if (state.method === "3d"){
                    layerObj = d3Lyph(
                        [ thickness * i + 1,       length,         thickness / 2, ...layer.borders],
                        [ thickness * (i + 1) + 1, length + i * 2, thickness / 2, ...layer.borders],
                        layer.material);
                } else {
                    layerObj = d2Lyph(
                        [thickness * i, length,         thickness / 2, ...layer.borders],
                        [thickness,     length + i * 2, thickness / 2, ...layer.borders],
                        layer.material
                    );
                    layerObj.translateX(thickness * i);

                    if (layer.content){
                        //Draw inside content
                        //TODO assign lyph axis to be the layer's border

                    }
                }
                lyphObj.add(layerObj);
            });
            this.lyphObjects[state.method] = lyphObj;
            this.viewObjects['main']  = this.lyphObjects[state.method];
        }

        this.labelObjects = this.labelObjects || {};

        if (!this.labelObjects[state.iconLabel] && this[state.iconLabel]){
            this.labelObjects[state.iconLabel] = new SpriteText2D(this[state.iconLabel], state.fontParams);
        }

        if (this.labelObjects[state.iconLabel]) {
            this.viewObjects['label'] = this.labelObjects[state.iconLabel];
        } else {
            delete this.viewObjects['label'];
        }

    }

    updateViewObjects(state){
        if (!this.lyphObjects[state.method] ||
            !(this.labelObjects[state.iconLabel] && this[state.iconLabel])){
            this.createViewObjects(state);
        } else {
            this.viewObjects['main']  = this.lyphObjects[state.method];
            if (this.labelObjects[state.iconLabel]){
                this.viewObjects['label'] = this.labelObjects[state.iconLabel];
            } else {
                delete this.viewObjects['label'];
            }
        }
    }
}

