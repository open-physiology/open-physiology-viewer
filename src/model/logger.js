const LEVEL = {
    INFO  : "Info",
    WARN  : "Warn",
    ERROR : "Error"
};

const STATUS = {
    OK      : "OK",
    WARNING : "Warning",
    ERROR   : "Error"
};

export class Logger {
    entries = [];
    levels = STATUS;

    constructor(){}

    info(msg, ...params){
        this.entries.push({"level": LEVEL.INFO, msg, params});
    }
    warn(msg, ...params){
        this.entries.push({"level": LEVEL.WARN, msg, params});
    }
    error(msg, ...params){
        this.entries.push({"level": LEVEL.ERROR, msg, params});
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

    get status(){
        let count = this.entries.filter(msg => msg.level === LEVEL.ERROR).length;
        if (count) { return STATUS.ERROR; }
        count = this.entries.filter(msg => msg.level === LEVEL.WARN).length;
        if (count) { return STATUS.WARNING; }
        return STATUS.OK;
    }

    toJSON(){
        return this.entries.map(e => ({
            "level"  : e.level,
            "msg"    : e.msg,
            "params" : (e.params||[]).map(param => param.toJSON? param.toJSON(): param)
        }));
    }

}

export const logger = new Logger();