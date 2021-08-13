import {$SchemaType, getSchemaClass} from "./utils";
import {isArray, isObject, merge} from "lodash-bound";

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
            res = str.split(",").map(x =>
                parseStr(x.trim())
            );
        }
    } else {
        res = parseStr(str.trim());
    }
    return res;
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
