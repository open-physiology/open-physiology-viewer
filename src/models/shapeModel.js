import {Entity} from './entityModel';

/**
 * Class that creates visualization objects of regions
 */
export class Shape extends Entity {

    static fromJSON(json, modelClasses = {}, entitiesByID) {
        json.border      = json.border || {};
        json.border.id   = json.border.id || json.id + "_border";
        let res = super.fromJSON(json, modelClasses, entitiesByID);
        res.border.host = res;
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
