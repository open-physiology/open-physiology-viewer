import { Model } from './model';
import { assign } from 'lodash-bound';

const avgDimension = (obj, property) => {
    if (obj && obj[property]){
        if (obj[property].min){
            if (obj[property].max){
                return (obj[property].min + obj[property].max) / 2
            } else {
                return obj[property].min;
            }
        } else {
            return obj[property].max || 1;
        }
    }
    return 1;
};

export class LyphModel extends Model {
    axis;
    layers;
    topology;

    toJSON() {
        let res = super.toJSON();
        res.layers   = this.layers && this.layers.forEach(layer => layer.id);
        res.axis     = this.axis && this.axis.id;
        res.topology = this.topology;
        return res;
    }

    static fromJSON(json, modelClasses = {}) {
        json.class = json.class || "Lyph";
        const result = super.fromJSON(json, modelClasses);
        result::assign(json); //TODO pick only valid properties
        return result;
    }

    get borders(){
        switch (this.topology) {
            case "BAG" : return [true, true];
            case "CYST": return [true, false];
        }
        return [false, false];
    }
}

