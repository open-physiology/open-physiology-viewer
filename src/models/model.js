import {pick, assign} from 'lodash-bound';
import {relationships} from '../data/manifest.json';
import { SpriteText2D } from 'three-text2d';
import { copyCoords } from '../three/utils';

/**
 * Intercepts setters for given properties to update bidirectional relationships
 * @param obj
 * @param propKeys
 * @returns {*}
 */
export function tracePropAccess(obj, propKeys) {
    const propKeySet = new Set(propKeys);
    return new Proxy(obj, {
        set(target, propKey, value, receiver) {
            if (propKeySet.has(propKey)) {
                if (obj.syncRelationship){ obj.syncRelationship(propKey, value, target[propKey]) }
            }
            return Reflect.set(target, propKey, value, receiver);
        },
    });
}

export class Model {
    id;
    name;
    class;
    color;
    external;    //Reference to an external resource, currently is used to backtrack models vs original documents/mock-ups

    //Visualization model
    viewObjects; //WebGL/Three.js objects
    material;    //Material for the model visualizations
    infoFields;      //Info infoFields

    constructor(id) {
        this.id = id;
        this.viewObjects = {};

        //TODO - perhaps create a class to manage infoFields definition (lazy version of manifest?)
        this.infoFields = {
            text   : ['id', 'class', 'name', 'external'],
            objects: [],
            lists  : []
        }
    }

    toJSON() {
        return this::pick('id', 'name', 'class', 'color','external');
    }

    static fromJSON(json, modelClasses = {}) {
        //TODO add validation

        const cls = modelClasses[json.class];
        const res = new cls(json.id);
        res::assign(json::pick('id', 'name', 'class', 'color', 'external'));
        res.viewObjects = res.viewObjects || {};
        return res;
    }

    //TODO write a test
    syncRelationship(key, value, oldValue){
        let r = relationships.find(r =>
            r.types[0] === this.class &&
            r.keys[0]=== key);

        if (!r) { return; }

        if (r.modality[1].indexOf("*") > -1 ){
            //one to many relationship
            if (value && (r.types[1] === value.class)){
                if (!value[r.keys[1]]){ value[r.keys[1]] = []; }
                if (!value[r.keys[1]].find(entity2 => entity2.id === this.id)){ value[r.keys[1]].push(this); }
            }
            if (oldValue && r.types[1] === oldValue.class){
                const index = oldValue[r.keys[1]].indexOf(entity2 => entity2.id === this.id);
                oldValue[r.keys[1]].splice(index, 1);
            }
        }
    }

    createLabels(labelKey, fontParams){
        if (this.skipLabel) { return; }
        this.labels = this.labels || {};

        if (!this.labels[labelKey] && this[labelKey]) {
            this.labels[labelKey] = new SpriteText2D(this[labelKey], fontParams);
        }

        if (this.labels[labelKey]){
            this.viewObjects["label"] = this.labels[labelKey];
        } else {
            delete this.viewObjects["label"];
        }
    }

    updateLabels(labelKey, visibility, position){
        if (this.skipLabel) { return; }
        if (this.labels[labelKey]){
            this.viewObjects['label'] = this.labels[labelKey];
            this.viewObjects["label"].visible = visibility;
            copyCoords(this.viewObjects["label"].position, position);
        } else {
            delete this.viewObjects['label'];
        }
    }

}