import {NgModule, Component, Input, Output, EventEmitter, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatFormFieldModule, MatTooltipModule, MatDialogModule, MatTableModule, MatSortModule, MatSort, MatTableDataSource,
} from '@angular/material';
import {FieldEditorDialog} from './fieldEditorDialog';
import {isArray, isObject, isString} from "lodash-bound";

@Component({
    selector: 'fieldTableEditor',
    template: `
        <table #table mat-table [dataSource]="dataSource" matSort>

            <ng-container *ngFor="let fieldName of fieldNames" [matColumnDef]="fieldName">
                <th mat-header-cell *matHeaderCellDef mat-sort-header> {{fieldName}}</th>
                <td mat-cell *matCellDef="let element"> {{printCellContent(fieldName, element)}}</td>
            </ng-container> 

            <!-- Actions Column -->
            <ng-container matColumnDef="actions" stickyEnd>
                <th mat-header-cell *matHeaderCellDef>
                    <section *ngIf="!disabled">
                        <button class="w3-hover-light-grey" title="Find and include resource reference"
                                (click)="onCreateRelationship.emit(table)">
                            <i class="fa fa-search-plus"> </i>
                        </button>
                        <button class="w3-hover-light-grey" title="Create new resource"
                                (click)="onCreateRelatedResource.emit()">
                            <i class="fa fa-plus"> </i>
                        </button>
                        <button *ngIf="showExternal" class="w3-hover-light-grey" title="Annotate"
                                (click)="onCreateExternalResource.emit()">
                            <i class="fa fa-comment">
                            </i>
                        </button>
                    </section>
                </th>

                <td mat-cell *matCellDef="let element; let i = index;" class="w3-padding-small">
                    <button *ngIf="isObject(element)" title="Edit related resource" class="w3-hover-light-grey"
                            (click)="onEditRelatedResource.emit(i)">
                        <i class="fa fa-edit">
                        </i>
                    </button>
                    <button *ngIf="!disabled && !!element" title="Delete relationship or related resource"
                            class="w3-hover-light-grey"
                            (click)="removeRelationship(i)">
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
            overflow: auto;
        }
        .mat-header-cell{
            font-weight: bold;
        }
    `]
})
/**
 * The class to edit a resource field
 */
export class FieldTableEditor {

    @ViewChild('table') table;
    @ViewChild(MatSort, {static: true}) sort: MatSort;

    _dataModel;
    _dataSource;

    @Input() disabled = false;
    @Input() showExternal = false;

    @Input('dataSource') set dataSource(newValue){
        this._dataSource = newValue;
        this._dataSource.sort = this.sort;
    };

    @Input('dataModel') set dataModel(newValue) {
        this._dataModel = newValue;
        this.fieldNames =  this._dataModel.cudFields.filter(([key, spec]) => !spec.advanced).map(([key,]) => key);
        this.displayedColumns = [...this.fieldNames, 'actions'];
    }

    @Output() onRemoveRelationship = new EventEmitter();
    @Output() onEditRelatedResource = new EventEmitter();
    @Output() onCreateRelatedResource = new EventEmitter();
    @Output() onCreateRelationship = new EventEmitter();
    @Output() onCreateExternalResource = new EventEmitter();

    get dataSource(){
        return this._dataSource;
    }

    // noinspection JSMethodCanBeStatic
    printCellContent(fieldName, rowContent){
        if (!rowContent) {return;}
        if (rowContent::isString()){ return (fieldName === "id")? rowContent: ""; }

        function printObj(cellContent){
            if (!cellContent) {return "";}
            if (cellContent::isObject()) {
                if (cellContent::isArray()){
                    return cellContent.map(e => printObj(e)).filter(e => !e).join(",");
                } else {
                    if (cellContent.id) {
                        return cellContent.id;
                    } else {
                        return JSON.stringify(cellContent, " ", 2);
                    }
                }
            }
            return cellContent;
        }
        return printObj(rowContent[fieldName]);
    }

    // noinspection JSMethodCanBeStatic
    isObject(value){
        //Important: do not use isPlainObject here as the data was put through a pipe creating new MatTableDataSource objects
        return value::isObject();
    }

    // noinspection JSMethodCanBeStatic
    isArray(value){
        return value::isArray();
    }

    removeRelationship(index){
        if (this.dataSource.data[index]::isObject()){
            //TODO We are going to delete resource definition, show warning and ask if a user wants to delete all references elswhere in the model
        }
        let el = this.dataSource.data.splice(index, 1);
        this.dataSource = new MatTableDataSource(this.dataSource.data);
        //Pass deleted element to parent in case it wants to know...
        this.onRemoveRelationship.emit(el);
    }
}

@NgModule({
    imports: [FormsModule, BrowserAnimationsModule, MatFormFieldModule,
        MatTooltipModule, MatDialogModule, MatTableModule, MatSortModule],
    declarations: [FieldTableEditor],
    entryComponents: [FieldEditorDialog],
    exports: [FieldTableEditor]
})
export class FieldTableEditorModule {
}