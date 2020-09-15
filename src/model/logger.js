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
            "params" : (e.params||[]).map(param => param && param.toJSON? param.toJSON(): param)
        }));
    }

}

export const logger = new Logger();

import {$Field} from "./utils";

export const $LogMsg = {
    //Info
    REF_TO_LYPH                 : "Number of replaced references to lyph templates",
    REF_TO_MAT                  : "Number of replaced references to materials",
    REF_GEN                     : "Number of resources in the generated model",

    CHAIN_SLICE                 : `Sliced housing chain to match the number of lyphs in the housing range`,
    CHAIN_NUM_LEVELS            : `Corrected number of levels in the chain`,

    //Warnings
    AUTO_GEN                    : "Auto-created missing resources",
    AUTO_GEN_EXTERNAL           : "Auto-created missing external resources",

    CHAIN_UNDEFINED             : "Cannot expand undefined chain template",
    CHAIN_SKIPPED               : `Skipped faulty chain template. A correct chain template must have one of the following conditions met:
                (1) "${$Field.numLevels}" set to a positive number and non-empty "${$Field.lyphTemplate}",\n
                (2) non-empty list of "${$Field.lyphs}" to join to a chain,\n
                (3) non-empty list of "${$Field.levels}" which are (partially defined) links to join to a chain,\n 
                (4) non-empty list of "${$Field.housingLyphs}",\n 
                (5) non-empty "${$Field.housingChain}" reference with optional ${$Field.housingRange} parameter`,
    CHAIN_MAT_DIFF              : "Incorrectly defined chain pattern - innermost layers do not convey the same material",
    CHAIN_CONFLICT              : `Conflicting chain specification: both "${$Field.housingLyphs}" and "${$Field.housingChain}" are given. Proceeding with "${$Field.housingLyphs}"`,
    CHAIN_CONFLICT2             : `Conflicting chain specification: both "${$Field.lyphs}" and "${$Field.levels}" arrays are given. Proceeding with "${$Field.lyphs}"`,
    CHAIN_CONFLICT3             : `Conflicting specification of housing layer: layer's ${$Field.bundlesChains} property disagrees with the chain's ${$Field.housingLayers} property`,
    CHAIN_NO_HOUSING            : `Incorrect chain specification: "${$Field.housingChain}" not found!`,
    CHAIN_NO_HOUSING_LYPH       : "Failed to find a housing lyph",
    CHAIN_NO_HOUSING_LAYERS     : "Failed to find all layers of the housing lyph",
    CHAIN_HOUSING_TEMPLATE      : "Housing lyph or its layer is a template",
    CHAIN_NO_COALESCENCE        : "Skipped a coalescence between a housing lyph and a conveying lyph of the chain level it bundles: the conveying lyph is not defined",

    COALESCENCE_NO_AXIS         : "A coalescing lyph is missing an axis",
    COALESCENCE_SELF            : "A lyph coalesces with itself or its layers",
    COALESCENCE_NO_INSTANCE     : "No lyph instances found for abstract coalescence",

    //Errors
    REF_UNDEFINED               : "Remaining references to undefined resources",

    CHAIN_LYPH_TEMPLATE_MISSING : "Failed to find the lyph template definition in the parent group",
    CHAIN_LEVEL_ERROR           : `A mismatch between link ends found at level`,

    COALESCENCE_NO_LYPH         : "Unable to access lyph for coalescence definition",

};
