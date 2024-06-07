import {NgModule, Component, Input, Output, EventEmitter, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {SearchBarModule} from "../gui/searchBar";
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatTableModule, MatTableDataSource} from '@angular/material/table';
import {MatSortModule, MatSort} from '@angular/material/sort';
import {MatPaginatorModule} from '@angular/material/paginator';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatDialogModule, MatDialog} from '@angular/material/dialog';


import {FieldEditorDialog} from './fieldEditorDialog';
import {ResourceSelectDialog} from "./resourceSelectDialog";
import {isArray, isObject, entries} from "lodash-bound";
import {getClassName, $SchemaClass} from '../../model/index';
import {printFieldValue, parseFieldValue} from "../gui/utils";
import {$SchemaType} from "../../model/utils";

@Component({
    selector: 'fieldTableEditor',
    template: `
        <table #table mat-table [dataSource]="dataSource" matSort>

            <ng-container *ngFor="let fieldName of fieldNames" [matColumnDef]="fieldName">
                <th mat-header-cell *matHeaderCellDef mat-sort-header> {{fieldName}}</th>
                <td mat-cell *matCellDef="let element; let i = index;" (click)="editResource(i, fieldName)"> {{element[fieldName]||""}}</td>
            </ng-container> 

            <!-- Actions Column -->
            <ng-container matColumnDef="actions" stickyEnd>
                <th mat-header-cell *matHeaderCellDef> 
                    <section *ngIf="!disabled">
                        <button class="w3-hover-light-grey" title="Create resource"
                                (click)="onCreateResource.emit()">
                            <i class="fa fa-plus"> </i>
                        </button>
                        <button *ngIf="_showExternal" class="w3-hover-light-grey" title="Annotate"
                                (click)="onCreateExternalResource.emit()">
                            <i class="fa fa-comment">
                            </i>
                        </button>
                    </section> 
                </th> 

                <td mat-cell *matCellDef="let element; let i = index;" class="w3-padding-small">
                    <button *ngIf="!disabled && _isFieldArray" class="w3-hover-light-grey" title="Copy resource"
                          (click)="onCreateResource.emit(_resources[i])">
                        <i class="fa fa-copy"> </i>
                    </button>
                    <button *ngIf="!disabled && !!element" title="Remove resource"
                            class="w3-hover-light-grey"
                            (click)="removeResource(i)">
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
    `]
})
/**
 * The class to edit a resource field
 */
export class FieldTableEditor {
    dialog: MatDialog;

    @ViewChild('table') table;
    @ViewChild(MatSort, {static: true}) sort: MatSort;
    _dataSource;

    //field table input parameters
    @Input() disabled = false;
    _resources;
    @Input('resources') set resources(newResources){
        this._resources = newResources;
        this._isFieldArray = newResources::isArray();
        this.dataSource = newResources;
    };

    _resourceModel;
    @Input('resourceModel') set resourceModel(newModel) {
        this._resourceModel = newModel;
        this._showExternal = this._resourceModel.schemaClsName === $SchemaClass.External;
        this.fieldNames = this._resourceModel.cudFields.filter(([key, spec]) => !spec.advanced).map(([key,]) => key);
        this.displayedColumns = [...this.fieldNames, 'actions'];
    }
    @Input() modelResources = [];

    @Output() onRemoveResource  = new EventEmitter();
    @Output() onEditResource    = new EventEmitter();
    @Output() onCreateResource  = new EventEmitter();
    @Output() onCreateExternalResource = new EventEmitter();

    constructor(dialog: MatDialog) {
        this.dialog = dialog;
    }

    set dataSource(newResources) {
        let tableContent = [];
        (newResources||[]).forEach(resource => {
                let tableRow = {};
                resource::entries().forEach(([key, value]) => tableRow[key] = printFieldValue(value));
                tableContent.push(tableRow);
            }
        );
        this._dataSource = new MatTableDataSource(tableContent);
        this._dataSource.sort = this.sort;
    }

    get dataSource(){
        return this._dataSource;
    }

    get resources(){
        return this._resources;
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

    removeResource(index){
        this.onRemoveResource.emit(index);
    }

    editResource(index, fieldName){
        let fieldValue = this.resources[index][fieldName];
        let fieldSpec = this._resourceModel.relationshipMap[fieldName];
        if (fieldSpec){
            let classNames = [getClassName(fieldSpec)];
            if (fieldName === "layers"){
                classNames.push($SchemaClass.Material);
            }
            const dialogRef = this.dialog.open(ResourceSelectDialog, {
                width: '50%',
                data: {
                    title          : `Include resource?`,
                    modelResources : this.modelResources,
                    resource       : fieldValue,
                    classNames     : classNames,
                    multiSelect    : fieldSpec.type === $SchemaType.ARRAY
                }
            });

            dialogRef.afterClosed().subscribe(result => {
                if (result !== undefined){
                    try {
                        let res = parseFieldValue(result);
                        if (res.length < 1){
                            delete this.resources[index][fieldName];
                        } else {
                            if (fieldSpec.type === $SchemaType.ARRAY){
                                this.resources[index][fieldName] = res;
                            } else {
                                this.resources[index][fieldName] = res[0];
                            }
                        }
                        this.onEditResource.emit();
                    } catch{
                        throw new Error("Cannot update the resource field: invalid value: " + result );
                    }
            }
            });

        } else {
            //property
            fieldSpec = this._resourceModel.fieldMap[fieldName];
            if (!fieldSpec) { return; }
            const dialogRef = this.dialog.open(FieldEditorDialog, {
                width: '50%',
                data: {
                    title: `Enter new value:`,
                    value: fieldValue,
                    key  : fieldName,
                    spec : fieldSpec
                }
            });

            dialogRef.afterClosed().subscribe(result => {
                if (result !== undefined) {
                    this.resources[index][fieldName] = result;
                    this.onEditResource.emit();
                }
            });
        }
    }
}

@NgModule({
    imports: [FormsModule, BrowserAnimationsModule, MatFormFieldModule, MatDialogModule, MatInputModule,
        MatTooltipModule, MatDialogModule, MatTableModule, SearchBarModule, MatSortModule, MatPaginatorModule],
    declarations: [FieldTableEditor, ResourceSelectDialog],
    entryComponents: [FieldEditorDialog, ResourceSelectDialog],
    exports: [FieldTableEditor, ResourceSelectDialog]
})
export class FieldTableEditorModule {
}