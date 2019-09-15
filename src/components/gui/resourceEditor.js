import {NgModule, Component, Input, ViewChildren} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatExpansionModule, MatListModule, MatDividerModule, MatFormFieldModule, MatInputModule, MatTooltipModule, MatIconModule,
    MatCardModule, MatDialogModule, MatDialog, MatTabsModule, MatTableModule} from '@angular/material';
import {ResourceInfoModule} from "./resourceInfo";
import {FieldEditorModule}  from "./fieldEditor";
import {SearchBarModule} from "./searchBar";
import {ResourceEditorDialog} from "./resourceEditorDialog";
import {ResourceSelectDialog} from "./resourceSelectDialog";
import {ExternalSelectDialog} from "./externalSelectDialog";
import {UtilsModule} from "./utils";
import {isPlainObject, isArray, isString, cloneDeep, merge, values} from 'lodash-bound';
import {HttpClientModule} from '@angular/common/http';
import {getClassName} from '../../model/index';
import {annotations} from "./config";


@Component({
    selector: 'resourceEditor',
    template: `
        <mat-expansion-panel [expanded]="expanded">
            <!--Header-->
            <mat-expansion-panel-header>
                <mat-panel-title>
                    {{className}}: {{resource?.id || "?"}} - {{resource?.name || "?"}}
                </mat-panel-title>
                <mat-panel-description *ngIf="modelClasses[className]?.description">
                    {{modelClasses[className].description}}
                </mat-panel-description>

            </mat-expansion-panel-header>

            
            <!--Relationships-->
            <mat-card class="w3-margin w3-grey">
                <mat-tab-group animationDuration="0ms">
                    
                    <!--Properties-->
                    <mat-tab class="w3-margin" label="main">
                        <section *ngFor="let field of _propertyFields"> 
                            <fieldEditor
                                    [value]="resource[field[0]]"
                                    [label]="field[0]"
                                    [spec] ="field[1]"
                                    [disabled]=  "disabled"
                                    (onValueChange)="updateValue(field, $event)"
                            >
                            </fieldEditor>
                        </section>
                    </mat-tab>
                    
                    <mat-tab *ngFor="let field of _relationshipFields; let k = index;" 
                             class="w3-margin-bottom" 
                             [label]="field[0]"
                    >
                        <span [matTooltip]="field[1]?.description" class="w3-right"> 
                            <i class="fa fa-info-circle w3-left w3-padding-small"></i>
                        </span>
                        
                        <mat-card class="w3-margin w3-card">
                            <table #table mat-table [dataSource]="resource[field[0]] | objToMatTableDataSource" matSort>


                                <!--<ng-container *ngFor="let otherField of getOtherFields()" matColumnDef="otherField">-->
                                    <!--<th mat-header-cell *matHeaderCellDef> ID </th>-->
                                    <!--<td mat-cell *matCellDef="let element; let i = index;"> {{element?.id}} </td>-->
                                <!--</ng-container>-->
                                
                                <!-- ID Column -->
                                <ng-container matColumnDef="id" sticky>
                                  <th mat-header-cell *matHeaderCellDef mat-sort-header> ID </th>
                                  <td mat-cell *matCellDef="let element; let i = index;"> {{element?.id}} </td>
                                </ng-container>
                            
                                <!-- Name Column -->
                                <ng-container matColumnDef="name">
                                  <th mat-header-cell *matHeaderCellDef mat-sort-header> Name </th>
                                  <td mat-cell *matCellDef="let element; let i = index;"> {{element?.name}} </td>
                                </ng-container>
                                
                                <!-- Actions Column -->
                                <ng-container matColumnDef="actions" stickyEnd>
                                  <th mat-header-cell *matHeaderCellDef> 
                                    <section *ngIf="!disabled && (!resource[field[0]] || isArray(resource[field[0]]))">
                                        <button class="w3-hover-light-grey"  title = "Create"
                                                (click)="createRelatedResource(field, k)">
                                            <i class="fa fa-plus"></i>
                                        </button>
                                        <button class="w3-hover-light-grey"  title = "Include"
                                                (click)="createRelationship(field, k)">
                                            <i class="fa fa-search-plus">
                                            </i>
                                        </button>
                                        <button *ngIf="field[0] === 'external'" class="w3-hover-light-grey"  title = "Annotate"
                                                (click)="createExternalResource(field, k)">
                                            <i class="fa fa-comment">
                                            </i>
                                        </button>
                                    </section> 
                                  
                                  </th>
                                  
                                  <td mat-cell *matCellDef="let element; let i = index;"> 
                                    <button *ngIf="isPlainObject(element)" title = "Edit"
                                            class="w3-hover-light-grey" (click) = "editRelatedResource(field, k, i)">
                                        <i class="fa fa-edit">
                                        </i>
                                    </button>
                                    <button *ngIf="!disabled && !!element" title = "Remove"
                                            class="w3-hover-light-grey" (click) = "removeRelationship(field, k, i)">
                                        <i class="fa fa-trash">
                                        </i>
                                    </button> 
                                  </td>
                                </ng-container>
                                
                                <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
                                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

                                <!--<mat-paginator [pageSizeOptions]="[5, 10, 20]" showFirstLastButtons></mat-paginator>-->
                            </table>
       
                        </mat-card>    
                    </mat-tab>
                </mat-tab-group>    
            </mat-card>
        </mat-expansion-panel>
    `,
    styles: [`
        table {
          width: 100%;
        }
        ::ng-deep.mat-tab-label, ::ng-deep.mat-tab-label-active{
             min-width: 0!important;
             padding: 4px!important;
             margin: 4px!important;
        }
    `]
})
export class ResourceEditor {
    _className;
    _propertyFields     = [];
    _relationshipFields = [];
    dialog: MatDialog;

