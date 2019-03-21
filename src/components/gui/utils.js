import {Pipe, PipeTransform} from '@angular/core';
import {isArray} from 'lodash-bound';

@Pipe({name: 'objToArray'})
export class ObjToArray implements PipeTransform {
    transform(obj) {
        if (obj::isArray()) {return obj; }
        return [obj];
    }
}

