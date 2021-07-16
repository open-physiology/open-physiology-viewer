import {Resource} from "./resourceModel";


/**
 * @property logger
 */
export class State extends Resource {
}

/**
 * @property logger
 * @property model
 * @property modelSnapshot
 */
export class Snapshot extends Resource {
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
        if (idx > -1){
            this.states = this.states.splice(idx, 1);
            if (idx === this._activeIdx){
                this._activeIdx = idx - 1;
            }
        }
    }

    updateState(state){
        let idx = this.getStateIdx(state);
        if (idx > -1){
            this.states[idx] = state;
        }
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
        if (this._activeIdx < (this.states||[]).length - 1){
            this._activeIdx += 1;
        }
    }

    switchToPrev(){
        if (this._activeIdx > 0){
            this._activeIdx -= 1;
        }
    }

    get active(){
        return this._activeIdx > -1 && this.states && this.states[this._activeIdx];
    }

    get activeIndex(){
        return this._activeIdx;
    }
}

