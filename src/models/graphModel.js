import { Model } from './model';
import { assign } from 'lodash-bound';

export class GraphModel extends Model {
    nodes: [];
    links: [];
    coalescences: [];

    static fromJSON(json, {modelClasses, modelsById} = {}) {
        json.class = json.class || "Graph";
        const result = super.fromJSON(json, {modelClasses, modelsById});
        result::assign(json); //TODO use pick to choose only valid properties
        return result;
    }
}
