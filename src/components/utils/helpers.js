import {cloneDeep, isObject, keys, entries} from 'lodash-bound';
import {$Field, $SchemaClass, getGenID, getGenName} from "../../model";
import {defineNewResource, LYPH_TOPOLOGY} from "../../model/utils";
import {ResourceMaps} from "./resourceMaps";

export function limitLabel(label, maxLength=40) {
    if (!label) return "";
    if (label.length <= maxLength) return label;
    return label.slice(0, maxLength) + '…';
}

export function reviseHierarchy(oldLyph, entitiesByID, replacementMap, defineNewLyph) {
    const replaceLyph = (objOrID) => {
        let obj = objOrID::isObject() ? objOrID : entitiesByID[objOrID];
        if (!obj) return oldLyph;
        //Replicating lyph
        let lyphDef = defineNewResource(obj::cloneDeep(), entitiesByID);
        let materialMap = replacementMap[obj.id] || [];
        for (let i = 0; i < lyphDef.layers?.length; i++) {
            if (materialMap[lyphDef.layers[i]]) {
                lyphDef.layers[i] = materialMap[lyphDef.layers[i]];
            }
        }
        if (lyphDef._supertype) {
            let s = replaceLyph(lyphDef._supertype);
            if (s?.id) {
                lyphDef.supertype = s.id;
                lyphDef._supertype = s;
            }
        }
        return defineNewLyph(lyphDef);
    }
    return replaceLyph(oldLyph);
}

export function createChainFromPrototype(chainPrototype, entitiesByID, replacementMapLevels, callbacks) {
    const {defineNewLyph, createChain, saveStep, showWarning} = callbacks;
    if (replacementMapLevels::keys().length === 0) {
        return;
    }
    let oldLyph = entitiesByID[chainPrototype.lyphTemplate];
    if (!oldLyph) {
        if (showWarning) {
            showWarning("Failed to locate lyph template definition");
        }
        return;
    }
    let topology = ResourceMaps.getTopology(oldLyph);
    const N = chainPrototype.numLevels;

    const chainDef = defineNewResource({
        [$Field.id]: chainPrototype.id, //The identifier is auto-created by appending the counter
        [$Field.name]: chainPrototype.name,
        [$Field.lyphs]: new Array(N),
        [$Field.specializationOf]: chainPrototype.id, //Keep the reference to the original chain
        "_class": $SchemaClass.Chain
    }, entitiesByID);

    let newLyphs = {};

    replacementMapLevels::entries().forEach(([level, replacementMap]) => {
        let reviseLyph = false;
        (oldLyph.layers || []).forEach(layer => {
            if (replacementMap[layer.id]) reviseLyph = true;
        });
        if (reviseLyph) {
            newLyphs[level] = reviseHierarchy(oldLyph, entitiesByID, replacementMap, defineNewLyph);
        } else {
            let reviseHierarchyFlag = false;
            let curr = oldLyph;
            while (curr._supertype) {
                curr = curr._supertype::isObject() ? curr._supertype : entitiesByID[curr._supertype];
                if (replacementMap[curr.id]) {
                    reviseHierarchyFlag = true;
                    break;
                }
            }
            newLyphs[level] = reviseHierarchyFlag ? reviseHierarchy(oldLyph._supertype, entitiesByID, replacementMap, defineNewLyph) : oldLyph;
        }
    });

    const modifyLyphTemplate = (lyphDef, idx) => {
        let level = "All levels";
        if ((chainPrototype.levelOntologyTerms || []).length > idx && chainPrototype.levelOntologyTerms[idx]) {
            level = chainPrototype.levelOntologyTerms[idx];
        }
        let newLyph = newLyphs[level] || oldLyph;
        if (newLyph) {
            if (newLyph.supertype) lyphDef.supertype = newLyph.supertype;
            if (newLyph.layers) lyphDef.layers = newLyph.layers;
        }
        return (lyphDef.id in entitiesByID) ? entitiesByID[lyphDef.id].id : defineNewLyph(lyphDef).id;
    }

    if (topology === LYPH_TOPOLOGY.CYST || topology === LYPH_TOPOLOGY.BAG2) {
        // BAG2
        let lyphDef = defineNewResource({
            [$Field.id]: getGenID(oldLyph.id, "bag+"),
            [$Field.name]: getGenName(oldLyph.name || oldLyph.id, "(BAG+)"),
            [$Field.isTemplate]: true,
            [$Field.topology]: LYPH_TOPOLOGY.BAG2,
        }, entitiesByID);
        chainDef.lyphs[0] = modifyLyphTemplate(lyphDef, 0);
    }
    if (topology === LYPH_TOPOLOGY.CYST || topology === LYPH_TOPOLOGY.BAG) {
        //BAG
        let lyphDef = defineNewResource({
            [$Field.id]: getGenID(oldLyph.id, "bag-"),
            [$Field.name]: getGenName(oldLyph.name || oldLyph.id, "(BAG-)"),
            [$Field.isTemplate]: true,
            [$Field.topology]: LYPH_TOPOLOGY.BAG
        }, entitiesByID);
        chainDef.lyphs[N - 1] = modifyLyphTemplate(lyphDef, N - 1);
    }
    let n = chainDef.lyphs.filter(x => x).length;
    if (n > 0) {
        //TUBE
        let lyphDef = defineNewResource({
            [$Field.id]: getGenID(oldLyph.id, "tube"),
            [$Field.name]: getGenName(oldLyph.name || oldLyph.id, "(TUBE)"),
            [$Field.isTemplate]: true,
            [$Field.topology]: LYPH_TOPOLOGY.TUBE
        }, entitiesByID);
        for (let i = 0; i < N; i++) {
            if (!chainDef.lyphs[i]) {
                chainDef.lyphs[i] = modifyLyphTemplate(lyphDef, i);
            }
        }
    }

    if (createChain) {
        createChain(chainDef, false); // Do not register "create chain" action
    }
    if (saveStep) {
        saveStep("Create chain modification", chainDef.id);
    }
}
