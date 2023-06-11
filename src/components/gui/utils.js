import {NgModule, Pipe, PipeTransform} from '@angular/core';
import {isArray, isObject} from 'lodash-bound';
import {$Field} from "../../model";
import {LYPH_TOPOLOGY} from "../../model/utils";

@Pipe({name: 'objToArray'})
export class ObjToArray implements PipeTransform {
    transform(obj) {
        if (obj::isArray()) {return obj; }
        return [obj];
    }
}

export function printFieldValue(value){
    if (!value) {return ""; }
    if (value::isArray()){
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

export function parseFieldValue(value){
    if (!value) { return [];}
    let res  = value.split(";");
    res = res.map(obj => (obj.indexOf("{") > -1)? JSON.parse(obj): obj);
    return res;
}


export function clearMany(resource, props, resourceID){
    let res = false;
    props.forEach(prop => {
        if (resource[prop]){
            //NK we assume here that only references are used, no nested objects and (no other namespaces yet!)
            let idx = resource[prop].findIndex(m => m === resourceID);
            if (idx > -1){
                resource[prop].splice(idx, 1);
                res = true;
            }
        }
    });
    return res;
}

export function clearOne(resource, props, resourceID){
    let res = false;
    props.forEach(prop => {
        if (resource[prop] && resource[prop] === resourceID) {
            delete resource[prop];
            res = true;
        }
    });
    return res;
}

export function replaceMany(resource, props, resourceID, newResourceID){
    let res = false;
    props.forEach(prop => {
        if (resource[prop]){
            //NK we assume here that only references are used, no nested objects and (no other namespaces yet!)
            let idx = resource[prop].findIndex(m => m === resourceID);
            if (idx > -1){
                resource[prop][idx] = newResourceID;
                res = true;
            }
        }
    });
    return res;
}

export function replaceOne(resource, props, resourceID, newResourceID){
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
export function clearMaterialRefs(model, materialID){
    (model.materials||[]).forEach(material => {
        clearMany(material,[$Field.materials, $Field.inMaterials], materialID);
    });
    (model.lyphs||[]).forEach(lyph => {
        clearMany(lyph,[$Field.materials, $Field.inMaterials, $Field.layers,
            $Field.internalLyphs, $Field.subtypes], materialID);
        clearOne(lyph,[$Field.layerIn, $Field.supertype, $Field.internalIn, $Field.seed], materialID);
    });
    (model.chains||[]).forEach(chain => clearMany(chain,[$Field.lyphs, $Field.housingLyphs], materialID));
    (model.groups||[]).forEach(group => clearMany(group,[$Field.seed], materialID));
    (model.chains||[]).forEach(chain => clearMany(chain,[$Field.lyphs], materialID));
    (model.links||[]).forEach(link => clearMany(link,[$Field.conveyingMaterials], materialID));
    return model;
}


export function replaceMaterialRefs(model, materialID, newMaterialID){
    (model.materials||[]).forEach(material => {
        replaceMany(material,[$Field.materials, $Field.inMaterials], materialID, newMaterialID);
    });
    (model.lyphs||[]).forEach(lyph => {
        replaceMany(lyph,[$Field.materials, $Field.inMaterials, $Field.layers,
            $Field.internalLyphs, $Field.subtypes], materialID, newMaterialID);
        replaceOne(lyph,[$Field.layerIn, $Field.supertype, $Field.internalIn, $Field.seed], materialID, newMaterialID);
    });
    (model.chains||[]).forEach(chain => replaceMany(chain,[$Field.lyphs, $Field.housingLyphs], materialID, newMaterialID));
    (model.groups||[]).forEach(group => replaceMany(group,[$Field.seed], materialID, newMaterialID));
    (model.chains||[]).forEach(chain => replaceMany(chain,[$Field.lyphs], materialID, newMaterialID));
    (model.links||[]).forEach(link => replaceMany(link,[$Field.conveyingMaterials], materialID, newMaterialID));
    return model;
}

export function isPath(entitiesByID, v, w){
   let stack = [];
   let explored = new Set();
   stack.push(v);
   explored.add(v);
   while (stack.length !== 0) {
      let t = stack.pop();
      if (t === w){
          return true;
      }
      let t_node = entitiesByID[t];
      (t_node.materials||[]).filter(n => !explored.has(n))
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