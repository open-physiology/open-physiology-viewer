import { Model } from './model';
import { assign } from 'lodash-bound';

export const LINK_TYPES = {
    PATH: "path",
    LINK: "link",
    AXIS: 'axis',
    COALESCENCE: "coalescence",
    CONTAINER: "container"
};

export class LinkModel extends Model {
    source;
    target;
    length;
    lyph;   //Rename to conveyingLyph
    type;

    toJSON() {
        let res = super.toJSON();
        res.source = this.source && this.source.id;
        res.target = this.target && this.target.id;
        res.length = this.length;
        res.lyph   = this.lyph && this.lyph.id;
        res.type   = this.type;
        return res;
    }

    static fromJSON(json, {modelClasses, modelsById} = {}) {
        json.class = json.class || "Link";
        const result = super.fromJSON(json, {modelClasses, modelsById});
        result::assign(json); //TODO use pick to choose only valid properties
        return result;
    }

    /**
     *
     * @param tree
     * @returns {number} link's level in the tree
     */
    level(tree){
        return -1; //TODO implement
    }
}
