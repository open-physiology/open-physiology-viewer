import {$SchemaType, getSchemaClass} from "./utils";
import {isArray, isObject, isString, merge, omit, pick, values} from "lodash-bound";
import {$LogMsg, logger} from "./logger";

/**
 * Get expected field type
 * @param schema
 * @returns {*|string}
 */
export function getItemType(schema){
    let itemType = schema.type || $SchemaType.STRING;
    if (schema.$ref) {
        let cls = getSchemaClass(schema.$ref);
        if (cls) {
            itemType = getItemType(cls);
        } else {
            itemType = $SchemaType.OBJECT;
        }
    }
    if (schema.type === $SchemaType.ARRAY || schema.items) {
        itemType = getItemType(schema.items);
    }
    return itemType;
}

/**
 * Convert string value into expected object value. Used for Excel template parsing
 * @param isArray  - indicates whether specification value should be an array
 * @param itemType - expected value type
 * @param str      - value string
 * @returns {*} resource value of the requested type
 */
export function strToValue(isArray, itemType, str){
    const parseStr = x => (itemType === $SchemaType.NUMBER) ? parseFloat(x)
        : (itemType === $SchemaType.BOOLEAN) ? (x.toLowerCase() === "true")
            : (itemType === $SchemaType.OBJECT) ? JSON.parse(x)
                : x;

    let res;
    if (isArray) {
        if (str.indexOf("{") > -1 && str.indexOf("}") > -1 ){
            //parse array of objects
            res = JSON.parse("[" + str + "]");
        } else {
            //parse array of strings, i.e., identifiers
            res = str.split(",").map(x => parseStr(x.trim()));
        }
    } else {
        res = parseStr(str.trim());
    }
    return res;
}

/**
 *
 * @param value
 * @param key
 * @returns {boolean}
 */
export function validateValue(value, key){
    if (value === undefined){
        return false;
    }
    if (!key) {
        logger.error($LogMsg.EXCEL_NO_COLUMN_NAME, value);
        return false;
    }
    if (!key::isString()) {
        logger.error($LogMsg.EXCEL_INVALID_COLUMN_NAME, key)
        return false;
    }
    return true;
}

/**
 * Copy properties from Excel's "main" page to the model object
 * @param model - generated JSON from Excel model
 */
export function extractModelAnnotation(model){
    if (model.main){
        if (model.main[0]::isArray()){
            model.main[0].forEach(({key: value}) => model[key] = value);
        } else {
            if (model.main[0]::isObject()){
                model::merge(model.main[0]);
            }
        }
        delete model.main;
    }
}

/**
 * Mapping levelTargets in Excel to levels in JSON (issue #114)
 * @example levelTargets = "0:n1,3:n3,5:n5" translates to levels = [{target: n1},,,{target:n3},,{target:n5}]
 * @param resource - ApiNATOMY resource potentially containing "levelTargets" property
 * @returns {*} - ApiNATOMY resource with "levelTargets" property mapped to "levels"
 */
export function levelTargetsToLevels(resource) {
    if (resource.levelTargets){
        let maps = [];
        let targets = resource.levelTargets.split(',');
        (targets||[]).forEach(target => {
            let targetMap = target.split(":");
            if (targetMap && targetMap.length === 2){
                maps.push(targetMap);
            }
        })
        let maxLevel = -1;
        maps.forEach(level => {
            const levelNum = parseInt(level[0]);
            if (!Number.isNaN(levelNum)) {
                level[0] = levelNum;
                if (levelNum > maxLevel) {
                    maxLevel = levelNum;
                }
            }
        })
        if (maxLevel > -1) {
            resource.levels = new Array(maxLevel+1);
            for (let j = 0; j < maps.length; j++) {
                let idx = maps[j][0];
                resource.levels[idx] = {target: maps[j][1]};
            }
        }
    }
    delete resource.levelTargets;
    return resource;
}

/**
 * Mapping border name columns to borders array
 * @param resource - ApiNATOMY resource potentially containing properties from borderNames list
 * @param borderNames - List of border names ("inner", "radial1", "outer", "radial2")
 * @returns {*} ApiNATOMY resource with border names mapped to "border" object
 */
export function borderNamesToBorder(resource, borderNames){
    let borderConstraints = resource::pick(borderNames);
    if (borderConstraints::values().filter(x => !!x).length > 0) {
        resource.border = {borders: borderNames.map(borderName => borderConstraints[borderName] ? {
            hostedNodes: borderConstraints[borderName].split(",")} : {})};
    }
    return resource::omit(borderNames);
}

