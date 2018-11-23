import * as three from 'three';
const THREE = window.THREE || three;
import {Shape} from './shapeModel';
import { clone } from 'lodash-bound';
import {createMeshWithBorder, getCenterOfMass} from '../three/utils';

/**
 * Class that creates visualization objects of regions
 */
export class Region extends Shape {

    static fromJSON(json, modelClasses = {}, entitiesByID) {
        let res = super.fromJSON(json, modelClasses, entitiesByID);
        res.points.push(res.points[0]::clone()); //make closed shape
        res.points = res.points.map(p => new THREE.Vector3(p.x, p.y, 0));
        return res;
    }

    translate(p0) {
        if (!p0 || !this.viewObjects["main"]) { return p0; }
        return p0.clone();
    }

    /**
     * Create view model for the class instance
     * @param state - layout settings
     */
    createViewObjects(state) {
        if (!this.viewObjects["main"]) {
            let shape = new THREE.Shape(this.points.map(p => new THREE.Vector2(p.x, p.y))); //Expects Vector2
            this.center = getCenterOfMass(this.points);

            let obj = createMeshWithBorder(shape, {
                color: this.color,
                polygonOffsetFactor: this.polygonOffsetFactor
            });
            obj.userData = this;
            this.viewObjects['main'] = obj;

            this.border.createViewObjects(state);
        }

        this.createLabels(state.labels[this.constructor.name], state.fontParams);
    }

    /**
     * Update positions of regions in the force-directed graph (and their inner content)
     * @param state - view settings
     */
    updateViewObjects(state) {
        // const linkObj = this.viewObjects["main"];
        // if (!linkObj) { return; }
        // // Update buffer geometry
        // let linkPos = linkObj.geometry.attributes && linkObj.geometry.attributes.position;
        // if (linkPos) {
        //     for (let i = 0; i < this.points.length; i++) {
        //         linkPos.array[3 * i] = this.points[i].x;
        //         linkPos.array[3 * i + 1] = this.points[i].y;
        //         linkPos.array[3 * i + 2] = 0;
        //     }
        //     linkPos.needsUpdate = true;
        //     linkObj.geometry.computeBoundingSphere();
        // }

        this.border.updateViewObjects(state);

        this.updateLabels(state.labels[this.constructor.name], state.showLabels[this.constructor.name], this.center.clone().addScalar(5));
    }
}
