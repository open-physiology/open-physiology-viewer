import {NgModule, Component, Input, Output, EventEmitter, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {SearchBarModule} from "./searchBar";
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {
    MatFormFieldModule, MatTooltipModule, MatDialogModule, MatTableModule, MatSortModule, MatSort, MatTableDataSource,
    MatButtonToggleModule, MatPaginatorModule, MatDialog, MatInputModule
} from '@angular/material';
import {FieldEditorDialog} from './fieldEditorDialog';
import {ResourceSelectDialog} from "./resourceSelectDialog";
import {isArray, isObject, isString, keys, cloneDeep} from "lodash-bound";
import {getNewID} from "../../model/utils";
import {getClassName} from '../../model/index';


@Component({
    selector: 'fieldTableEditor',
    template: `

        <mat-button-toggle-group name="displayMode" aria-label="Display mode" class="w3-right">
            <mat-button-toggle value="basic"><i class="fa fa-filter"> </i></mat-button-toggle>
            <mat-button-toggle value="all"><i class="fa fa-list"> </i></mat-button-toggle>
        </mat-button-toggle-group>

        <table #table mat-table [dataSource]="dataSource" matSort>

            <ng-container *ngFor="let fieldName of fieldNames" [matColumnDef]="fieldName">
                <th mat-header-cell *matHeaderCellDef mat-sort-header> {{fieldName}}</th>
                <td mat-cell *matCellDef="let element; let i = index;" (click)="editResource(i, element, fieldName)"> {{element[fieldName]||""}}</td>
            </ng-container> 

            <!-- Actions Column -->
            <ng-container matColumnDef="actions" stickyEnd>
                <th mat-header-cell *matHeaderCellDef> 
                    <section *ngIf="!disabled">
                        <button class="w3-hover-light-grey" title="Create resource"
                                (click)="createResource()">
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
                    <button *ngIf="!disabled && _isFieldArray" class="w3-hover-light-grey" title="Copy resource"
                          (click)="copyResource(i)">
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

    //field table view parameters
    _mode = 'BASIC';
    _dataSource;

    //field table input parameters
    @Input() disabled = false;
    @Input() showExternal = false;
    _resources;
    @Input('resources') set resources(newResources){
        this._resources = newResources;
        this._isFieldArray = newResources::isArray();
        this.dataSource = newResources;
    };

    _resourceModel;
    @Input('resourceModel') set resourceModel(newModel) {
        this._resourceModel = newModel;
        this.fieldNames = this._resourceModel.cudFields.filter(([key, spec]) => !spec.advanced).map(([key,]) => key);
        this.displayedColumns = [...this.fieldNames, 'actions'];
    }
    @Input() modelResources = [];

    //filter(([key, spec]) => !spec.advanced)

    @Output() onRemoveResource  = new EventEmitter();
    @Output() onEditResource    = new EventEmitter();
    @Output() onCreateResource  = new EventEmitter();
    @Output() onCopyResource    = new EventEmitter();
    @Output() onIncludeResource = new EventEmitter();
    @Output() onCreateExternalResource = new EventEmitter();

    constructor(dialog: MatDialog) {
        this.dialog = dialog;
    }

    set dataSource(newResources){
        if (!newResources){ return;}
        let tableContent = newResources::cloneDeep();
        tableContent.forEach(resource => resource::keys().forEach(key => resource[key] = this.printCellContent(key, resource)));
        this._dataSource = new MatTableDataSource(tableContent);
        this._dataSource.sort = this.sort;
    }

    printCellContent(fieldName, rowContent){
        if (!rowContent) {return "";}
        if (rowContent::isString()){ return (fieldName === "id")? rowContent: ""; }

        function printObj(cellContent){
            if (!cellContent) {return}
            if (cellContent::isArray()){
                return cellContent.map(e => printObj(e)).filter(e => !!e).join(",");
            } else {
                if (cellContent::isObject()) {
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

    createResource(){
        let newEl = {id: getNewID()};
        if (!this._resources) { this._resources = []}
        this._resources.push(newEl);
        this.resources = [...this.resources];
        this.onCreateResource.emit(newEl);
    }

    removeResource(index){
        let el = this._resources.splice(index, 1);
        this.dataSource = this._resources;
        this.onRemoveResource.emit(el);
    }

    //TODO replace with ResourceType::clone() operations to properly clone objects
    copyResource(index){
        let el = this._resources[index];
        let newEl = el::cloneDeep();
        newEl.id = getNewID() + " - copy of " + el.id || "?";
        this.resources.push(newEl);
        this.resources = [...this.resources];
        this.onCreateResource.emit(newEl);
    }

    editResource(index, element, fieldName){
        let fieldValue = element[fieldName];
        let fieldSpec = this._resourceModel.relationshipMap[fieldName];
        if (fieldSpec){
            //resource selection
            let className = getClassName(fieldSpec);
            const dialogRef = this.dialog.open(ResourceSelectDialog, {
                width: '25%',
                data: {
                    title          : `Include resource?`,
                    modelResources : this.modelResources,
                    filteredResources : [],
                    //this.filteredResources.concat(this.resource[key]::isArray()? this.resource[key].map(e => e.id): []), //exclude existing resources from selection options
                    resource       : {},
                    className      : className
                }
            });

            dialogRef.afterClosed().subscribe(result => {
                //if (!this._validateField([key, spec], result)){ return; }
                if (fieldSpec.type === "array"){
                    this.resources[index][fieldName].push(result);
                } else {
                    this.resources[index][fieldName] = result;
                }
                this.resources = [...this.resources];
            })
            //this.onIncludeResource.emit()

        } else {
            //property
            fieldSpec = this._resourceModel.fieldMap[fieldName];
            if (!fieldSpec) { return; }
            const dialogRef = this.dialog.open(FieldEditorDialog, {
                width: '25%',
                data: {
                    title: `Enter new value:`,
                    value: fieldValue,
                    label: fieldName,
                    spec : fieldSpec
                }
            });

            dialogRef.afterClosed().subscribe(result => {
                if (result) {
                    this.resources[index][fieldName] = result;
                    this.resources = [...this.resources];
                    this.onEditResource.emit(element);
                }
            });
        }
    }
}

@NgModule({
    imports: [FormsModule, BrowserAnimationsModule, MatFormFieldModule, MatDialogModule, MatInputModule,
        MatTooltipModule, MatDialogModule, MatTableModule, SearchBarModule, MatSortModule, MatButtonToggleModule, MatPaginatorModule],
    declarations: [FieldTableEditor, ResourceSelectDialog],
    entryComponents: [FieldEditorDialog, ResourceSelectDialog],
    exports: [FieldTableEditor, ResourceSelectDialog]
})
export class FieldTableEditorModule {
}