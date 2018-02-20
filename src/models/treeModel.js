import { Model } from './model';
import { assign } from 'lodash-bound';

export class TreeModel extends Model {
    root;

    static fromJSON(json, {modelClasses, modelsById} = {}) {
        json.class = json.class || "Tree";
        const result = super.fromJSON(json, {modelClasses, modelsById});
        result::assign(json); //TODO use pick to choose only valid properties
        return result;
    }

    get levels(){

    }

    get leaves(){

    }

}
