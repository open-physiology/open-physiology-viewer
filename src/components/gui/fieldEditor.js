import {NgModule, Component, Input, Output, EventEmitter} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {
    MatExpansionModule, MatDividerModule, MatFormFieldModule, MatInputModule, MatCheckboxModule,
    MatCardModule, MatTooltipModule, MatDialogModule, MatDialog, MatSelectModule
} from '@angular/material';
import {getClassName, getSchemaClassModel} from '../../models/utils';
import {FieldEditorDialog} from './fieldEditorDialog';
import {clone, cloneDeep} from 'lodash-bound';
import { definitions }  from '../../data/graphScheme.json';

@Component({
    selector: 'fieldEditor',
    template: `
        <section> 
            <!--Input-->  
            <mat-form-field *ngIf="_isInput" >
                <input matInput class="w3-input"                       
                       [placeholder]="label" 
                       [matTooltip] ="spec.description"
                       [type]       = "_inputType"
                       [value]      = "value||null"
                       [disabled]   = "disabled"
                       (input)      = "updateValue($event.target.value)"
                >
            </mat-form-field>
            
            <!--Select box-->
            <mat-form-field *ngIf="_isSelect">
                <mat-select
                        [placeholder] = "label"
                        [value]       = "value"
                        (selectionChange) = "updateValue($event.value)">
                    <mat-option *ngFor="let option of _selectOptions" [value]="option" >
                        {{option}}
                    </mat-option>
                </mat-select>
            </mat-form-field>
    
            <!--Check box-->
            <mat-checkbox *ngIf="_isBoolean" [matTooltip]="spec.description" (change) = "updateValue($event.value)"
                          labelPosition="before"
                          [value]="value"
                          [disabled] = "disabled"
            >{{label}}
            </mat-checkbox> 
    
            <!--Object - show fieldEditor for each property-->
            <section *ngIf="_isObject">
                <mat-expansion-panel class="w3-margin-bottom" [expanded]="expanded">
                    <mat-expansion-panel-header>
                        <mat-panel-title>
                            {{label}}
                        </mat-panel-title>
                        <mat-panel-description *ngIf="spec?.description">
                            {{spec.description}}
                        </mat-panel-description>
                    </mat-expansion-panel-header>
    
                    <section *ngIf="!!_objectProperties">
                        <section *ngFor="let key of objectKeys(_objectProperties)">
                            <fieldEditor 
                                    [label]    = "key" 
                                    [value]    = "value?.key||getDefault(_objectProperties[key])" 
                                    [spec]     = "_objectProperties[key]"
                                    [disabled] = "disabled"
                                    (onValueChange) = "updateProperty(key, $event)">
                            </fieldEditor>
                        </section> 
                    </section>
                    <section *ngIf="!_objectProperties">
                        <section *ngFor="let key of objectKeys(value||{})">
                            {{key}}: {{value[key]}}
                            <mat-action-row>
                                <button *ngIf = "!disabled" class="w3-hover-light-grey" (click)="removeProperty(key)">
                                    <i class="fa fa-trash"></i>
                                </button>
                            </mat-action-row>
                        </section>

                        <mat-action-row>
                            <!-- Add any number of key-value pairs -->
                            <button *ngIf = "!disabled" class="w3-hover-light-grey" (click)="addProperty()">
                                <i class="fa fa-plus"></i>
                            </button>
                        </mat-action-row>
                        
                    </section>
    
                </mat-expansion-panel>
            </section>
    
            <!--Array - show fieldEditor for each item-->
            <section *ngIf="_isArray">
                <mat-expansion-panel class="w3-margin-bottom">
                    <mat-expansion-panel-header>
                        <mat-panel-title> 
                            {{label}}
                        </mat-panel-title>
                        <mat-panel-description *ngIf="spec?.description">
                            {{spec.description}}
                        </mat-panel-description>
                    </mat-expansion-panel-header>
   
                    <section *ngFor="let obj of value; let i = index"> 
                        {{toJSON(obj)}}
                        <mat-action-row>
                            <button class="w3-hover-light-grey" (click)="editObj(i)">
                                <i class="fa fa-edit"></i>
                            </button>
                            <button *ngIf = "!disabled" class="w3-hover-light-grey" (click)="removeObj(i)">
                                <i class="fa fa-trash"></i>
                            </button>
                        </mat-action-row>    
                    </section>

                    <mat-action-row *ngIf = "!disabled">
                        <button class="w3-hover-light-grey" (click)="addObj()">
                            <i class="fa fa-plus"></i>
                        </button>
                    </mat-action-row>

                </mat-expansion-panel>
            </section>
        </section>
    `,
    styles: [`        
    `]
})
/**
 * The class to edit a resource field
 */
export class FieldEditor {
    _spec;
    objectKeys = Object.keys;
    dialog: MatDialog;

