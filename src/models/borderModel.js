import { Model } from './model';
//import { LinkModel, LINK_TYPES } from './linkModel';
import { assign } from 'lodash-bound';
import { copyCoords } from '../three/utils';

function d2LyphBorders([thickness,  height,  radius,  top,  bottom]){
    let borders = [0,1,2,3].map(x => new THREE.Shape());

    //Axial border
    borders[0].moveTo( 0, - height / 2);
    borders[0].lineTo( 0,   height / 2);
    borders[1].moveTo( 0,   height / 2);
    //Top radial border
    if (top){
        borders[1].lineTo( thickness - radius, height / 2);
        borders[1].quadraticCurveTo( thickness,  height / 2, thickness,  height / 2 - radius);
        borders[2].moveTo( thickness,  height / 2 - radius);
    } else {
        borders[1].lineTo( thickness,  height / 2);
        borders[2].moveTo( thickness,  height / 2);
    }
    //Non-axial border
    if (bottom){
        borders[2].lineTo( thickness, - height / 2 + radius);
        borders[2].quadraticCurveTo( thickness, -height / 2, thickness - radius, -height / 2);
        borders[3].moveTo( thickness - radius, -height / 2);
    } else {
        borders[2].lineTo( thickness, -height / 2);
        borders[3].moveTo( thickness, -height / 2);
    }

    //Finish Bottom radial border
    borders[3].lineTo( 0, - height / 2);
    return borders;
}

/**
 * Complete lyph border
 */
export class BorderModel extends Model {
    borders;
    borderTypes;   //Array of border types
    borderInLyph;  //Owner of the border

    //TODO BorderModel should provide versions of borders with or without curves for closed borders

    toJSON() {
        let res = super.toJSON();
        res.borderInLyph = this.borderInLyph && this.borderInLyph.id;
        res.borderTypes  = this.borderTypes;
        return res;
    }

    static fromJSON(json, modelClasses = {}) {
        json.class = json.class || "Border";
        const result = super.fromJSON(json, modelClasses);
        result::assign(json); //TODO pick only valid properties
        return result;
    }

    get radialTypes(){
        return [this.borderTypes[1], this.borderTypes[2]];
    }

    createViewObjects(state){
         if (this.borderInLyph){
             //TODO refactor to create border links using LinkModel
             this.viewObjects["shape"] = d2LyphBorders(
                 [this.borderInLyph.width, this.borderInLyph.height, this.borderInLyph.width / 2, ...this.radialTypes]);

             //Make sure we always have 4 border objects regardless of data input
             this.borders = this.borders || [];
             for (let i = this.borders.length; i < 4; i++){ this.borders.push({}); }

             //Store border shapes
             this.viewObjects["shape"].forEach((obj, i) => {
                 this.borders[i].viewObjects = this.borders[i].viewObjects || {};
                 this.borders[i].viewObjects["shape"] = obj; //We will use "main" to store actual border lines
             });

             //Replace node ids on border with actual nodes
             (this.borders || []).forEach(border => {
                 if (border.nodes){
                     border.nodes = border.nodes.map(id => state.graphData.nodes.find(node => node.id === id))
                         .filter(node => !!node);
                 }
             });
         }
    }

    updateViewObjects(state){
        (this.borders || []).forEach((border, i) => {
            //TODO after switching to LinkModel, just call updateViewObjects

            //position nodes on lyph border
            if (border.nodes){
                let points = border.viewObjects["shape"].getSpacedPoints(border.nodes.length + 1)
                    .map(p => new THREE.Vector3(p.x, p.y, 0));
                points.forEach(p => {
                    let currentLyph = this.borderInLyph;
                    let transformChain = [];
                    let centerChain    = [];
                    //Shape depends on the quaternion and position of the container lyph/layers,
                    //hence apply all transformations recursively
                    while (currentLyph){
                        transformChain.push(currentLyph.viewObjects["main"].quaternion);
                        centerChain.push(currentLyph.center);
                        currentLyph = currentLyph.container;
                    }
                    transformChain.forEach(q => p.applyQuaternion(q));
                    centerChain.forEach(q => p.add(q));
                });
                border.nodes.forEach((node, i) => { copyCoords(node, points[i + 1]); });
            }
        });
    }
}