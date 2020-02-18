import { Resource } from './resourceModel';
import {logger} from "./logger";
import { keys, values, uniqBy} from 'lodash-bound';
import {$Field, $Class, $Prefix, COALESCENCE_TOPOLOGY, getGenID} from "./utils";

/**
 * Coalescence model
 * @property lyphs
 * @property topology
 * @property generatedFrom
 */
export class Coalescence extends Resource{

    static COALESCENCE_TOPOLOGY = COALESCENCE_TOPOLOGY;

    /**
     * Replicates coalescences defined on abstract lyphs to their subtypes
     * @param parentGroup  - global group/graph (to refer to other resources)
     * @param modelClasses - model resource classes
     */
    createInstances(parentGroup, modelClasses){
        if (this.abstract) {return; }
        let lyph = this.lyphs[0];
        if (!lyph) { return; }
        let lyphMap = {};

        //FIX ME - where do the undefined lyphs come from?
        this.lyphs = (this.lyphs||[]).filter(x => !!x);

        this.lyphs.forEach(lyphOrMat => {
            if (!lyphOrMat) {
                logger.error("Unable to access lyph for coalescence definition", this.lyphs);
                return;
            }
            if (lyphOrMat.isTemplate){
                lyphMap[lyphOrMat.id] = lyphOrMat.subtypes || [];
            } else {
                if (lyphOrMat.class === $Class.Material) {
                    lyphMap[lyphOrMat.id] = (parentGroup.lyphs||[]).filter(e => e.generatedFrom === lyphOrMat);
                }
            }
        });
        if (lyphMap::keys().length > 0){
            //coalescence was defined on abstract lyphs - generate coalescence instances

            //TODO why lyph is undefined?
            this.lyphs.forEach(lyph => {
                lyphMap[lyph.id] = lyphMap[lyph.id] || [lyph];
            });

            let lyphInstances = lyphMap::values();
            let emptySet = lyphInstances.find(lyphs => lyphs.length === 0);
            if (emptySet){
                logger.warn("No lyph instances found for abstract coalescence", this, lyphInstances);
                return;
            }

            const f = (a, b) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
            const cartesian = (a, b, ...c) => (b ? cartesian(f(a, b), ...c) : a);

            let coalescingLyphs = cartesian(...lyphInstances);

            coalescingLyphs.forEach((lyphs, i) => {
                let uniqueLyphs = lyphs::uniqBy(e => e.id);
                if (uniqueLyphs.length <= 1) { return; }

                let instance = this.constructor.fromJSON({
                    [$Field.id]           : getGenID(this.id, $Prefix.instance, i + 1),
                    [$Field.generated]    : true,
                    [$Field.topology]     : this.topology,
                    [$Field.generatedFrom]: this,
                    [$Field.lyphs]        : uniqueLyphs
                }, modelClasses, parentGroup.entitiesByID);

                //it is ok to add newly create coalescences to the parent group coalescence set as they won't be further processed
                parentGroup.coalescences.push(instance);
            });
            this.abstract = true;
        }
    }

    /**
     * Validate whether the lyphs in the coalescence template are allowed to coalesce (e.g., lyph layers cannot coalesce with their container, etc.)
     */
    validate(){
        if (this.abstract || !this.lyphs) { return; }
        let lyph = this.lyphs[0];
        if (!lyph) { return; }

        //FIX ME - where do the undefined lyphs come from?
        this.lyphs = (this.lyphs||[]).filter(x => !!x);

        this.lyphs.forEach((lyph2, i) => {
            if (i <= 0) {return; }
            if ((lyph2.layers||[]).find(x => x.id === lyph.id) || (lyph.layers||[]).find(x => x.id === lyph2.id)) {
                logger.warn("A lyph coalesces with itself or its layers", lyph, lyph2);
            }
            if (!lyph.axis || !lyph2.axis) {
                logger.warn("A coalescing lyph is missing an axis", !lyph.axis ? lyph : lyph2);
            }
            lyph2.angle = 180; //subordinate coalescing lyph should turn to its master
        })
    }

    /**
     * Checks whether the coalescence resource defines an abstract template (coalescence of abstract lyphs or materials)
     * @returns {boolean}
     */
    get isTemplate(){
        return !!(this.lyphs||[]).find(lyphOrMat => lyphOrMat.isTemplate || lyphOrMat.class === $Class.Material);
    }
}