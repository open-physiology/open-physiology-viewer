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

@NgModule({
    imports: [MatTableModule],
    declarations: [ObjToArray],
    exports: [ObjToArray]
})
export class UtilsModule {
}