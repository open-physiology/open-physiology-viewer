import { merge, isObject, entries, pick, assign, cloneDeep } from 'lodash-bound';
import { types, relationships} from '../data/manifest.json';
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

const initValue = (specObj) => specObj.default
    ? (specObj::isObject()
        ? specObj.default::cloneDeep()
        : specObj.default)
    : (specObj.type
        ? specObj.type.startsWith("String")
            ? ""
            : specObj.type.startsWith("Boolean")
                ? false
                : specObj.type.startsWith("Number")
                    ? 0
                    :null
        :null);


export class Entity {
    constructor(id) {
        this::assign(...types.Entity.properties::entries().map(([key, value]) => ({[key]: initValue(value)})));
        this.id = id;
        const className = this.constructor.name;
        if (types[className]){
            this::merge(...types[className].properties::entries().map(([key, value]) => ({[key]: initValue(value)})));
        }
    }

    static fromJSON(json, modelClasses = {}) {
        json.class = json.class || this.name;
        const cls = this || modelClasses[json.class];

        if (!cls){
            throw "Cannot creat an object of an unknown class!";
        }

        const res = new cls(json.id);

        //TODO add validation: pick properties from manifest & filter others with warning
        res::assign(json);

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