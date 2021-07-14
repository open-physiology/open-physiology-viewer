import {NgModule, Component, Input} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {
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
import {isArray, fromPairs, merge, values, entries, cloneDeep} from 'lodash-bound';
import {HttpClientModule} from '@angular/common/http';
import {getClassName} from '../../model/index';
import {annotations} from "../config";
import {FieldTableEditorModule} from "./fieldTableEditor";
import {$Field, $SchemaClass, $SchemaType, getNewID, getGenID} from "../../model/utils";

@Component({
    selector: 'resourceEditor',
    template: `
        <mat-card class="w3-grey w3-padding-small">
                <!--Header-->
               <mat-card class="w3-padding-small">
                    {{className}}: {{resource?.id || "?"}} - {{resource?.name || "?"}}
               </mat-card>
            
                <!--Fields-->
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
                                    [modelResources]  = "inputModelResources"
                                    [disabled]        = "disabled"
                                    (onRemoveResource)        = "removeResource(field, $event)"
                                    (onCreateResource)        = "createResource(field, $event)"
                                    (onEditResource)          = "editResource(field)"
                                    (onCreateExternalResource)= "createExternalResource(field)"
                            >
                            </fieldTableEditor>
                        </mat-card>
                    </mat-tab>
                </mat-tab-group>

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
            this._propertyFields     = this.modelClasses[this._className].Model.cudProperties.filter(([key, spec]) => !spec.advanced);
            this._relationshipFields = this.modelClasses[this._className].Model.cudRelationships.filter(([key, spec]) => !spec.advanced);
        }
    }
    @Input() disabled = false;

    constructor(dialog: MatDialog) {
        this.dialog = dialog;
        this.getData = (this.modelResources||{})::entries().filter(([id, resource]) => resource && !resource.generated)::fromPairs();
    }

    get className(){
        return this._className;
    }

    getFieldModel(spec){
        return this.modelClasses[getClassName(spec)].Model;
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
     */
    editResource([key, spec]){
        this.resource[key] = [...this.resource[key]];
    }

    removeResource([key, spec], index){
        let removedResource = this.resource[key].splice(index, 1);
        delete this.modelResources[removedResource.id];
        this.resource[key] = [...this.resource[key]];
    }

    get inputModelResources(){
        return this.getData;
    }

    /**
     * Add newly created resource to the global map to enable the possibility to refer to it
     * @param {string} key  - resource field that points to the other resource in the relationship
     * @param {object} spec - JSON Schema definition of the field (specifies its expected type and relevant constraints)
     * @param {object} fromResource - resource to copy
     */
    createResource([key, spec], fromResource) {
        let className = getClassName(spec);
        let newResource = fromResource
            ? fromResource::cloneDeep()::merge({
                [$Field.id]: getGenID(getNewID(), fromResource.id || "?"),
                [$Field.class]: className
            })
            : { [$Field.id]: getNewID(),
                [$Field.class]: className
            };
        if (spec.type === $SchemaType.ARRAY) {
            if (!this.resource[key]){ this.resource[key] = []; }
            this.resource[key].push(newResource);
            this.resource[key] = [...this.resource[key]];
        } else {
             this.resource[key] = newResource;
        }
        this.modelResources[newResource.id] = newResource;
    }

    /**
     * Create external resource
     * @param {string} key - relationship name
     */
    createExternalResource([key, ]) {
        const config = {title: `Link new external resource?`}::merge(annotations);
        let dialogRef = this.dialog.open(ExternalSelectDialog, { width: '75%', data: config });

        dialogRef.afterClosed().subscribe(result => {
            if (result !== undefined){
                let newResources = result::values().map(e => ({
                    [$Field.id]    : e[config.mapping.id],
                    [$Field.name]  : e[config.mapping.name]::isArray()? e[config.mapping.name][0]: e[config.mapping.name],
                    [$Field.uri]   : e[config.mapping.uri],
                    [$Field.type]  : config.type,
                    [$Field.class] : $SchemaClass.External,
                    [$Field.generated] : true
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
        MatListModule, MatDividerModule, MatFormFieldModule, MatInputModule, MatDialogModule, MatTooltipModule,
        MatCardModule, FieldEditorModule, UtilsModule, MatIconModule, MatCheckboxModule,
        HttpClientModule, MatTabsModule],
    declarations: [ResourceEditor, ExternalSelectDialog],
    entryComponents: [ExternalSelectDialog],
    exports: [ResourceEditor, ExternalSelectDialog]
})
export class ResourceEditorModule {
}