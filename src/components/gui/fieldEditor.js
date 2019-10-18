import {NgModule, Component, Input, Output, EventEmitter} from '@angular/core';
import {FormsModule, FormControl} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {
    MatExpansionModule, MatDividerModule, MatFormFieldModule, MatInputModule, MatCheckboxModule,
    MatCardModule, MatTooltipModule, MatDialogModule, MatDialog, MatSelectModule, MatDatepickerModule, MatNativeDateModule
} from '@angular/material';
import {getClassName, schemaClassModels} from '../../model/index.js';
import {FieldEditorDialog} from './fieldEditorDialog';
import { cloneDeep, isObject} from 'lodash-bound';

@Component({
    selector: 'fieldEditor',
    template: `
        <section class="w3-quarter">
            <!--Input-->
            <mat-form-field *ngIf="_fieldType === 'input'">
                <input matInput class="w3-input"
                       [placeholder]="label"
                       [matTooltip]="spec?.description"
                       [type]="_inputType"
                       [value]="value||null"
                       [disabled]="disabled"
                       [min]="spec?.minimum||0"
                       [max]="spec?.maximum||100"
                       [step]="0.01 * (spec?.maximum - spec?.minimum) || 1"
                       (input)="updateValue($event.target.value)"
                >
            </mat-form-field>

            <!--Select box-->
            <mat-form-field *ngIf="_fieldType === 'select'">
                <mat-select
                        [placeholder]="label"
                        [value]="value"
                        [matTooltip]="spec?.description"
                        (selectionChange)="updateValue($event.value)">
                    <mat-option *ngFor="let option of _selectOptions" [value]="option">
                        {{option}}
                    </mat-option>
                </mat-select>
            </mat-form-field>

            <!--Check box-->
            <mat-checkbox *ngIf="_fieldType === 'boolean'"
                          [matTooltip]="spec?.description"
                          labelPosition="before"
                          [checked]="value"
                          [disabled]="disabled"
                          (change)="updateValue($event.checked)"
            >{{label}}
            </mat-checkbox>

            <!--Datepicker-->
            <mat-form-field  *ngIf="_fieldType === 'date'">
                <input matInput [matDatepicker]="picker" 
                       [placeholder]="label"
                       [value]="date?.value"
                       (dateInput)="updateValue($event)" (dateChange)="updateValue($event)">
                <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
                <mat-datepicker #picker></mat-datepicker>
            </mat-form-field>
        </section>

        <!--Object - show fieldEditor for each property-->
        <section *ngIf="_fieldType === 'object'" class="w3-row">
            <mat-expansion-panel class="w3-margin-bottom" [expanded]="expanded">
                <mat-expansion-panel-header>
                    <mat-panel-title>
                        {{label}}
                    </mat-panel-title>
                    <!--<mat-panel-description *ngIf="spec?.description">-->
                        <!--{{spec.description}}-->
                    <!--</mat-panel-description>-->
                </mat-expansion-panel-header>

                <section *ngIf="!!_objectProperties">
                    <section *ngFor="let key of objectKeys(_objectProperties)">
                        <fieldEditor
                                [label]="key"
                                [value]="value? value[key]: getDefault(_objectProperties[key])"
                                [spec]="_objectProperties[key]"
                                [disabled]="disabled"
                                (onValueChange)="updateProperty(key, $event)">
                        </fieldEditor>
                    </section>
                </section>
                <section *ngIf="!_objectProperties">
                    <section *ngFor="let key of objectKeys(value||{})">
                        {{key}}: {{value ? value[key] : ""}}
                        <mat-action-row>
                            <button *ngIf="!disabled" class="w3-hover-light-grey" (click)="removeProperty(key)">
                                <i class="fa fa-trash"> </i>
                            </button>
                        </mat-action-row>
                    </section>

                    <mat-action-row>
                        <!-- Add any number of key-value pairs -->
                        <button *ngIf="!disabled" class="w3-hover-light-grey" (click)="addProperty()">
                            <i class="fa fa-plus"> </i>
                        </button>
                    </mat-action-row>
                </section>
            </mat-expansion-panel>
        </section>

        <!--Array - show fieldEditor for each item-->
        <section *ngIf="_fieldType === 'array'" class="w3-row">
            <mat-expansion-panel class="w3-margin-bottom">
                <mat-expansion-panel-header>
                    <mat-panel-title>
                        {{label}}
                    </mat-panel-title>
                    <!--<mat-panel-description *ngIf="spec.description">-->
                        <!--{{spec.description}}-->
                    <!--</mat-panel-description>-->
                </mat-expansion-panel-header>

                <section *ngFor="let obj of value; let i = index">
                    {{print(obj, " ", 2)}}
                    <mat-action-row>
                        <button class="w3-hover-light-grey" (click)="editObj(i)">
                            <i class="fa fa-edit"> </i>
                        </button>
                        <button *ngIf="!disabled" class="w3-hover-light-grey" (click)="removeObj(i)">
                            <i class="fa fa-trash"> </i>
                        </button>
                    </mat-action-row>
                </section>

                <mat-action-row *ngIf="!disabled">
                    <button class="w3-hover-light-grey" (click)="addObj()">
                        <i class="fa fa-plus"> </i>
                    </button>
                </mat-action-row>

            </mat-expansion-panel>
        </section>

        <!--Other-->
        <section *ngIf="_fieldType === 'other'">
            Unsupported field: <b>{{label}}</b>
        </section>

    `
})
/**
 * The class to edit a resource field
 */
