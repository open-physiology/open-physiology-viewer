// import {EventEmitter} from 'events';
// const emitter = new EventEmitter();

export class Logger {
    entries = [];

    constructor(){}

    info(msg, ...params){
        this.entries.push({"level": "info", msg, params});
    }
    warn(msg, ...params){
        this.entries.push({"level": "info", msg, params});
    }
    error(msg, ...params){
        this.entries.push({"level": "error", msg, params});
    }

    clear(){
        this.entries = [];
        console.clear();
    }

    toConsole(){
        this.entries.forEach(e => {
            console[e.level](e.msg, ...e.params);
        })
    }

    toJSON(){

    }

}

export const logger = new Logger();