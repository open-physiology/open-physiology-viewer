import {NgModule, Pipe, PipeTransform} from '@angular/core';
import {isArray, isObject} from 'lodash-bound';

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

@NgModule({
    declarations: [ObjToArray],
    exports: [ObjToArray]
})
export class UtilsModule {
}