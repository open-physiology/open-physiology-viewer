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
        <section> 
            <!--Input-->  
            <mat-form-field *ngIf="_isInput" >
                <input matInput class="w3-input"                       
                       [placeholder]="label" 
                       [matTooltip]="spec.description"
                       [type]  = "_inputType"
                       [value] = "value||null"
                       [disabled] = "disabled"
                       (input) = "updateValue($event.target.value)"
                >
            </mat-form-field>
    
            <!--Check box-->
            <mat-checkbox *ngIf="_isBoolean" [matTooltip]="spec.description"
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
                    </mat-expansion-panel-header>
    
                    <section *ngIf="!!spec.properties">
                        <section *ngFor="let key of objectKeys(spec.properties)">
                            <fieldEditor 
                                    [label] = "key" 
                                    [value] = "value[key]||null" 
                                    [spec]  = "spec.properties[key]"
                                    [disabled] = "disabled"
                                    (onValueChange) = "updateProperty(key, $event)">
                            </fieldEditor>
                        </section> 
                    </section>
                    <section *ngIf="!spec.properties">
                        <section *ngFor="let key of objectKeys(value||{})">
                            <fieldEditor 
                                    [value] = "value[key]||null" 
                                    [label] = "key"
                                    [disabled] = "disabled"
                                    (onValueChange) = "updateProperty(key, $event)">
                            </fieldEditor>
                            <button *ngIf = "!disabled" class="w3-hover-light-grey" (click)="removeProperty(key)">
                                <i class="fa fa-trash"></i>
                            </button>
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
export class FieldEditor {
    _spec;
    objectKeys = Object.keys;
    dialog: MatDialog;

    @Input() expanded = false;
    @Input() label;
    @Input() value;
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
    @Input() disabled = false;

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

    removeProperty(key){
        delete this.value[key];
    }

    addProperty(){
        const spec = {
            "type": "object",
            "properties": {
                "key": {
                    "type": "string"
                },
                "value": {
                    "type": "string"
                }
            }
        };

        const dialogRef = this.dialog.open(FieldEditorDialog, {
            width: '75%',
            data: {
                title: `Add new property?`,
                value: {},
                label: this.label,
                spec: spec
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                if (!this.value){ this.value = {}; }
                this.value[result.key] = result.value;
                console.log("RESULT", this.value``);
            }
        })
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
        const dialogRef = this.dialog.open(FieldEditorDialog, {
            width: '75%',
            data: {
                title: `Create new object?`,
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
    imports: [FormsModule, BrowserAnimationsModule, MatExpansionModule,
        MatDividerModule, MatFormFieldModule, MatInputModule,
        MatCheckboxModule, MatCardModule, MatTooltipModule, MatDialogModule],
    declarations: [FieldEditor, FieldEditorDialog],
    entryComponents: [FieldEditorDialog],
    exports: [FieldEditor, FieldEditorDialog]
})
export class FieldEditorModule {
}