    /** Get handle on cmp tags in the template */
    @ViewChildren('table') tables;

    displayedColumns: string[] = ['id', 'name', 'actions'];

    @Input() expanded = false;
    @Input() modelClasses;
    @Input() modelResources;
    @Input() resource;
    @Input('className') set className(newValue) {
        this._className = newValue;
        if (this.modelClasses){
            //TODO add control to show advanced properties
            this._propertyFields     = this.modelClasses[this._className].Model.cudProperties.filter(([key, spec]) => !spec.advanced);
            this._relationshipFields = this.modelClasses[this._className].Model.cudRelationships.filter(([key, spec]) => !spec.advanced);
        }
    }
    @Input() disabled = false;
    @Input() filteredResources = [];
    @Input() filteredFieldNames = [];


    constructor(dialog: MatDialog) {
        this.dialog = dialog;
    }

    get className(){
        return this._className;
    }

    // noinspection JSMethodCanBeStatic
    isPlainObject(value){
        return value::isPlainObject();
    }

    // noinspection JSMethodCanBeStatic
    isArray(value){
        return value::isArray();
    }

    // noinspection JSMethodCanBeStatic
    getLabel(obj){
        if (obj::isString()) { return obj || "?"; }
        if (obj::isPlainObject()){
            return (obj.id || "?" ) + " - " + (obj.name || "?")
        }
    }

    getDisplayedColumns(){

    }

    /**
     * Update resource property
     * @param {string} key  - resource field
     * @param {object} spec - JSON Schema definition of the field (specifies its expected type and relevant constraints)
     * @param value - new value of the resource field (its type must match the type of the field specification)
     */
    updateValue([key, spec], value){
        this.resource[key] = value;
    }

    /**
     * Remove relationship by removing a related resource from the given field
     * @param {string} key  - resource field that points to the other resource in the relationship
     * @param {object} spec - JSON Schema definition of the field (specifies its expected type and relevant constraints)
     * @param {number} [tableIndex = -1] - index of the tab that displays the relationship table
     * @param {number} [index = 0] - index of the related resource
     */
    removeRelationship([key, spec], tableIndex = -1, index = 0){
        let id;
        if (spec.type === "array"){
            if (this.resource[key][index]::isPlainObject()){
                id = this.resource[key][index].id;
            }
            this.resource[key].splice(index, 1);
        } else {
            if (this.resource[key]::isPlainObject()){
                id = this.resource[key].id;
            }
            delete this.resource[key];
        }
        //remove object from the reference map if its definition was removed
        if (id && this.modelResources[id]) {
            delete this.modelResources[id];
        }
        if (tableIndex > -1) {
            this.tables.toArray()[tableIndex].renderRows();
        }
    }

    /**
     * Update a relationship by modifying the resource assigned to the given field
     * @param {string} key  - resource field that points to the other resource in the relationship
     * @param {object} spec - JSON Schema definition of the field (specifies its expected type and relevant constraints)
     * @param {number} [index = 0] - index of the related resource
     * @param {number} [tableIndex = -1] - index of the tab that displays the relationship table
     */
    editRelatedResource([key, spec], tableIndex = -1, index = 0){
        let obj = this.resource[key][index]::cloneDeep();
        let className = getClassName(spec);
        const dialogRef = this.dialog.open(ResourceEditorDialog, {
            width: '75%',
            data: {
                title          : `Update resource?`,
                modelClasses   : this.modelClasses,
                modelResources : this.modelResources,
                filteredResources : this.filteredResources,
                resource  : obj,
                className : className,
                disabled  : this.disabled,
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result){
                if (spec.type === "array"){
                    this.resource[key][index] = result;
                } else {
                    this.resource[key] = result;
                }
                if (tableIndex > -1) {
                    this.tables.toArray()[tableIndex].renderRows();
                }
            }
        });
    }

