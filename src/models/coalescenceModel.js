import { Model } from './model';
import { assign } from 'lodash-bound';

export class CoalescenceModel extends Model {
    nodes: [];

    static fromJSON(json, {modelClasses, modelsById} = {}) {
        json.class = json.class || "Coalescence";
        const result = super.fromJSON(json, {modelClasses, modelsById});
        result::assign(json); //TODO use pick to choose only valid properties
        return result;
    }
}
