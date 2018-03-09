import {isUndefined, pick, assign} from 'lodash-bound';
import { SpriteText2D } from 'three-text2d';

export class Model {
    id;
    name;
    class;
    color;
    external;    //Reference to an external resource, currently is used to backtrack models vs original documents/mock-ups

    viewObjects; //Visualization of the model, e.g., WebGL/Three.js objects
    material;    //Material for the model visualizations

    constructor(id) {
        this.id = id;
        this.viewObjects = {};

        //TODO - perhaps create a class to manage fields definition (lazy version of manifest?)
        this.fields = {
            text   : ['id', 'class', 'name', 'external'],
            objects: [],
            lists  : []
        }
    }

    toJSON() {
        return this::pick('id', 'name', 'class', 'color','external');
    }

    static fromJSON(json, modelClasses = {}) {
        const cls = modelClasses[json.class];
        const res       = new cls(json.id);
        res::assign(json::pick('id', 'name', 'class', 'color', 'external'));
        res.viewObjects = res.viewObjects || {};
        return res;
    }
}