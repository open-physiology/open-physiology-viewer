import {Resource} from "./resourceModel";
import {$SchemaClass} from "./utils";
import {Validator} from "jsonschema";
import schema from "./graphScheme.json";
import {$LogMsg, logger} from "./logger";


/**
 * @property logger
 */
export class State extends Resource {
    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
        const V = new Validator();
        delete schema.oneOf;
        schema.$ref = "#/definitions/Snapshot";
        let resVal = V.validate(json, schema);

        json.class = json.class || $SchemaClass.State;
        let res = super.fromJSON(json, modelClasses, entitiesByID, namespace);

        if (resVal.errors && resVal.errors.length > 0){
            logger.warn($LogMsg.SCHEMA_SNAPSHOT_ERROR, resVal.errors);
        }
        return res;
    }
}

/**
 * @property logger
 * @property model
 * @property modelSnapshot
 */
export class Snapshot extends Resource {

    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
          json.class = json.class || $SchemaClass.Snapshot;
          return super.fromJSON(json, modelClasses, entitiesByID, namespace);
    }

    _activeIdx = -1;

    getStateIdx(state){
        return (this.states||[]).findIndex(e => e.id === state.id);
    }

    addState(state){
        this.states = this.states || [];
        this.states.push(state)
        this._activeIdx = this.states.length - 1;
    }

    removeState(state){
        let idx = this.getStateIdx(state);
        this.removeByIdx(idx);
    }

    removeByIdx(idx){
         if (idx > -1 && idx < this.length){
            this.states.splice(idx, 1);
            if (idx === this._activeIdx){
                this._activeIdx = idx - 1;
            }
         }
    }

    removeActive(){
        this.removeByIdx(this._activeIdx);
    }

    updateActive(newState){
        this.states[this._activeIdx] = newState;
    }

    switchToState(state){
        let idx = this.getStateIdx(state);
        if (idx > -1) {
            this._activeIdx = idx;
        } else {
            this.addState(state);
        }
    }

    switchToNext(){
        if (this._activeIdx < this.length - 1){
            this._activeIdx += 1;
        }
        return this.active;
    }

    switchToPrev(){
        if (this._activeIdx > 0){
            this._activeIdx -= 1;
        }
        return this.active;
    }

    get active(){
        return this._activeIdx > -1 && this.states && this.states[this._activeIdx];
    }

    get activeIndex(){
        return this._activeIdx;
    }

    set activeIndex(value){
        if (value < this.length) {
            this._activeIdx = value;
        } else {
            this._activeIdx = -1;
        }
    }

    get length(){
        return (this.states||[]).length;
    }

    validate(model){
        if (this.model !== model.id){
            return -1;
        }
        if (this.annotation){
            if (this.annotation.version !== model.version ||
                this.annotation.lastUpdated !== model.lastUpdated){
                return 0;
            }
        }
        return 1;
    }
}

