import {clone, isObject} from "lodash-bound";
import {$SchemaClass} from "../../model";

export class ResourceMaps {
    static assignID(resource, prefix, entitiesByID){
        if (!resource.id) {
            let counter = 1;
            let newResourceID = prefix + counter;
            while (entitiesByID[newResourceID]) {
                newResourceID = prefix + ++counter;
            }
            resource._id = true;
            resource.id = newResourceID;
        }
    }
    /**
     * Create a map of lyphs and materials for input model editors
     * @param model
     * @param entitiesByID
     */
    static materialsAndLyphs(model, entitiesByID) {
        (model.lyphs || []).forEach(lyph => {
            if (lyph::isObject()) {
                if (!lyph.id) {
                    this.assignID(lyph, "tmpLyphID", entitiesByID);
                }
                lyph._subtypes = [];
                delete lyph._supertype;
                lyph._class = $SchemaClass.Lyph;
                entitiesByID[lyph.id] = lyph;
            }
        });
        (model.materials || []).forEach(material => {
            if (material::isObject()) {
                if (!material.id) {
                    this.assignID(material, "tmpMatID", entitiesByID);
                }
                material._class = $SchemaClass.Material;
                entitiesByID[material.id] = material;
            }
        });
    }

    static importedMaterialsAndLyphs(model, entitiesByID) {
        if (!model.namespace) {
            console.error("Cannot process imported model without namespace: ", model.id);
            return;
        }
        (model.lyphs || []).forEach(_lyph => {
            if (_lyph::isObject()) {
                let lyph = _lyph::clone();
                if (!lyph.id) {
                    this.assignID(lyph, "tmpLyphID", entitiesByID);
                }
                lyph._subtypes = [];
                delete lyph._supertype;
                lyph._class = $SchemaClass.Lyph;
                lyph.imported = true;
                lyph.id = model.namespace + ":" + lyph.id;
                entitiesByID[lyph.id] = lyph;
            }
        });
        (model.materials || []).forEach(_material => {
            if (_material::isObject()) {
                let material = _material::clone();
                if (!material.id) {
                    this.assignID(material, "tmpMatID", entitiesByID);
                }
                material._class = $SchemaClass.Material;
                material.imported = true;
                material.id = model.namespace + ":" + material.id;
                entitiesByID[material.id] = material;
            }
        });
    }
}