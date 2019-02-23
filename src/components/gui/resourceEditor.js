import {NgModule, Component, Input} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatExpansionModule, MatListModule, MatDividerModule, MatFormFieldModule, MatInputModule,
    MatCardModule, MatDialogModule, MatDialog} from '@angular/material';
import {ResourceInfoModule} from "./resourceInfo";
import {FieldEditorModule}  from "./fieldEditor";
import {SearchBarModule} from "./searchBar";
import {ResourceEditorDialog} from "./resourceEditorDialog";
import {ResourceSelectDialog} from "./resourceSelectDialog";
import {ExternalSelectDialog} from "./externalSelectDialog";
import {isPlainObject, isArray, isString, cloneDeep, merge, values} from 'lodash-bound';
import {ObjToArray} from './utils';
import {HttpClientModule} from '@angular/common/http';
import {getClassName} from "../../model/utils";
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

            <!--Properties-->
            <mat-card class="w3-margin w3-grey">
                <section *ngFor="let field of _propertyFields"> 
                    <fieldEditor
                            [value]="resource[field[0]]"
                            [label]="field[0]"
                            [spec]="field[1]"
                            [disabled]="disabled"
                            (onValueChange)="updateValue(field, $event)"
                    >
                    </fieldEditor>
                </section>
            </mat-card>
            
            <!--Relationships-->
            <mat-card class="w3-margin w3-grey">
                <mat-expansion-panel *ngFor="let field of _relationshipFields" class="w3-margin-bottom">
                    <mat-expansion-panel-header>
                        <mat-panel-title>
                            {{field[0]}}
                        </mat-panel-title>
                        <mat-panel-description *ngIf="field[1]?.description">
                            {{field[1].description}}
                        </mat-panel-description>
                    </mat-expansion-panel-header>

                    <section *ngFor="let other of resource[field[0]] | objToArray; let i = index">
                        {{getLabel(other)}}
                        <mat-action-row>
                            <button *ngIf="isPlainObject(other)" title = "Edit"
                                    class="w3-hover-light-grey" (click) = "editRelatedResource(field, i)">
                                <i class="fa fa-edit">
                                </i>
                            </button>
                            <button *ngIf="!disabled && !!other" title = "Remove"
                                    class="w3-hover-light-grey" (click) = "removeRelationship(field, i)">
                                <i class="fa fa-trash">
                                </i>
                            </button>
                        </mat-action-row>
                    </section>

                    <mat-action-row *ngIf="!disabled && (!resource[field[0]] || isArray(resource[field[0]]))">
                        <button class="w3-hover-light-grey"  title = "Create"
                                (click)="createRelatedResource(field)">
                            <i class="fa fa-plus"> 
                            </i>
                        </button>
                        <button class="w3-hover-light-grey"  title = "Include"
                                (click)="createRelationship(field)">
                            <i class="fa fa-search-plus">
                            </i>
                        </button>
                        <button *ngIf="field[0] === 'external'" class="w3-hover-light-grey"  title = "Annotate"
                                (click)="createExternalResource(field)">
                            <i class="fa fa-comment">
                            </i>
                        </button>

                    </mat-action-row>

                </mat-expansion-panel>
            </mat-card>
        </mat-expansion-panel>
    `
})
export class ResourceEditor {
    _className;
    _propertyFields     = [];
    _relationshipFields = [];
    dialog: MatDialog;

    @Input() expanded = false;
    @Input() modelClasses;
    @Input() modelResources;
    @Input() resource;
    @Input('className') set className(newValue) {
        this._className = newValue;
        if (this.modelClasses){
            this._propertyFields     = this.modelClasses[this._className].Model.cudProperties;
            this._relationshipFields = this.modelClasses[this._className].Model.cudRelationships;
        }
    }
    @Input() disabled = false;
    @Input() filteredResources = [];

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
     * @param {number} [index = 0] - index of the related resource
     */
    removeRelationship([key, spec], index = 0){
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
    }

    /**
     * Update a relationship by modifying the resource assigned to the given field
     * @param {string} key  - resource field that points to the other resource in the relationship
     * @param {object} spec - JSON Schema definition of the field (specifies its expected type and relevant constraints)
     * @param {number} [index = 0] - index of the related resource
     */
    editRelatedResource([key, spec], index = 0){
        let obj = this.resource[key][index]::cloneDeep();
        let className = getClassName(spec);
        const dialogRef = this.dialog.open(ResourceEditorDialog, {
            width: '75%',
            data: {
                title       : `Update resource?`,
                modelClasses: this.modelClasses,
                modelResources : this.modelResources,
                filteredResources : this.filteredResources,
                resource    : obj,
                className   : className,
                disabled    : this.disabled,
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result){
                if (spec.type === "array"){
                    this.resource[key][index] = result;
                } else {
                    this.resource[key] = result;
                }
            }
        });
    }
    
    _validateField([key, spec],result){
        if (!result){ return false; }
        if (spec.type === "array") {
            if (!this.resource[key]){ this.resource[key] = []; }

            if (this.resource[key] && !this.resource[key]::isArray()){
                throw Error(`Cannot update an invalid model: field ${key} of the current resource should be an array!`);
            }
            if (this.resource[key].find(e => e === result.id || e.id === result.id)) {
                throw Error(`The resource with id "${result.id}" is already linked to the field "${key}" of the current resource`);
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
     */
    createRelatedResource([key, spec]) {
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
        })
    }

    /**
     * Create a new relationship by including a new resource to the given field
     * @param {string} key  - resource field that points to the other resource in the relationship
     * @param {object} spec - JSON Schema definition of the field (specifies its expected type and relevant constraints)
     */
    createRelationship([key, spec]) {
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
            if (spec.type === "array"){
                this.resource[key].push(result); //add ID of an existing resource
            } else {
                this.resource[key] = result;  //assign ID of an existing resource
            }
        })
    }

    createExternalResource([key, ]) {
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
                    id  : e.curie,
                    name: e.labels ? e.labels[0] : null,
                    uri : e.iri,
                    type: config.type,
                    class: "External"
                };
                if (!this.resource[key]){ this.resource[key] = []; }
                //Add newly created resource to the global map to enable the possibility to refer to it
                if (!this.modelResources[resource.id]) {
                    this.modelResources[resource.id] = resource;
                    this.resource[key].push(resource);
                } else {
                    this.resource[key].push(resource.id);
                }
            });
        })
    }
}

@NgModule({
    imports: [FormsModule, BrowserAnimationsModule, ResourceInfoModule,
        MatExpansionModule, MatListModule, MatDividerModule, MatFormFieldModule, MatInputModule, MatDialogModule,
        MatCardModule, FieldEditorModule, SearchBarModule,
        HttpClientModule],
    declarations: [ResourceEditor, ResourceEditorDialog, ResourceSelectDialog, ExternalSelectDialog, ObjToArray],
    entryComponents: [ResourceEditorDialog, ResourceSelectDialog, ExternalSelectDialog],
    exports: [ResourceEditor, ResourceEditorDialog, ResourceSelectDialog, ExternalSelectDialog]
})
export class ResourceEditorModule {
}