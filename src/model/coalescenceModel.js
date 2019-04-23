import { Resource } from './resourceModel';
import {logger} from "./logger";
import { keys, values } from 'lodash-bound';

export class Coalescence extends Resource{

    /**
     * Replicates coalescences defined on abstract lyphs to their subtypes
     * @param parentGroup
     * @param coalescence
     */
    createInstances(parentGroup, modelClasses){
        if (this.inactive) {return; }
        let lyph = this.lyphs[0];
        if (!lyph) { return; }
        let lyphMap = {};

        (this.lyphs||[]).forEach(lyphOrMat => {
            if (lyphOrMat.isTemplate){
                lyphMap[lyphOrMat.id] = lyphOrMat.subtypes || [];
            } else {
                if (lyphOrMat.class === "Material") {
                    lyphMap[lyphOrMat.id] = (parentGroup.lyphs||[]).filter(e => e.generatedFrom === lyphOrMat);
                }
            }
        });
        if (lyphMap::keys().length > 0){
            //coalescence was defined on abstract lyphs - generate coalescence instances
            (this.lyphs||[]).forEach(lyph => {
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
                let instance = this.constructor.fromJSON({
                    "id"           : `${this.id}_instance-${i + 1}`,
                    "name"         : `${this.name} instance #${i + 1}`,
                    "generatedFrom": this,
                    "lyphs"        : lyphs,
                    "comment"      : lyphs.map(e => e.id).join(",")
                }, modelClasses, parentGroup.entitiesByID);

                //it is ok to add newly create coalescences to the parent group coalescence set as they won't be further processed
                parentGroup.coalescences.push(instance);
            });
            this.inactive = true;
        }
    }

    validate(){
        if (this.inactive) { return; }
        let lyph = this.lyphs[0];
        if (!lyph) { return; }

        for (let i = 1; i < this.lyphs.length; i++) {
            let lyph2 = this.lyphs[i];
            if ((lyph2.layers||[]).find(x => x.id === lyph.id) || (lyph.layers||[]).find(x => x.id === lyph2.id)) {
                logger.warn("A lyph coalesces with itself or its layers", lyph, lyph2);
            }
            if (!lyph.axis || !lyph2.axis) {
                logger.warn("A coalescing lyph is missing an axis", !lyph.axis ? lyph : lyph2);
            }
            lyph2.angle = 180; //subordinate coalescing lyph should turn to its master
        }
    }
}