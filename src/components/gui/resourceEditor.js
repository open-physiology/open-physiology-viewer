import {NgModule, Component, Input} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatExpansionModule, MatDividerModule, MatFormFieldModule, MatInputModule, MatCheckboxModule,
    MatCardModule, MatDialogModule, MatDialog, MatRadioModule} from '@angular/material';
import {ResourceInfoModule} from "./resourceInfo";
import {FieldEditorModule}  from "./fieldEditor";
import {SearchBarModule} from "./searchBar";
import {ResourceEditorDialog} from "./resourceEditorDialog";
import {getClassName} from "../../models/utils";
import {isPlainObject, isArray, isString, cloneDeep} from 'lodash-bound';
import { ObjToArray } from './utils';

@Component({
    selector: 'resourceEditor',
    template: `
        <mat-expansion-panel [expanded]="expanded">
            <mat-expansion-panel-header>
                <mat-panel-title>
                    {{className}}: {{resource?.id || "?"}} - {{resource?.name || "?"}}
                </mat-panel-title>
                <mat-panel-description *ngIf="modelClasses[className]?.description">
                    {{modelClasses[className].description}}
                </mat-panel-description>

            </mat-expansion-panel-header>

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
                            <button *ngIf="isPlainObject(other)"
                                    class="w3-hover-light-grey" (click)="editRelatedResource(field, i)">
                                <i class="fa fa-edit">
                                </i>
                            </button>
                            <button *ngIf="!disabled && !!other"
                                    class="w3-hover-light-grey" (click)="removeRelationship(field, i)">
                                <i class="fa fa-trash">
                                </i>
                            </button>
                        </mat-action-row>
                    </section>

                    <mat-action-row *ngIf="!disabled && (!resource[field[0]] || isArray(resource[field[0]]))">
                        <button class="w3-hover-light-grey" (click)="createRelationship(field)">
                            <i class="fa fa-plus"> 
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
        if (spec.type === "array"){
            this.resource[key].splice(index, 1);
        } else {
            if (this.resource[key]::isPlainObject()){
                delete this.modelResources[this.resource.id];
            }
            delete this.resource[key];
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
                resource    : obj,
                className   : className,
                modelClasses: this.modelClasses,
                disabled    : this.disabled
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            this.resource[key][index] = result;
            // if (this.modelResources[result.id]){
            //     this.modelResources[result.id].JSON = result;
            // }
        });
    }

    /**
     * Create a new relationship by including or assigning a new resource to the given field
     * @param {string} key  - resource field that points to the other resource in the relationship
     * @param {object} spec - JSON Schema definition of the field (specifies its expected type and relevant constraints)
     */
    createRelationship([key, spec]) {
        let className = getClassName(spec);

        const dialogRef = this.dialog.open(ResourceEditorDialog, {
            width: '75%',
            data: {
                title          : `Add new resource?`,
                actionType     : 'Create',
                resource       : {},
                className      : className,
                modelClasses   : this.modelClasses,
                modelResources : this.modelResources
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                if (spec.type === "array") {
                    if (this.resource[key] && !this.resource[key]::isArray()){
                        console.error(`Cannot update an invalid model: field ${key} of the given resource should be an array`, this.resource);
                        return;
                    }
                    if (this.resource[key].find(e => e === result.id || e.id === result.id)) {
                        console.error("The selected resource is already included to the set of properties of the current resource", result, this.resource, key);
                        return;
                    }
                } else {
                    if (this.resource[key] && !this.resource[key]::isPlainObject()){
                        console.error(`Cannot update an invalid model: field ${key} of the given resource should be an object`, this.resource);
                        return;
                    }
                }

                let id;
                if (result.actionType === 'Include'){
                    id = result.id? result.id: result;
                    if (!id){
                        console.error("Cannot refer to a resource without ID", result, this.resource, key);
                        return;
                    }
                }

                if (spec.type === "array"){
                    //Update array
                    if (!this.resource[key]){ this.resource[key] = []; }
                    if (result.actionType === 'Include'){
                       this.resource[key].push(id); //add ID of an existing resource
                   } else {
                       this.resource[key].push(result); //add new resource object
                   }
                } else {
                    //Update object
                   if (result.actionType === 'Include'){
                       this.resource[key] = id; //assign ID of an existing resource
                   } else {
                       this.resource[key] = result; //assign new resource object
                   }
                }
                // if (this.modelResources[result.id]){
                //     this.modelResources[result.id].JSON = result;
                // }
            }
        });
    }
}

@NgModule({
    imports: [FormsModule, BrowserAnimationsModule, ResourceInfoModule,
        MatExpansionModule, MatDividerModule, MatFormFieldModule, MatInputModule, MatDialogModule,
        MatCheckboxModule, MatCardModule, MatRadioModule, FieldEditorModule, SearchBarModule],
    declarations: [ResourceEditor, ResourceEditorDialog, ObjToArray],
    entryComponents: [ResourceEditorDialog],
    exports: [ResourceEditor, ResourceEditorDialog]
})
export class ResourceEditorModule {
}