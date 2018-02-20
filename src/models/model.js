import {isUndefined, pick, assign} from 'lodash-bound';
import {uniqueId as _uniqueId} from 'lodash';

export class Model {
    id;
    name;
    parent;      //Parent in some hierarchy, currently usage is not restricted
    host;        //An entity physically containing the given entity
    external;    //Reference to an external resource, currently is used to backtrack models vs original documents/mock-ups
    color;
    viewObjects; //Visualization of the model, e.g., WebGL/Three.js objects
    material;    //Material for the model visualizations

    constructor({id, modelsById} = {}) {
        if (id::isUndefined()) {
            let newId;
            do {
                newId = _uniqueId();
            } while (modelsById[newId]);
            this.id = newId;
        } else {
            this.id = id;
        }

        this.class = this.constructor.name;
        this.viewObjects = {};
    }

    toJSON() {
        const res = {
            'class': this.constructor.name
        };
        res::assign(this::pick('id', 'name', 'color', 'parent', 'host', 'external', 'viewObjects', 'material'));
        return res;
    }

    static fromJSON(json, {modelClasses, modelsById} = {}) {
        const cls = modelClasses[json.class];
        const result       = new cls({modelClasses, modelsById});
        result.id          = json.id;
        result.name        = json.name  || "?";
        result.color       = json.color || "#888";
        result.parent      = json.parent;
        result.host        = json.host;
        result.external    = json.external;
        result.material    = json.material;
        result.viewObjects = json.viewObjects || {};

        return result;
    }

}