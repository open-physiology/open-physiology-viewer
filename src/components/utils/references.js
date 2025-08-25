import {$Field} from "../../model";

export class References {
    /**
     * Removes references to a given resourceID from a set of given properties containing multiple values
     * @param resource - a resource to modify
     * @param props - properties of the main resource that may contain unwanted references
     * @param resourceID - a referred resource identifier to remove
     * @returns {boolean} - returns true if the main resource was altered
     */
    static clearMany(resource, props, resourceID) {
        let res = false;
        props.forEach(prop => {
            if (resource[prop]) {
                //NK we assume here that only references are used, no nested objects and (no other namespaces yet!)
                let idx = resource[prop].findIndex(m => (m.id || m) === resourceID);
                if (idx > -1) {
                    resource[prop].splice(idx, 1);
                    res = true;
                }
            }
        });
        return res;
    }

    /**
     * Removes references to a given resourceID from a set of given properties containing a single value
     * @param resource - a resource to modify
     * @param props - properties of the main resource that may contain unwanted references
     * @param resourceID - a referred resource identifier to remove
     * @returns {boolean} - returns true if the main resource was altered
     */
    static clearOne(resource, props, resourceID) {
        let res = false;
        props.forEach(prop => {
            if (resource[prop] && resource[prop] === resourceID) {
                delete resource[prop];
                res = true;
            }
        });
        return res;
    }

    /**
     * Replaces references in properties of a given resource that expect multiple values
     * @param resource - a resource to modify
     * @param props - properties of the main resource that may contain references that need replacing
     * @param resourceID - a referred resource identifier to replace
     * @param newResourceID - a new resource identifier to use as replacement
     * @returns {boolean} - returns true if the main resource was altered
     */
    static replaceMany(resource, props, resourceID, newResourceID) {
        let res = false;
        props.forEach(prop => {
            if (resource[prop]) {
                //NK we assume here that only references are used, no nested objects and (no other namespaces yet!)
                let idx = resource[prop].findIndex(m => m === resourceID);
                if (idx > -1) {
                    resource[prop][idx] = newResourceID;
                    res = true;
                }
            }
        });
        return res;
    }

    static replaceOne(resource, props, resourceID, newResourceID) {
        let res = false;
        props.forEach(prop => {
            if (resource[prop] && resource[prop] === resourceID) {
                resource[prop] = newResourceID;
                res = true;
            }
        });
        return res;
    }

    /**
     * Removes references to a given material from an input model
     * Some relationships that theoretically can point to the removed material but in practice only used in generated model
     * are omitted (e.g., villi or channels are not used practically, and certainly not in WBKG)
     * @param model
     * @param materialID
     */
    static clearMaterialRefs(model, materialID) {
        (model.materials || []).forEach(material => {
            this.clearMany(material, [$Field.materials, $Field.inMaterials], materialID);
        });
        (model.lyphs || []).forEach(lyph => {
            this.clearMany(lyph, [$Field.materials, $Field.inMaterials, $Field.layers,
                $Field.internalLyphs, $Field.subtypes], materialID);
            this.clearOne(lyph, [$Field.layerIn, $Field.supertype, $Field.internalIn, $Field.seed], materialID);
        });
        (model.chains || []).forEach(chain => {
            this.clearMany(chain, [$Field.lyphs, $Field.housingLyphs, $Field.housingLyphTemplates], materialID);
            this.clearOne(chain, [$Field.lyphTemplate], materialID);
        });
        (model.groups || []).forEach(group => this.clearMany(group, [$Field.seed], materialID));
        (model.links || []).forEach(link => this.clearMany(link, [$Field.conveyingMaterials], materialID));
        return model;
    }

    static clearChainRefs(model, chainID) {
        (model.nodes || []).forEach(node => this.clearOne(node, [$Field.rootOf, $Field.leafOf], chainID));
        (model.chains || []).forEach(chain => {
            this.clearMany(chain, [$Field.laterals], chainID);
            this.clearOne(chain, [$Field.lateralOf], chainID);
        });
        (model.links || []).forEach(link => this.clearMany(link, [$Field.levelIn], chainID));
        (model.lyphs || []).forEach(lyph => {
            this.clearMany(lyph, [$Field.inChains, $Field.templateInChains, $Field.bundlesChains, $Field.providesChains], chainID);
        });
        return model;
    }

    /**
     * Remove material or lyph from the model
     * @param model
     * @param materialID
     */
    static removeMaterialOrLyph(model, materialID) {
        let idx = (model.materials || []).findIndex(m => m.id === materialID);
        if (idx > -1) {
            model.materials.splice(idx, 1);
        } else {
            idx = (model.lyphs || []).findIndex(m => m.id === materialID);
            model.lyphs.splice(idx, 1);
        }
    }

    static replaceMaterialRefs(model, materialID, newMaterialID) {
        (model.materials || []).forEach(material => {
            this.replaceMany(material, [$Field.materials, $Field.inMaterials], materialID, newMaterialID);
        });
        (model.lyphs || []).forEach(lyph => {
            this.replaceMany(lyph, [$Field.materials, $Field.inMaterials, $Field.layers,
                $Field.internalLyphs, $Field.subtypes], materialID, newMaterialID);
            this.replaceOne(lyph, [$Field.layerIn, $Field.supertype, $Field.internalIn, $Field.seed], materialID, newMaterialID);
        });
        (model.chains || []).forEach(chain => this.replaceMany(chain, [$Field.lyphs, $Field.housingLyphs], materialID, newMaterialID));
        (model.groups || []).forEach(group => this.replaceMany(group, [$Field.seed], materialID, newMaterialID));
        (model.chains || []).forEach(chain => this.replaceMany(chain, [$Field.lyphs], materialID, newMaterialID));
        (model.links || []).forEach(link => this.replaceMany(link, [$Field.conveyingMaterials], materialID, newMaterialID));
        return model;
    }
}
