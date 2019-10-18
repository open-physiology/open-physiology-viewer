import {NgModule, Component, Input} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {
    MatExpansionModule,
    MatListModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatDialog,
    MatTabsModule,
    MatCheckboxModule
} from '@angular/material';
import {ResourceInfoModule} from "./resourceInfo";
import {FieldEditorModule} from "./fieldEditor";
import {ExternalSelectDialog} from "./externalSelectDialog";
import {UtilsModule} from "./utils";
import {isPlainObject, isArray, isString, clone, merge, values} from 'lodash-bound';
import {HttpClientModule} from '@angular/common/http';
import {getClassName} from '../../model/index';
import {annotations} from "./config";
import {FieldTableEditorModule} from "./fieldTableEditor";

@Component({
    selector: 'resourceEditor',
    template: `
        <mat-card class="w3-grey w3-padding-small">
            <mat-expansion-panel [expanded]="expanded" class="w3-padding-small">
                <!--Header-->
                <mat-expansion-panel-header>
                    <mat-panel-title class="w3-padding-small">
                        {{className}}: {{resource?.id || "?"}} - {{resource?.name || "?"}}
                    </mat-panel-title>
                </mat-expansion-panel-header>

                <!--Fields-->
                <mat-card class="w3-grey w3-padding-small">
                    <mat-tab-group animationDuration="0ms">
                        <!--Properties-->
                        <mat-tab label="main">
                            <mat-card class="w3-card w3-row">
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
                        </mat-tab>

                        <!--Relationships-->
                        <mat-tab *ngFor="let field of _relationshipFields">
                            <ng-template mat-tab-label>
                                <span [matTooltip]="field[1]?.description">
                                    {{field[0]}}                                    
                                </span>
                            </ng-template>

                            <mat-card class="w3-card">
                                <fieldTableEditor
                                        [resources]       = "resource[field[0]]"
                                        [resourceModel]   = "getFieldModel(field[1])"
                                        [modelResources]  = "modelResources"
                                        [showExternal]    = "showExternal(field[1])"
                                        [disabled]        = "disabled"
                                        (onRemoveResource)        = "removeRelationship(field, $event)"
                                        (onCreateResource)        = "createRelatedResource(field, $event)"
                                        (onCopyResource)          = "createRelatedResource(field)"
                                        (onIncludeResource)       = "createRelationship(field)"
                                        (onEditResource)          = "editRelatedResource(field, $event)"
                                        (onCreateExternalResource)= "createExternalResource(field)"
                                >
                                </fieldTableEditor>
                            </mat-card>
                        </mat-tab>
                    </mat-tab-group>
                </mat-card>

                <mat-action-row>
                    <mat-checkbox labelPosition="after" [checked]="viewMode"
                       (change)="updateViewMode($event.checked)">Show all fields</mat-checkbox>

                </mat-action-row>
            </mat-expansion-panel>
        </mat-card>
    `,
    styles: [`
        ::ng-deep.mat-tab-label, ::ng-deep.mat-tab-label-active{
             min-width: 0!important;
             padding: 4px!important;
             height: 32px!important;
        }
    `]
})
export class ResourceEditor {
    _className;
    _propertyFields     = [];
    _relationshipFields = [];
    dialog: MatDialog;

    @Input() expanded = true;
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

    updateViewMode(){
        //
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

    getFieldModel(spec){
        return this.modelClasses[getClassName(spec)].Model;
    }

    showExternal(spec){
        return getClassName(spec) === this.modelClasses.External.name;
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
     * Update a relationship by modifying the resource assigned to the given field
     * @param {string} key  - resource field that points to the other resource in the relationship
     * @param {object} spec - JSON Schema definition of the field (specifies its expected type and relevant constraints)
     * @param {number} index - index of the element to edit (use 0 if resource[key] implies one resource).
     */
    editRelatedResource([key, spec], value){
        //update value?
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

    removeRelationship([key, spec], index){
        this.resource[key].splice(index, 1);
        this.resource[key] = [...this.resource[key]];
    }

    /**
     * Add newly created resource to the global map to enable the possibility to refer to it
     * @param {string} key  - resource field that points to the other resource in the relationship
     * @param {object} spec - JSON Schema definition of the field (specifies its expected type and relevant constraints)
     * @param result
     */
    createRelatedResource([key, spec], result) {
        //TODO can be done in table now
        let className = getClassName(spec);
        this.modelResources[result.id] = result::clone()::merge({"class": className});
    }

    /**
     * Create a new relationship by including a new resource to the given field
     * @param {string} key  - resource field that points to the other resource in the relationship
     * @param {object} spec - JSON Schema definition of the field (specifies its expected type and relevant constraints)
     */
    createRelationship([key, spec]) {
    }

    /**
     * Create external resource
     * @param {string} key - relationship name
     */
    createExternalResource([key, ]) {
        const config = {title: `Link new external resource?`}::merge(annotations);
        let dialogRef = this.dialog.open(ExternalSelectDialog, {
            width: '75%', data: config
        });

        //TODO use JSONata (JSON transform) to define rules for transforming response into ApiNATOMY external resource object
        dialogRef.afterClosed().subscribe(result => {
            if (result !== undefined){
                let newResources = result::values().map(e => ({
                        id    : e.curie,
                        name  : e.labels ? e.labels[0] : null,
                        uri   : e.iri,
                        type  : config.type,
                        class : "External"
                    }));
                newResources.forEach(resource => {
                    if (!this.modelResources[resource.id]) {
                        this.modelResources[resource.id] = resource;
                    }
                });
                this.resource[key] = (this.resource[key] || []).concat(newResources);
            }
        })
    }
}

@NgModule({
    imports: [FormsModule, BrowserAnimationsModule, ResourceInfoModule, FieldTableEditorModule,
        MatExpansionModule, MatListModule, MatDividerModule, MatFormFieldModule, MatInputModule, MatDialogModule, MatTooltipModule,
        MatCardModule, FieldEditorModule, UtilsModule, MatIconModule, MatCheckboxModule,
        HttpClientModule, MatTabsModule],
    declarations: [ResourceEditor, ExternalSelectDialog],
    entryComponents: [ExternalSelectDialog],
    exports: [ResourceEditor, ExternalSelectDialog]
})
export class ResourceEditorModule {
}