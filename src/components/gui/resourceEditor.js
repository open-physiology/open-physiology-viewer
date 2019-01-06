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
import {isPlainObject, isArray} from 'lodash-bound';

@Component({
    selector: 'resourceEditor',
    template: `
        <mat-expansion-panel [expanded]="expanded">
            <mat-expansion-panel-header>
                <mat-panel-title>
                    {{className}}: {{resource?.id || "?"}} - {{resource?.name || "?"}}
                </mat-panel-title>
            </mat-expansion-panel-header>

            <mat-card class="w3-margin w3-grey">
                <section *ngFor="let field of _propertyFields">
                    <fieldEditor
                            [value]    = "resource[field[0]]"
                            [label]    = "field[0]"
                            [spec]     = "field[1]"
                            [disabled] = "disabled"
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
                    </mat-expansion-panel-header>                  

                    <section *ngIf="isArray(resource[field[0]])">
                        <section *ngFor="let other of resource[field[0]]; let i = index">
                            {{isObject(other)? (other.id || "?" + ' - ' + other.name || "?" ) : other}}
                            <mat-action-row>
                                <button *ngIf="isObject(other)"
                                        class="w3-hover-light-grey" (click)="editResource(field, other)">
                                    <i class="fa fa-edit"></i>
                                </button>
                                <button  *ngIf="!disabled" class="w3-hover-light-grey" (click)="removeResource(field, i)">
                                    <i class="fa fa-trash"></i>
                                </button>
                            </mat-action-row>
                        </section>

                        <mat-action-row *ngIf="!disabled">
                            <button class="w3-hover-light-grey" (click)="createResource(field)">
                                <i class="fa fa-plus"></i>
                            </button>
                        </mat-action-row>
                    </section>

                </mat-expansion-panel>
            </mat-card>

        </mat-expansion-panel>
    `
})
export class ResourceEditor {
    //TODO add possibility to edit this-to-one relationships

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

    isObject(value){
        return value::isPlainObject();
    }

    isArray(value){
        return value::isArray();
    }

    updateValue([key, spec], value){
        this.resource[key] = value;
    }

    removeResource([key, spec], index){
        this.resource[key].splice(index, 1);
    }

    editResource([key, spec], model){
        let className = getClassName(spec);

        const dialogRef = this.dialog.open(ResourceEditorDialog, {
            width: '75%',
            data: {
                title       : `Update resource?`,
                resource    : model,
                className   : className,
                modelClasses: this.modelClasses,
                disabled    : this.disabled
            }
        });

        dialogRef.afterClosed().subscribe(result => {});
    }

    createResource([key, spec]) {
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
                if (!this.resource[key]){ this.resource[key] = []; }
                if (!this.resource[key].find(e => e === result.id || e.id === result.id)){
                    if (result.actionType === 'Include' && result.id){
                        this.resource[key].push(result.id); //reference to an existing resource
                    } else {
                        //New object or include an object without ID =
                        this.resource[key].push(result);
                    }
                } else {
                    //throw new Error(`The resource ${result.id} is already in the ${key} of the resource ${this.resource.id}`);
                    console.error("The selected resource is already included to the set of properties of the current resource", result, this.resource, key);
                }
            }
        });
    }
}

@NgModule({
    imports: [FormsModule, BrowserAnimationsModule, ResourceInfoModule,
        MatExpansionModule, MatDividerModule, MatFormFieldModule, MatInputModule, MatDialogModule,
        MatCheckboxModule, MatCardModule, MatRadioModule, FieldEditorModule, SearchBarModule],
    declarations: [ResourceEditor, ResourceEditorDialog],
    entryComponents: [ResourceEditorDialog],
    exports: [ResourceEditor, ResourceEditorDialog]
})
export class ResourceEditorModule {
}