import {merge, isObject, isArray} from 'lodash-bound';
export const JSONPath = require('JSONPath');

let consoleHolder = console;
/**
 * Helper function to toggle console logging
 * @param bool - boolean flag that indicates whether to print log messages to the console
 * @param msgCount - optional object to count various types of messages (needed to notify the user about errors or warnings)
 */
export function debug(bool, msgCount = {}){
    if(!bool){
        consoleHolder = console;
        console = {};
        Object.keys(consoleHolder).forEach(function(key){
            console[key] = function(){
                if (!msgCount[key]) {
                    msgCount[key] = 0;
                } else {
                    msgCount[key]++;
                }
            };
        })
    }else{
        console = consoleHolder;
    }
}

/**
 * Assign properties for the entities in JSON path
 * @param path    - JSON path
 * @param value   - value to assign
 * @param parent  - parent (root) object
 * @param handler - custom handler for each modified object
 */
export function assignPropertiesToJSONPath({path, value}, parent, handler){
    if (path && value){
        try{
            let entities = (JSONPath({json: parent, path: path}) || []).filter(e => !!e);
            //let array = [].concat(...entities);
            entities.forEach(e => {
                e::merge(value);
                if (handler) { handler(e) }
            });
        } catch (err){
            console.error(`Failed to assign properties to the JSON Path ${path} of:`, parent, err);
        }
    }
}

/**
 * Copy coordinates from source object to target
 * @param target
 * @param source
 */
export function copyCoords(target, source){
    if (!source) { return; }
    if (!target) { return; }
    ["x", "y", "z"].forEach(dim => {
        if (source.hasOwnProperty(dim)) {
            target[dim] = source[dim] || 0
        }
    });
}











