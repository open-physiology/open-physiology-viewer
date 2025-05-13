import {NgModule, Pipe, PipeTransform} from '@angular/core';
import {isArray, isObject, clone} from 'lodash-bound';
import {$Field, $SchemaClass} from "../../model";


/**
 * Design schema colors for fields in GUI components
 * @type {{toggleActiveBg: string, customPurple: string, white: string, headingBg: string, black: string,
 * inputPlacholderColor: string, customOrange: string, inputTextColor: string, customGreen: string,
 * inputBorderColor: string, grey: string}}
 */
export const COLORS = {
    grey: 'grey',
    white: '#FFFFFF',
    inputBorderColor: '#E0E0E0',
    inputTextColor: '#797979',
    inputPlacholderColor: '#C0C0C0',
    black: '#000000',
    toggleActiveBg: '#613DB0',
    headingBg: '#F1F1F1',
    lyph: '#ffe4b2',
    template: '#ffff99',
    material: '#ccffcc',
    link: '#ffccff',
    node: '#ddffff',
    region: '#e3e3e3',
    coalescence: '#ffe7e7',
    chain: '#ccddff',
    external: '#b7fae7',
    imported: '#e3e3e3',
    //
    undefined: "lightgrey",
    default: "lightgrey",
    // Editors
    selectedBorder: "#FF7F7F",
    selected: "#FFCCCC",
    highlighted: "#FFCCCC",
    border: "#999",
    path: "lightgrey",
    pathLink: "#a5a5a5",
    selectedPathLink: "#FF7F7F",
    new: "#a5a5a5",
    buttonText: "#797979",
    //
    tooltip: "#f5f5f5",
    tooltipBorder: "#666",
    // Hubmap
    hubmapRoot: "#eeaf9e",
    hubmapMain: "#e8dbb3",
    hubmapAnnotation: "#ecf3a6"
};


@Pipe({name: 'objToArray'})
export class ObjToArray implements PipeTransform {
    transform(obj) {
        if (obj::isArray()) {
            return obj;
        }
        return [obj];
    }
}

/**
 * Converts an input field value into serializable format. Objects are referred by the identifier in their 'id' field.
 * @param value
 * @returns {string|*}
 */
export function printFieldValue(value) {
    if (!value) {
        return "";
    }
    if (value::isArray()) {
        return value.map(e => printFieldValue(e)).filter(e => !!e).join(";");
    } else {
        if (value::isObject()) {
            if (value.id) {
                return value.id;
            } else {
                return JSON.stringify(value, "", 2);
            }
        }
    }
    return value;
}

export function parseFieldValue(value) {
    if (!value) {
        return [];
    }
    let res = value.split(";");
    res = res.map(obj => (obj.indexOf("{") > -1) ? JSON.parse(obj) : obj);
    return res;
}

/**
 * Removes references to a given resourceID from a set of given properties containing multiple values
 * @param resource - a resource to modify
 * @param props - properties of the main resource that may contain unwanted references
 * @param resourceID - a referred resource identifier to remove
 * @returns {boolean} - returns true if the main resource was altered
 */
