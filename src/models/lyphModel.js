import { Model } from './model';
import { assign } from 'lodash-bound';

export class LyphModel extends Model {
    axis;
    layers;

    toJSON() {
        let res = super.toJSON();
        res.layers = this.layers && this.layers.forEach(layer => layer.id);
        res.axis   = this.axis && this.axis.id;
        return res;
    }

    static fromJSON(json, {modelClasses, modelsById} = {}) {
        const result = super.fromJSON(json, {modelClasses, modelsById});
        result::assign(json); //TODO use pick to choose only valid properties
        return result;
    }
}

