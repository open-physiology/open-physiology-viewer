import {NgModule, Component, Input, Output, EventEmitter} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {
    MatExpansionModule, MatDividerModule, MatFormFieldModule, MatInputModule, MatCheckboxModule,
    MatCardModule, MatTooltipModule, MatDialogModule, MatDialog
} from '@angular/material';
import {getClassName} from '../../models/utils';
import {FieldEditorDialog} from './fieldEditorDialog';

@Component({
    selector: 'fieldEditor',
    template: `
        <!--Input-->  
        <mat-form-field *ngIf="_isInput">
            <input matInput [placeholder]="label" [matTooltip]="spec.description"
                   [type]  = "_inputType"
                   [value] = "value||null"
                   (input) = "updateValue($event.target.value)"
            >
        </mat-form-field>

        <!--Check box-->
        <mat-checkbox *ngIf="_isBoolean" [matTooltip]="spec.description"
                      labelPosition="before"
                      [value]="value"
        >{{label}}
        </mat-checkbox>

        <!--Object - show fieldEditor for each property-->
        <section *ngIf="_isObject">
            <mat-expansion-panel class="w3-margin-bottom" [expanded]="expanded">
                <mat-expansion-panel-header>
                    <mat-panel-title>
                        {{label}}
                    </mat-panel-title>
                </mat-expansion-panel-header>

                <section *ngIf="!!spec.properties">
                    <section *ngFor="let key of objectKeys(spec.properties)">
                        <fieldEditor 
                                [label] = "key" 
                                [value] = "value[key]||null" 
                                [spec]  = "spec.properties[key]"
                                (onValueChange) = "updateProperty(key, $event)">
                        </fieldEditor>
                    </section> 
                </section>
                <section *ngIf="!spec.properties">
                    <section *ngFor="let key of objectKeys(value||{})">
                        <fieldEditor 
                                [value] = "value[key]||null" 
                                [label] = "key"
                                (onValueChange) = "updateProperty(key, $event)">
                        </fieldEditor>
                        <button class="w3-hover-light-grey">
                            <i class="fa fa-trash"></i>
                        </button>
                    </section>
                    <mat-action-row>
                        <!-- Add any number of key-value pairs -->
                        <button class="w3-hover-light-grey">
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
                    <mat-panel-title [matTooltip]="spec.description">
                        {{label}}
                    </mat-panel-title>
                </mat-expansion-panel-header>

                <section *ngFor="let obj of value; let i = index"> 
                    {{toJSON(obj)}}
                    <mat-action-row>
                        <button class="w3-hover-light-grey" (click)="editObj(obj)">
                            <i class="fa fa-edit"></i>
                        </button>
                        <button class="w3-hover-light-grey" (click)="removeObj(i)">
                            <i class="fa fa-trash"></i>
                        </button>
                    </mat-action-row>

                </section>

                <mat-action-row>
                    <button class="w3-hover-light-grey" (click)="addObj()">
                        <i class="fa fa-plus"></i>
                    </button>
                </mat-action-row>
            </mat-expansion-panel>
        </section>
    `
})
export class FieldEditor {
    _spec;
    objectKeys = Object.keys;
    dialog: MatDialog;

    @Input() expanded = false;
    @Input('label') label;
    @Input('value') value;
    @Input('spec') set spec(newSpec){
        this._spec = newSpec;
        if (!this._spec) {
            this._isInput = true;
            this._inputType = "text";
            return;
        }
        this._isInput = this.spec.type === "number"
            || this.spec.type === "string"
            || getClassName(this.spec) === "RGBColorScheme"
            || getClassName(this.spec) === "JSONPathScheme";
        this._isBoolean = this.spec.type === "boolean";
        this._isArray   = this.spec.type === "array";
        this._isObject  = this.spec.type === "object" ;

        this._inputType =  (this.spec.type === "string")
            ? "text"
            : this.spec.type
                ? this.spec.type
                : (getClassName(this.spec) === "RGBColorScheme")
                    ? "color"
                    : "text";
    }
    @Output() onValueChange = new EventEmitter();

    constructor(dialog: MatDialog) {
        this.dialog = dialog;
    }

    updateValue(newValue){
        this.value = newValue;
        this.onValueChange.emit(this.value);
    }

    updateProperty(key, newValue){
        this.value[key] = newValue;
        this.onValueChange.emit(this.value);
    }

    get spec(){
        return this._spec;
    }

    toJSON(item){
        return JSON.stringify(item, " ", 2);
    }

    removeObj(index){
        this.value.splice(index, 1);
    }

    editObj(obj){
        const dialogRef = this.dialog.open(FieldEditorDialog, {
            width: '75%',
            data: {
                title: `Update object?`,
                value: obj,
                label: this.label,
                spec : this.spec.items
            }
        });
        dialogRef.afterClosed().subscribe(result => {});
    }

    addObj(){
        let obj = {};

        const dialogRef = this.dialog.open(FieldEditorDialog, {
            width: '75%',
            data: {
                title: `Create new object?`,
                value: obj,
                label: this.label,
                spec: this.spec.items
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                if (!this.value){ this.value = []; }
                this.value.push(obj);
            }
        });
    }
}

@NgModule({
    imports: [FormsModule, BrowserAnimationsModule, MatExpansionModule,
        MatDividerModule, MatFormFieldModule, MatInputModule,
        MatCheckboxModule, MatCardModule, MatTooltipModule, MatDialogModule],
    declarations: [FieldEditor, FieldEditorDialog],
    entryComponents: [FieldEditorDialog],
    exports: [FieldEditor, FieldEditorDialog]
})
export class FieldEditorModule {
}