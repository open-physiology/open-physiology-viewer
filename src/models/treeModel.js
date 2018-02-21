import { Model } from './model';
import { assign } from 'lodash-bound';

export class TreeModel extends Model {
    root;

    static fromJSON(json, modelClasses = {}) {
        json.class = json.class || "Tree";
        const result = super.fromJSON(json, modelClasses);
        result::assign(json); //TODO pick only valid properties
        return result;
    }

    get levels(){

    }

    get leaves(){

    }

}
