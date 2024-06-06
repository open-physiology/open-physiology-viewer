import {NgModule, Component, Input, Output, EventEmitter} from '@angular/core';
import {FormsModule, FormControl} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import {MatExpansionModule} from '@angular/material/expansion';
import {MatDividerModule} from '@angular/material/divider';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatCardModule} from '@angular/material/card';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatDialogModule, MatDialog} from '@angular/material/dialog';
import {MatSelectModule} from '@angular/material/select';
import {MatDatepickerModule,} from '@angular/material/datepicker';
import {MatNativeDateModule} from '@angular/material/core';

import {getClassName, schemaClassModels} from '../../model';
import {FieldEditorDialog} from './fieldEditorDialog';
import { cloneDeep, isObject } from 'lodash-bound';

@Component({
    selector: 'fieldEditor',
    template: `
        <section class="w3-quarter">
            <!--Input-->
            <mat-form-field *ngIf="_fieldType === FIELD_TYPES.INPUT">
                <input matInput class="w3-input"
                       [placeholder]="label"
                       [matTooltip]="spec?.description"
                       [type]="_inputType"
                       [value]="value||null"
                       [disabled]="disabled"
                       [pattern]="spec?.pattern"
                       [min]="spec?.minimum||0"
                       [max]="spec?.maximum||100"
                       [step]="0.01 * (spec?.maximum - spec?.minimum) || 1"
                       (input)="updateValue($event.target.value)"
                >
            </mat-form-field>

            <!--Select box-->
            <mat-form-field *ngIf="_fieldType === FIELD_TYPES.SELECT">
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
            <mat-checkbox *ngIf="_fieldType === FIELD_TYPES.BOOLEAN"
                          [matTooltip]="spec?.description"
                          labelPosition="before"
                          [checked]="value"
                          [disabled]="disabled"
                          (change)="updateValue($event.checked)"
            >{{label}}
            </mat-checkbox>

            <!--Datepicker-->
            <mat-form-field  *ngIf="_fieldType === FIELD_TYPES.DATE">
                <input matInput [matDatepicker]="picker" 
                       [placeholder]="label"
                       [value]="date?.value"
                       (dateInput) ="updateValue($event)" 
                       (dateChange)="updateValue($event)">
                <mat-datepicker-toggle matSuffix [for]="picker"> </mat-datepicker-toggle>
                <mat-datepicker #picker> </mat-datepicker>
            </mat-form-field>
        </section>

        <!--Object - show fieldEditor for each property-->
        <section *ngIf="_fieldType === FIELD_TYPES.OBJECT" class="w3-row">
                {{label}}
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
        </section>

        <!--Array - show fieldEditor for each item-->
        <section *ngIf="_fieldType === FIELD_TYPES.ARRAY" class="w3-row">
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
        <section *ngIf="_fieldType === FIELD_TYPES.OTHER">
            Field with unsupported format: <b>{{label}}</b>
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

    SCHEMA_TYPES = {
        STRING : "string",
        NUMBER : "number",
        BOOLEAN: "boolean",
        ARRAY  : "array",
        OBJECT : "object",
        DATE   : "date",
        COLOR  : "RGBColorScheme",
        NAMED_COLOR: "NamedColorScheme",
        PATH   : "JSONPathScheme"
    };

    FIELD_TYPES = {
        INPUT  : "input",
        BOOLEAN: "boolean",
        DATE   : "date",
        SELECT : "select",
        OBJECT : "object",
        ARRAY  : "array",
        OTHER  : "other"
    };

    INPUT_TYPES = {
        NUMBER  : "number",
        TEXT    : "text",
        COLOR   : "color"
    };

    KEY_VALUE_SPEC = {
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

        if (this._fieldType === this.FIELD_TYPES.DATE) {
            this.date = new FormControl(new Date(this.value));
        }

        if (this._fieldType === this.FIELD_TYPES.INPUT) {
            this._inputType = this.spec.type
                ? (this.spec.type === this.SCHEMA_TYPES.STRING)
                    ? this.INPUT_TYPES.TEXT
                    : this.spec.type
                : (getClassName(this.spec) === this.SCHEMA_TYPES.COLOR)
                    ? this.INPUT_TYPES.COLOR
                    : this.INPUT_TYPES.TEXT;
        }

        if (this._fieldType === this.FIELD_TYPES.OBJECT){
            this._objectProperties = clsName? schemaClassModels[clsName].propertyMap: this.spec.properties;
        }

        if (this._fieldType === this.FIELD_TYPES.SELECT){
            this._selectOptions = clsName? schemaClassModels[clsName].schema.enum: this.spec.enum;
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
        if (!spec || !spec.type) {
            return this.FIELD_TYPES.INPUT; //TODO make sure ID pattern applies
        }

        if (spec.type === this.SCHEMA_TYPES.STRING && spec.format === this.SCHEMA_TYPES.DATE){
            return this.FIELD_TYPES.DATE;
        }

        if (spec.type === this.SCHEMA_TYPES.BOOLEAN) {
            return this.FIELD_TYPES.BOOLEAN;
        }

        if (spec.type === this.SCHEMA_TYPES.ARRAY) {
            return this.FIELD_TYPES.ARRAY;
        }

        //TODO test and add editing for NAMED_COLOR
        if (spec.type && !spec.enum && [this.SCHEMA_TYPES.STRING, this.SCHEMA_TYPES.NUMBER].includes(spec.type)
            || clsName && [this.SCHEMA_TYPES.COLOR, this.SCHEMA_TYPES.PATH].includes(clsName)) {
            return this.FIELD_TYPES.INPUT;
        }

        const checkType = (spec, handler) => {
            let res = handler(spec);
            if (!res) {
                let clsName = getClassName(spec);
                if (clsName) { return checkType(schemaClassModels[clsName].schema, handler); }
            }
            return res;
        };

        const isSpecEnum = (spec) => !!spec.enum;
        if (checkType(spec, isSpecEnum)) {
            return this.FIELD_TYPES.SELECT;
        }

        const isSpecObject = (spec) => spec.type === this.SCHEMA_TYPES.OBJECT;
        if (checkType(spec, isSpecObject)) {return this.FIELD_TYPES.OBJECT; }

        return this.FIELD_TYPES.OTHER;
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

        if (fieldType === this.FIELD_TYPES.ARRAY)  { return []; }
        if (fieldType === this.FIELD_TYPES.OBJECT) { return {}; }

        return "";
    }

    /**
     * Update the value
     * @param newValue - new value
     */
    updateValue(newValue){
        if (this._inputType === this.INPUT_TYPES.NUMBER){
            this.value = parseFloat(newValue);
        } else {
            this.value = newValue;
        }
        this.onValueChange.emit(this.value);
    }

    /**
     * Update the given property of the value object
     * @param {string} key - property name
     * @param newValue - new property value
     */
    updateProperty(key, newValue){
        if (!this.value){ this.value = {}; }
        if (newValue === undefined){
            delete this.value[key];
        } else {
            this.value[key] = newValue;
        }
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
                spec : this.KEY_VALUE_SPEC
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