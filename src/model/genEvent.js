import {logger} from "./logger";
import {$Field} from "./utils";
import {keys} from "lodash-bound";

export const $GenEventMsg = {
    //Info
    REF_TO_LYPH  : num => ["Number of replaced references to lyph templates", num],
    REF_TO_MAT   : num => ["Number of replaced references to materials",      num],
    GEN_RESOURCES: num => ["Number of resources in the generated model",      num],

    //Warning
    AUTO_GEN         : resources => ["Auto-created missing resources:", resources],
    AUTO_GEN_EXTERNAL: resources => ["Auto-created missing external resources:", resources],

    CHAIN_UNDEFINED  : "Cannot expand undefined chain template",
    CHAIN_SKIPPED    : chain => [`Skipped faulty chain template. A correct chain template must have one of the following conditions met:
                (1) "${$Field.numLevels}" set to a positive number and non-empty "${$Field.lyphTemplate}",\n
                (2) non-empty list of "${$Field.lyphs}" to join to a chain,\n
                (3) non-empty list of "${$Field.levels}" which are (partially defined) links to join to a chain,\n 
                (4) non-empty list of "${$Field.housingLyphs}",\n 
                (5) non-empty "${$Field.housingChain}" reference with optional ${$Field.housingRange} parameter`,
                chain],
    CHAIN_LYPH_TEMPLATE_MISSING: lyphTemplate => ["Failed to find the lyph template definition in the parent group: ", lyphTemplate]
};