export function clearMany(resource, props, resourceID) {
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
export function clearOne(resource, props, resourceID) {
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
export function replaceMany(resource, props, resourceID, newResourceID) {
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

export function replaceOne(resource, props, resourceID, newResourceID) {
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
export function clearMaterialRefs(model, materialID) {
    (model.materials || []).forEach(material => {
        clearMany(material, [$Field.materials, $Field.inMaterials], materialID);
    });
    (model.lyphs || []).forEach(lyph => {
        clearMany(lyph, [$Field.materials, $Field.inMaterials, $Field.layers,
            $Field.internalLyphs, $Field.subtypes], materialID);
        clearOne(lyph, [$Field.layerIn, $Field.supertype, $Field.internalIn, $Field.seed], materialID);
    });
    (model.chains || []).forEach(chain => clearMany(chain, [$Field.lyphs, $Field.housingLyphs], materialID));
    (model.groups || []).forEach(group => clearMany(group, [$Field.seed], materialID));
    (model.chains || []).forEach(chain => clearMany(chain, [$Field.lyphs], materialID));
    (model.links || []).forEach(link => clearMany(link, [$Field.conveyingMaterials], materialID));
    return model;
}


export function replaceMaterialRefs(model, materialID, newMaterialID) {
    (model.materials || []).forEach(material => {
        replaceMany(material, [$Field.materials, $Field.inMaterials], materialID, newMaterialID);
    });
    (model.lyphs || []).forEach(lyph => {
        replaceMany(lyph, [$Field.materials, $Field.inMaterials, $Field.layers,
            $Field.internalLyphs, $Field.subtypes], materialID, newMaterialID);
        replaceOne(lyph, [$Field.layerIn, $Field.supertype, $Field.internalIn, $Field.seed], materialID, newMaterialID);
    });
    (model.chains || []).forEach(chain => replaceMany(chain, [$Field.lyphs, $Field.housingLyphs], materialID, newMaterialID));
    (model.groups || []).forEach(group => replaceMany(group, [$Field.seed], materialID, newMaterialID));
    (model.chains || []).forEach(chain => replaceMany(chain, [$Field.lyphs], materialID, newMaterialID));
    (model.links || []).forEach(link => replaceMany(link, [$Field.conveyingMaterials], materialID, newMaterialID));
    return model;
}

function assignID(resource, prefix, entitiesByID){
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
export function prepareMaterialLyphMap(model, entitiesByID) {
    (model.lyphs || []).forEach(lyph => {
        if (lyph::isObject()) {
            if (!lyph.id) {
                assignID(lyph, "tmpLyphID", entitiesByID);
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
                assignID(material, "tmpMatID", entitiesByID);
            }
            material._class = $SchemaClass.Material;
            entitiesByID[material.id] = material;
        }
    });
}

export function prepareImportedMaterialLyphMap(model, entitiesByID) {
    if (!model.namespace){
        console.error("Cannot process imported model without namespace: ", model.id);
        return;
    }
    (model.lyphs || []).forEach(_lyph => {
        if (_lyph::isObject()) {
            let lyph = _lyph::clone();
             if (!lyph.id) {
                assignID(lyph, "tmpLyphID", entitiesByID);
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
                assignID(material, "tmpMatID", entitiesByID);
            }
            material._class = $SchemaClass.Material;
            material.imported = true;
            material.id = model.namespace + ":" + material.id;
            entitiesByID[material.id] = material;
       }
    });
}

function addOptions(resources, searchOptions, clsName, prefix){
     (resources || []).forEach(e => searchOptions.push({
        id: prefix+e.id,
        label: (e.name || '?') + ' (' + prefix+e.id + ')',
        type: e.isTemplate ? 'Template' : clsName
     }));
}

/**
 * Returns a list of lyph and material names joint with identifiers for search boxes in the GUI components
 * @param model
 * @returns {{id: *, label: string, type: string}[]}
 */
export function prepareMaterialSearchOptions(model, searchOptions = [], prefix="") {
    addOptions(model.materials, searchOptions, $SchemaClass.Material, prefix);
    addOptions((model.lyphs||[]).filter(e => e.isTemplate), searchOptions, $SchemaClass.Lyph, prefix);
    addOptions((model.lyphs||[]).filter(e => !e.isTemplate), searchOptions, $SchemaClass.Lyph, prefix);
    (model.groups||[]).forEach(g => {
        if (g.imported && g.namespace !== model.namespace){
            prepareMaterialSearchOptions(g, searchOptions, g.namespace+":");
        }
    });
    return searchOptions;
}

/**
 * Returns a list of lyph names joint with identifiers for search boxes in the GUI components
 * @param model
 * @returns {{id: *, label: string, type: string}[]}
 */
export function prepareLyphSearchOptions(model, searchOptions = [], prefix="") {
    addOptions((model.lyphs||[]).filter(e => e.isTemplate), searchOptions, $SchemaClass.Lyph, prefix);
    addOptions((model.lyphs||[]).filter(e => !e.isTemplate), searchOptions, $SchemaClass.Lyph, prefix);
    //Imported
    (model.groups||[]).forEach(g => {
        if (g.imported && g.namespace !== model.namespace){
            prepareLyphSearchOptions(g, searchOptions, g.namespace+":");
        }
    });
    return searchOptions;
}

/**
 * Returns a list of lyph and material names joint with identifiers for search boxes in the GUI components
 * @param model
 * @returns {{id: *, label: string, type: string}[]}
 */
export function prepareSearchOptions(model) {
    let searchOptions = [];
    let classNames = [$SchemaClass.Material, $SchemaClass.Lyph, $SchemaClass.Link, $SchemaClass.Node, $Field.coalescences,
        $SchemaClass.Wire, $SchemaClass.Anchor, $SchemaClass.Region];
    [$Field.materials, $Field.lyphs, $Field.links, $Field.nodes, $Field.coalescences, $Field.wires, $Field.anchors, $Field.regions].forEach((prop, i) => {
        (model[prop] || []).forEach(e => searchOptions.push({
            id: e.id,
            label: (e.name || '?') + ' (' + e.id + ')',
            type: e.isTemplate ? 'Template' : classNames[i]
        }));
    });
    searchOptions.sort();
    return searchOptions;
}

export function isPath(entitiesByID, v, w) {
    let stack = [];
    let explored = new Set();
    stack.push(v);
    explored.add(v);
    while (stack.length !== 0) {
        let t = stack.pop();
        if (t === w) {
            return true;
        }
        let t_node = entitiesByID[t];
        (t_node.materials || []).filter(n => !explored.has(n))
            .forEach(n => {
                explored.add(n);
                stack.push(n);
            });
    }
    return false;
}

@NgModule({
    declarations: [ObjToArray],
    exports: [ObjToArray]
})
export class UtilsModule {
}