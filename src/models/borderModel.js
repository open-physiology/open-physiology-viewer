import { Model } from './model';
import { BorderLinkModel, BORDER_LINK_TYPES } from './borderLinkModel';
import { assign } from 'lodash-bound';

/**
 * Complete lyph border
 */
export class BorderModel extends Model {
    borderLinks;
    type;
    parentLyph; //owner of the border

    toJSON() {
        let res = super.toJSON();
        res.borderLinks = (this.borderLinks || []).map(borderLink => borderLink.toJSON());
        res.parentLyph = this.parentLyph && this.parentLyph.id;
        res.type   = this.type;
        return res;
    }

    static fromJSON(json, modelClasses = {}) {
        json.class = json.class || "Border";
        const result = super.fromJSON(json, modelClasses);
        result::assign(json); //TODO pick only valid properties
        if (!result.borderLinks){
            this.borderLinks = [];
            const borderTypes = [false, ...this.radialBorderLinkTypes(result.topology), false];
            for (let i = 0; i < 4; i++){
                this.borderLinks.push(BorderLinkModel.fromJSON({
                    id: result.id + "_" + i,
                    parentBorder: result.id,
                    type: borderTypes[i]
                }, modelClasses));
            }
        }
        return result;
    }

    static radialBorderLinkTypes(topology){
        switch (topology) {
            case "BAG"  : return [true,  false];
            case "BAG2" : return [false, true];
            case "CYST" : return [true,  true];
        }
        return [false, false];
    }

    createViewObjects(state){
        (this.borderLinks || []).forEach(border =>
            border.createViewObjects(state)
        )
    }

    updateViewObjects(state){
        (this.borderLinks || []).forEach(border =>
            border.updateViewObjects(state)
        )
    }

}