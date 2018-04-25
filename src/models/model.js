import {pick, assign} from 'lodash-bound';
import {relationships} from '../data/manifest.json';

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
        const res       = new cls(json.id);
        res::assign(json::pick('id', 'name', 'class', 'color', 'external'));
        res.viewObjects = res.viewObjects || {};
        return res;
    }

    //TODO write a test
    syncRelationship(key, entity, oldEntity){
        let r = relationships.find(r =>
            r.types[0] === this.class &&
            r.keys[0]=== key);
        if (!r) { return; }
        if (r.modality[1].indexOf("*") > -1 ){
            //one to many relationship
            if (entity && (r.types[1] === entity.class)){
                if (!entity[r.keys[1]]){ entity[r.keys[1]] = []; }
                if (!entity[r.keys[1]].find(entity2 => entity2.id === this.id)){ entity[r.keys[1]].push(this); }
            }
            if (oldEntity && r.types[1] === oldEntity.class){
                const index = oldEntity[r.keys[1]].indexOf(entity2 => entity2.id === this.id);
                oldEntity[r.keys[1]].splice(index, 1);
            }
        }
    }

}