    keyValueSpec = {
        "type": "object",
        "properties": {
            "key": {
                "description": "A field name that will be assigned a given value for all resources that match the query in the path",
                "type": "string"
            },
            "value": {
                "description": "",
                "type": "string"
            }
        }
    };

    @Input() expanded = false;
    @Input() label;
    @Input() value;
    @Input('spec') set spec(newSpec){
        this._spec = newSpec;
        let clsName = getClassName(this.spec);
        if (!this._spec) {
            this._isInput = true;
            this._inputType = "text";
            return;
        }
        this._isInput = this.spec.type === "number"
            || (this.spec.type === "string" && !this.spec.enum)
            || clsName === "RGBColorScheme"
            || clsName === "JSONPathScheme";
        this._isBoolean = this.spec.type === "boolean";
        this._isArray   = this.spec.type === "array";

        this._isObject  = this.spec.type === "object"
            || clsName && definitions[clsName].type === "object"; //schemas referring to objects, e.g., GroupColorScheme, OffsetScheme
        this._isSelect  = this.spec.enum
            || clsName && definitions[clsName].enum; //schemes referring to enumerations, e.g., ColorScheme

        if (this._isInput){
            this._inputType =  (this.spec.type === "string")
                ? "text"
                : this.spec.type
                    ? this.spec.type
                    : (getClassName(this.spec) === "RGBColorScheme")
                        ? "color"
                        : "text";
        }

        if (this._isObject){
            this._objectProperties = this.spec.properties;
            if (clsName) {
                this._objectProperties = getSchemaClassModel(clsName).cudProperties;
            }
        }

        if (this._isSelect){
            this._selectOptions = this.spec.enum;
            if (clsName) {
                this._selectOptions = definitions[clsName].enum;
            }
        }
    }

    @Input() disabled = false;

    @Output() onValueChange = new EventEmitter();

    constructor(dialog: MatDialog) {
        this.dialog = dialog;
    }

    get spec(){
        return this._spec;
    }

    toJSON(item){
        return JSON.stringify(item, " ", 2);
    }

    getDefault(spec){
        if (spec.default) {
            if (spec.default::isObject()){
                return spec.default::cloneDeep();
            }
            return spec.default;
        }
        if (spec.type === "array")  { return []; }
        if (spec.type === "object") { return {}; }
        if (spec.type === "string") { return ""; }
        if (spec.type === "number") { return 0; }
        return null;
    }

    /**
     * Update the value
     * @param newValue - new value
     */
    updateValue(newValue){
        this.value = newValue;
        this.onValueChange.emit(this.value);
    }

    /**
     * Update the given property of the value object
     * @param {string} key - property name
     * @param newValue - new property value
     */
    updateProperty(key, newValue){
        this.value[key] = newValue;
        this.onValueChange.emit(this.value);
    }

    /**
     * Remove the given property from the value object
     * @param {string} key - property name
     */
    removeProperty(key){
        delete this.value[key];
    }

    /**
     * Add property to the value object
     */
    addProperty(){
        const dialogRef = this.dialog.open(FieldEditorDialog, {
            width: '75%',
            data: {
                title: `Add new property?`,
                value: {},
                label: this.label,
                spec: this.keyValueSpec
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                if (!this.value){ this.value = {}; }
                this.value[result.key] = result.value;
            }
        })
    }

    /**
     * Remove an object from the value array
     * @param {number} [index = 0] - the index of an object in the array to remove
     */
    removeObj(index = 0){
        this.value.splice(index, 1);
    }

    /**
     * Edit object in the value array
     * @param index - index of the object to edit
     */
    editObj(index){
        let copyObj = this.value[index]::cloneDeep();
        const dialogRef = this.dialog.open(FieldEditorDialog, {
            width: '75%',
            data: {
                title: `Update object assigned to the resource "${this.label}" property?`,
                value: copyObj,
                label: this.label,
                spec : this.spec.items
            }
        });
        dialogRef.afterClosed().subscribe(result => {
            this.value[index] = result
        });
    }

    /**
     * Add new object to the value array
     */
    addObj(){
        const dialogRef = this.dialog.open(FieldEditorDialog, {
            width: '75%',
            data: {
                title: `Add new object to the resource "${this.label}" property?`,
                value: {},
                label: this.label,
                spec : this.spec.items
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                if (!this.value){ this.value = []; }
                this.value.push(result);
            }
        });
    }
}

@NgModule({
    imports: [FormsModule, BrowserAnimationsModule, MatExpansionModule, MatDividerModule, MatFormFieldModule, MatInputModule,
        MatCheckboxModule, MatCardModule, MatTooltipModule, MatDialogModule, MatSelectModule],
    declarations: [FieldEditor, FieldEditorDialog],
    entryComponents: [FieldEditorDialog],
    exports: [FieldEditor, FieldEditorDialog]
})
export class FieldEditorModule {
}