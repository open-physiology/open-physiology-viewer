import {Shape} from './shapeModel';
import { clone } from 'lodash-bound';
import {createMeshWithBorder, getCenterOfMass, THREE} from '../three/utils';

/**
 * Class that creates visualization objects of regions
 * @class
 */
export class Region extends Shape {

    /**
     * Create a Region resource from its JSON specification.
     * The method checks and sets default values to the region corner points if they are undefined.
     * @param   {Object} json                          - resource definition
     * @param   {Object} [modelClasses]                - map of class names vs implementation of ApiNATOMY resources
     * @param   {Map<string, Resource>} [entitiesByID] - map of resources in the global model
     * @returns {Shape} - ApiNATOMY Shape resource
     */
    static fromJSON(json, modelClasses = {}, entitiesByID = null) {
        if (!json.points || json.points.length < 3) {
            json.points = [{"x": -10, "y": -10 },{"x": -10, "y": 10 },{"x": 10, "y": 10 },{"x": 10, "y": -10 }];
        }
        json.numBorders = json.points.length;
        let res = super.fromJSON(json, modelClasses, entitiesByID);
        res.points.push(res.points[0]::clone()); //make closed shape
        res.points = res.points.map(p => new THREE.Vector3(p.x, p.y, 0));
        return res;
    }

    get polygonOffsetFactor() {
        return 1; //always behind
    }

    translate(p0) {
        if (!p0 || !this.viewObjects["main"]) { return p0; }
        return p0.clone();
    }

    /**
     * Create view model for the class instance
     * @param {Object} state - graph configuration
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
        this.createLabels(state);
    }

    /**
     * Update positions of regions in the force-directed graph (and their inner content)
     * @param {Object} state - graph configuration
     */
    updateViewObjects(state) {
        this.border.updateViewObjects(state);
        this.updateLabels(state, this.center.clone().addScalar(5));
    }
}
