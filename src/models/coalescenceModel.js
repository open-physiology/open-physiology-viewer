import { Model } from './model';
import { assign } from 'lodash-bound';

export class CoalescenceModel extends Model {
    nodes: [];

    static fromJSON(json, modelClasses = {}) {
        json.class = json.class || "Coalescence";
        const result = super.fromJSON(json, modelClasses);
        result::assign(json); //TODO pick only valid properties
        return result;
    }
}
