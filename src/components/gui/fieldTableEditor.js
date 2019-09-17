import {NgModule, Component, Input, Output, EventEmitter, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatFormFieldModule, MatTooltipModule, MatDialogModule, MatTableModule
} from '@angular/material';
import {FieldEditorDialog} from './fieldEditorDialog';
import {isArray, isPlainObject} from "lodash-bound";

@Component({
    selector: 'fieldTableEditor',
    template: `
        <table #table mat-table [dataSource]="dataSource" matSort>

            <ng-container *ngFor="let fieldName of fieldNames" [matColumnDef]="fieldName">
                <th mat-header-cell *matHeaderCellDef mat-sort-header> {{fieldName}} </th>
                <td mat-cell *matCellDef="let element"> {{element? print(element[fieldName]): ""}} </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions" stickyEnd>
                <th mat-header-cell *matHeaderCellDef>
                    <section *ngIf="!disabled && (!dataSource || isArray(dataSource))">
                        <button class="w3-hover-light-grey"  title = "Create"
                                (click)="createRelatedResource.emit(table)">
                            <i class="fa fa-plus"></i>
                        </button>
                        <button class="w3-hover-light-grey"  title = "Include" (click)="createRelationship.emit(table)">
                            <i class="fa fa-search-plus">
                            </i>
                        </button>
                        <button *ngIf="showExternal" class="w3-hover-light-grey"  title = "Annotate" (click)="createExternalResource.emit(table)">
                            <i class="fa fa-comment">
                            </i>
                        </button>
                    </section>
                </th>

                <td mat-cell *matCellDef="let element; let i = index;">
                    <button *ngIf="isPlainObject(element)" title = "Edit" class="w3-hover-light-grey" (click) = "editRelatedResource.emit({index: i, table: table})">
                        <i class="fa fa-edit">
                        </i>
                    </button>
                    <button *ngIf="!disabled && !!element" title = "Remove" class="w3-hover-light-grey" (click) = "removeRelationship.emit({index: i, table: table})">
                        <i class="fa fa-trash">
                        </i>
                    </button>
                </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

            <!--<mat-paginator [pageSizeOptions]="[5, 10, 20]" showFirstLastButtons></mat-paginator>-->
        </table>
    `,
    styles: [`
        table {
            width: 100%;
        }
        .mat-table{
            border: 1px solid #e0e0e0;
        }
        .mat-cell {
            min-width: 40px;
            border: 1px solid #e0e0e0;
        }
    `]
})
/**
 * The class to edit a resource field
 */
export class FieldTableEditor {

    @ViewChild('table') table;

    _dataModel;

    @Input() dataSource;
    @Input() disabled = false;
    @Input() showExternal = false;
    @Input('dataModel') set dataModel(newValue) {
        this._dataModel = newValue;
        this.fieldNames =  this._dataModel.cudFields.filter(([key, spec]) => !spec.advanced).map(([key,]) => key);
        this.displayedColumns = [...this.fieldNames, 'actions'];
    }

    @Output() removeRelationship = new EventEmitter();
    @Output() editRelatedResource = new EventEmitter();
    @Output() createRelatedResource = new EventEmitter();
    @Output() createRelationship = new EventEmitter();
    @Output() createExternalResource = new EventEmitter();

    // noinspection JSMethodCanBeStatic
    print(obj){
        if (!obj) {return;}
        if (obj::isPlainObject()) {
            if (obj.id) {
                return obj.id;
            } else {
                return JSON.stringify(obj, " ", 2);
            }
        }
        if (obj::isArray()){
            return obj.map(e => this.print(e)).filter(e => !e).join(",");
        }
        return obj;
    }


    // noinspection JSMethodCanBeStatic
    isPlainObject(value){
        return value::isPlainObject();
    }

    // noinspection JSMethodCanBeStatic
    isArray(value){
        return value::isArray();
    }


}

@NgModule({
    imports: [FormsModule, BrowserAnimationsModule, MatFormFieldModule,
        MatTooltipModule, MatDialogModule, MatTableModule],
    declarations: [FieldTableEditor],
    entryComponents: [FieldEditorDialog],
    exports: [FieldTableEditor]
})
export class FieldTableEditorModule {
}