import * as three from 'three';
const THREE = window.THREE || three;
import { SpriteText2D } from 'three-text2d';
import { Model } from './model';
import { assign } from 'lodash-bound';
import { d3Layer, d2LayerShape, d2LyphShape, d2LyphBorders, align} from '../three/utils';

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

    get borderTypes(){
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
            //const lyphObj = new THREE.Object3D();
            let numLayers = (this.layers || [this]).length;
            let lyphThickness = numLayers * thickness;
            let lyphShape = d2LyphShape([lyphThickness, length + 2 * numLayers, lyphThickness / 2, ...this.borderTypes]);
            let lyphGeometry = new THREE.ShapeBufferGeometry(lyphShape);
            if (!this.material) {
                this.material = state.materialRepo.createMeshBasicMaterial({color: this.color});
                this.material.visible = false; //Do not show overlaying lyph shape
            }
            let lyphObj = new THREE.Mesh( lyphGeometry, this.material);
            lyphObj.__data = this;
            this.lyphObjects[state.method] = lyphObj;

            //this.borderObject = lyphShape;
            //TODO place borderObjects to border.visibleObjects;
            this.borderObjects  = d2LyphBorders([lyphThickness, length + 2 * numLayers, lyphThickness / 2, ...this.borderTypes]);

            //Layers
            (this.layers || []).forEach((layer, i) => {
                if (!layer.material) {
                    layer.material = state.materialRepo.createMeshBasicMaterial({color: layer.color});
                }
                let layerObj;
                if (state.method === "3d"){
                    layerObj = d3Layer(
                        [ thickness * i + 1,       length,         thickness / 2, ...layer.borderTypes],
                        [ thickness * (i + 1) + 1, length + i * 2, thickness / 2, ...layer.borderTypes],
                        layer.material);
                } else {
                    //we do not call d2Lyph directly as we need to keep the border shape as well
                    let layerShape = d2LayerShape(
                        [ thickness * i, length,         thickness / 2, ...layer.borderTypes],
                        [ thickness,     length + i * 2, thickness / 2, ...layer.borderTypes]);
                    let layerGeometry = new THREE.ShapeBufferGeometry(layerShape);
                    layerObj = new THREE.Mesh( layerGeometry, layer.material);
                    layerObj.translateX(thickness * i);

                    layer.borderObject = layerShape;
                    //TODO save also border array?

                    //Draw inside content
                    if (layer.content){
                        //TODO assign lyph axis to be the layer's border
                        //TODO Create axis for the layer content lyph
                   }
                    layer.lyphsObjects = layer.lyphsObjects || {};
                    layer.lyphsObjects[state.method] = layerObj;
                }
                lyphObj.add(layerObj);
            });

        }
        this.viewObjects['main']  = this.lyphObjects[state.method];

        //Labels
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
        }

        this.viewObjects['main']  = this.lyphObjects[state.method];

        this.material.visible = !state.showLayers;
        (this.viewObjects['main'].children || []).forEach(child =>
            {child.visible = state.showLayers;});

        if (this.labelObjects[state.iconLabel]){
            this.viewObjects['label'] = this.labelObjects[state.iconLabel];
        } else {
            delete this.viewObjects['label'];
        }

    }
}

