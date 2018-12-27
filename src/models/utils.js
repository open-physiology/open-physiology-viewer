import {isObject, isString} from "lodash-bound";
import * as colorSchemes from 'd3-scale-chromatic';

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

const colors = [...colorSchemes.schemePaired, ...colorSchemes.schemeDark2];

/**
 * Add color to the visual resources in the list that do not have color assigned yet
 * @param resources - list of resources
 * @param defaultColor - optional default color
 */
export const addColor = (resources, defaultColor) => (resources||[]).filter(e => e::isObject() && !e.color)
    .forEach((e, i) => { e.color = defaultColor || colors[i % colors.length] });

/**
 * JSON Path validator
 * @type {JSONPath}
 */
export const JSONPath = require('JSONPath');


/**
 * Extracts class name from the schema definition
 * @param spec - schema definition
 */
export const getClassName = (spec) => {
    let ref = null;
    if (spec::isString()) {
        ref = spec;
    } else {
        let refs = getRefs(spec);
        ref = refs && refs[0];
    }
    if (ref){ return ref.substr(ref.lastIndexOf("/") + 1).trim(); }
};

/**
 * Returns a list of references in the schema type specification
 * @param spec - schema definition
 * @returns {*} - list of references
 */
export const getRefs = (spec) => {
    if (!spec){ return null; }
    if (spec.$ref) { return [spec.$ref]; }
    if (spec.items) { return getRefs(spec.items); }
    let expr = spec.oneOf || spec.anyOf || spec.allOf;
    if ( expr ){
        return expr.filter(e => e.$ref).map(e => e.$ref);
    }
};