    /**
     * Check validity of the field
     * @param key - resource property
     * @param spec - property specification in JSON Schema
     * @param result - field's value
     * @returns {boolean} - true is the result complies with property specification constraints, false otherwise
     * @private
     */
    _validateField([key, spec], result){
        if (!result){ return false; }
        if (spec.type === "array") {
            if (!this.resource[key]){ this.resource[key] = []; }

            if (this.resource[key] && !this.resource[key]::isArray()){
                throw Error(`Cannot update an invalid model: field ${key} of the current resource should be an array!`);
            }

            let id = result.id? result.id: result;
            if (id){
                if (this.resource[key].find(e => e === id || e.id === id)) {
                    throw Error(`The resource with id "${id}" is already linked to the field "${key}" of the current resource`);
                }
            } else {
                throw Error(`Cannot link a resource with undefined ID!`);
            }
        } else {
            if (this.resource[key] && !this.resource[key]::isPlainObject()){
                throw Error(`Cannot update an invalid model: field ${key} of the current resource should be an object`);
            }
        }
        return true;
    }

    /**
     * Create a new relationship by assigning a new resource to the given field
     * @param {string} key  - resource field that points to the other resource in the relationship
     * @param {object} spec - JSON Schema definition of the field (specifies its expected type and relevant constraints)
     * @param {number} [tableIndex = -1] - index of the tab that displays the relationship table
     */
    createRelatedResource([key, spec], tableIndex = -1) {
        let className = getClassName(spec);

        const dialogRef = this.dialog.open(ResourceEditorDialog, {
            width: '75%',
            data: {
                title          : `Add new resource?`,
                modelClasses   : this.modelClasses,
                modelResources : this.modelResources,
                filteredResources : this.filteredResources,
                resource       : {},
                className      : className
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (!this._validateField([key, spec], result)){ return; }

            if (spec.type === "array"){
                this.resource[key].push(result); //add new resource object
            } else {
                this.resource[key] = result; //assign new resource object
            }

            //Add newly created resource to the global map to enable the possibility to refer to it
            if (!result["class"]){ result::merge({"class": className}); }
            this.modelResources[result.id] = result;
            if (tableIndex > -1) {
                this.tables.toArray()[tableIndex].renderRows();
            }
        })
    }

    /**
     * Create a new relationship by including a new resource to the given field
     * @param {string} key  - resource field that points to the other resource in the relationship
     * @param {object} spec - JSON Schema definition of the field (specifies its expected type and relevant constraints)
     * @param {number} [tableIndex = -1] - index of the tab that displays the relationship table
     */
    createRelationship([key, spec], tableIndex = -1) {
        let className = getClassName(spec);

        const dialogRef = this.dialog.open(ResourceSelectDialog, {
            width: '75%',
            data: {
                title          : `Include resource?`,
                modelClasses   : this.modelClasses,
                modelResources : this.modelResources,
                filteredResources : this.filteredResources.concat(this.resource[key]::isArray()? this.resource[key].map(e => e.id): []), //exclude existing resources from selection options
                resource       : {},
                className      : className
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (!this._validateField([key, spec], result)){ return; }

            console.log("Pushing:", result);

            if (spec.type === "array"){
                this.resource[key].push(result); //add ID of an existing resource
            } else {
                //TODO generate error is this contradicts previous model?
                this.resource[key] = result;  //assign ID of an existing resource
            }
            if (tableIndex > -1) {
                this.tables.toArray()[tableIndex].renderRows();
            }
        })
    }

    /**
     * Create external resource
     * @param {string} key - relationship name
     * @param {number} tableIndex - index of the tab that displays the relationship table
     */
    createExternalResource([key, ], tableIndex = -1) {
        let config = {
            title   : `Link new external resource?`
        }::merge(annotations);

        const dialogRef = this.dialog.open(ExternalSelectDialog, {
            width: '75%', data: config
        });

        //TODO use JSONata (JSON transform) to define rules for transforming response into ApiNATOMY external resource object
        dialogRef.afterClosed().subscribe(result => {
            (result||{})::values().forEach(e => {
                let resource = {
                    id    : e.curie,
                    name  : e.labels ? e.labels[0] : null,
                    uri   : e.iri,
                    type  : config.type,
                    class : "External"
                };
                if (!this.resource[key]){ this.resource[key] = []; }
                //Add newly created resource to the global map to enable the possibility to refer to it
                if (!this.modelResources[resource.id]) {
                    this.modelResources[resource.id] = resource;
                    this.resource[key].push(resource);
                } else {
                    this.resource[key].push(resource.id);
                }
                if (tableIndex > -1){
                    this.tables.toArray()[tableIndex].renderRows();
                }
            });
        })
    }
}

@NgModule({
    imports: [FormsModule, BrowserAnimationsModule, ResourceInfoModule,
        MatExpansionModule, MatListModule, MatDividerModule, MatFormFieldModule, MatInputModule, MatDialogModule, MatTooltipModule,
        MatCardModule, FieldEditorModule, SearchBarModule, UtilsModule, MatIconModule,
        HttpClientModule, MatTabsModule, MatTableModule],
    declarations: [ResourceEditor, ResourceEditorDialog, ResourceSelectDialog, ExternalSelectDialog],
    entryComponents: [ResourceEditorDialog, ResourceSelectDialog, ExternalSelectDialog],
    exports: [ResourceEditor, ResourceEditorDialog, ResourceSelectDialog, ExternalSelectDialog]
})
export class ResourceEditorModule {
}