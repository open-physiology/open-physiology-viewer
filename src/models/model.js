import {isUndefined, pick, parseInt, assign} from 'lodash-bound';
import {uniqueId as _uniqueId} from 'lodash';

export class Model {
    id;
    name;
    color;
    parent;
    external;
    viewObjects;
    material;

    constructor({id, modelsById} = {}) {
        if (id::isUndefined()) {
            let newId;
            do {
                newId = _uniqueId()::parseInt();
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
        res::assign(this::pick('id', 'name', 'color', 'parent', 'external', 'viewObjects', 'material'));
        return res;
    }

    static fromJSON(json, {modelClasses, modelsById} = {}) {
        const cls = modelClasses[json.class];
        const result       = new cls({modelsById});
        result.id          = json.id;
        result.name        = json.name  || "?";
        result.color       = json.color || "#888";
        result.parent      = json.parent;
        result.external    = json.external;
        result.material    = json.material;
        result.viewObjects = json.viewObjects || {};

        return result;
    }

}