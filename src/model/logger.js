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
    static LEVEL = LEVEL;
    static STATUS = STATUS;

    entries = [];
    levelOptions  = LEVEL;
    statusOptions = STATUS;

    constructor(){}

    info(msg, ...params){
        this.entries.push({"level": this.levelOptions.INFO, msg, params});
    }
    warn(msg, ...params){
        this.entries.push({"level": this.levelOptions.WARN, msg, params});
    }
    error(msg, ...params){
        this.entries.push({"level": this.levelOptions.ERROR, msg, params});
    }

    clear(){
        this.entries = [];
    }

    toConsole(){
        this.entries.forEach(e => {
            console[e.level](e.msg, ...e.params);
        })
    }

    get status(){
        let count = this.entries.filter(msg => msg.level === this.levelOptions.ERROR).length;
        if (count) { return this.statusOptions.ERROR; }
        count = this.entries.filter(msg => msg.level === this.levelOptions.WARN).length;
        if (count) { return this.statusOptions.WARNING; }
        return this.statusOptions.OK;
    }

    print(){
        return this.entries.map(e => ({
            "level"  : e.level,
            "msg"    : e.msg,
            "params" : (e.params||[]).map(param => param.toJSON? param.toJSON(new Set([])): param)
        }));
    }

}

export const logger = new Logger();