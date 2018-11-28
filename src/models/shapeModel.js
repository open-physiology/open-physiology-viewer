import {VisualResource} from './visualResourceModel';
import {keys, merge} from 'lodash-bound';
import {Link} from "./linkModel";
/**
 * Class that creates visualization objects of regions
 */
export class Shape extends VisualResource {

    static fromJSON(json, modelClasses = {}, entitiesByID = null) {
        json.id     = json.id || ("new_" + entitiesByID::keys().length());
        json.border = json.border || {};
        json.border.id = json.border.id || (json.id + "_border");
        json.border.borders = json.border.borders || {};
        for (let i = 0; i < json.numBorders ; i++){
            json.border.borders[i]::merge({"id": json.border.id + "_" + i});
        }
        delete json.numBorders;
        let res = super.fromJSON(json, modelClasses, entitiesByID);
        res.host = res;
        return res;
    }

    toggleBorder(){
        if (!this.viewObjects || !this.viewObjects['main']) { return; }
        if (this.viewObjects['border']){
            if (this.viewObjects['main'].children.find(this.viewObjects['border'])){
                this.viewObjects['main'].children.remove(this.viewObjects['border']);
            } else {
                this.viewObjects['main'].add(this.viewObjects['border']);
            }
        }
    }
}
