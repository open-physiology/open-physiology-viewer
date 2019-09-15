import {NgModule, Pipe, PipeTransform} from '@angular/core';
import {isArray} from 'lodash-bound';
import {MatTableModule, MatTableDataSource} from '@angular/material/table';

@Pipe({name: 'objToArray'})
export class ObjToArray implements PipeTransform {
    transform(obj) {
        if (obj::isArray()) {return obj; }
        return [obj];
    }
}

@Pipe({name: 'objToMatTableDataSource'})
export class ObjToMatTableDataSource implements PipeTransform {
    transform(obj) {
        let res = obj::isArray()? obj: [obj];
        return new MatTableDataSource(res);
    }
}

@NgModule({
    imports: [MatTableModule],
    declarations: [ObjToArray, ObjToMatTableDataSource],
    exports: [ObjToArray, ObjToMatTableDataSource]
})
export class UtilsModule {
}