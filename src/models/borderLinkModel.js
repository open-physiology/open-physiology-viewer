import { Model } from './model';
import { assign } from 'lodash-bound';

export const BORDER_LINK_TYPES = {
    RADIAL      : "radial",
    LONGITUDINAL: "longitudinal"
};

/**
 * Border link
 */
export class BorderLinkModel extends Model {
    type;
    parentBorder;

    //define border shape to use as rotational axis
    source;
    target;
    length;

    toJSON() {
        let res = super.toJSON();
        res.type   = this.type;
        res.parentBorder   = this.parentBorder && this.parentBorder.id;
        return res;
    }

    static fromJSON(json, modelClasses = {}) {
        json.class = json.class || "BorderLink";
        const result = super.fromJSON(json, modelClasses);
        result::assign(json); //TODO pick only valid properties
        return result;
    }

    createViewObjects(state){

    }

    updateViewObjects(state){

    }
}