export class FieldEditor {
    _spec;
    _value;
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
                "description": "A value that will be assigned to the field names above for all resources that match the query in the path",
                "type": "string"
            }
        }
    };

    _fieldType = "input";

    @Input() expanded = false;
    @Input() label;
    @Input('value') set value(newValue){
        this._value = newValue;
    };

    @Input('spec') set spec(newSpec){
        this._spec = newSpec;
        let clsName = getClassName(this._spec);
        this._fieldType = this.getFieldType(clsName, this._spec);

        if (this._fieldType === "date") {
            this.date = new FormControl(new Date(this.value));
        }

        if (this._fieldType === "input") {
            this._inputType =  (this.spec.type === "string")
                ? "text"
                : this.spec.type
                    ? this.spec.type
                    : (getClassName(this.spec) === "RGBColorScheme")
                        ? "color"
                        : "text";
        }

        if (this._fieldType === "object"){
            this._objectProperties = this.spec.properties;
            if (clsName) {
                this._objectProperties = schemaClassModels[clsName].propertyMap;
            }
        }

        if (this._fieldType === "select"){
            this._selectOptions = this.spec.enum;
            if (clsName) {
                this._selectOptions = schemaClassModels[clsName].schema.enum;
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

    get value(){
        return this._value;
    }

    print = JSON.stringify;

    /**
     * Defines type of the field
     * @param clsName - schema type name
     * @param spec - schema property specification
     * @returns {string} string that describes the schema field type: 'input', 'select', 'array', 'object', or 'other'
     */
    getFieldType(clsName, spec){
        if (!spec) { return "input"; }

        if (spec.type === "string" && spec.format === 'date'){
            return spec.format;
        }

        if (spec.type === "boolean" || spec.type === "array") {
            return spec.type;
        }

        if ((spec.type === "number" || spec.type === "string") && !spec.enum
            || clsName === "RGBColorScheme"
            || clsName === "JSONPathScheme") {
            return "input";
        }

        const checkType = (spec, handler) => {
            let res = handler(spec);
            if (!res) {
                let clsName = getClassName(spec);
                if (clsName) { return checkType(schemaClassModels[clsName].schema, handler); }
            }
            return res;
        };

        const isSpecEnum   = (spec) => spec.enum;
        if (checkType(spec, isSpecEnum)) {return "select"; }

        const isSpecObject = (spec) => spec.type === "object";
        if (checkType(spec, isSpecObject)) {return "object"; }

        return "other";
    }

    // noinspection JSMethodCanBeStatic
    getDefault(spec){
        if (spec.default) {
            if (spec.default::isObject()){
                return spec.default::cloneDeep();
            }
            return spec.default;
        }

        let clsName = getClassName(spec);
        let fieldType = this.getFieldType(clsName, spec);
        if (fieldType === "array")  { return []; }
        if (fieldType === "object") { return {}; }

        return "";
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
        //TODO fix type 'layout'
        if (!this.value){ this.value = {}; }
        this.value[key] = newValue;
        this.onValueChange.emit(this.value);
    }

    /**
     * Remove the given property from the value object
     * @param {string} key - property name
     */
    removeProperty(key){
        delete this.value[key];
        this.onValueChange.emit(this.value);
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
                spec : this.keyValueSpec
            }
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result !== undefined) {
                this.value[result.key] = result.value;
                this.onValueChange.emit(this.value);
            }
        })
    }

    /**
     * Remove an object from the value array
     * @param {number} [index = 0] - the index of an object in the array to remove
     */
    removeObj(index = 0){
        this.value.splice(index, 1);
        this.onValueChange.emit(this.value);
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
            if (result !== undefined){
                this.value[index] = result;
                this.onValueChange.emit(this.value);
            }
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
            if (result !== undefined) {
                if (!this.value) {this.value = [];}
                this.value.push(result);
                this.onValueChange.emit(this.value);
            }
        });
    }
}

@NgModule({
    imports: [FormsModule, BrowserAnimationsModule, MatExpansionModule, MatDividerModule, MatFormFieldModule, MatInputModule,
        MatCheckboxModule, MatCardModule, MatTooltipModule, MatDialogModule, MatSelectModule, MatDatepickerModule,
        MatNativeDateModule],
    declarations: [FieldEditor, FieldEditorDialog],
    providers:[MatDatepickerModule],
    entryComponents: [FieldEditorDialog],
    exports: [FieldEditor, FieldEditorDialog]
})
export class FieldEditorModule {
}