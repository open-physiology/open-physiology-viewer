import { Model } from './model';
import { assign } from 'lodash-bound';

export class GraphModel extends Model {
    nodes: [];
    links: [];
    //coalescences: [];

    static fromJSON(json, modelClasses = {}) {
        json.class = json.class || "Graph";
        const result = super.fromJSON(json, modelClasses);
        result::assign(json); //TODO pick only valid properties
        return result;
    }
}
