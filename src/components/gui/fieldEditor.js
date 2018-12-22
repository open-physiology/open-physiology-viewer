import {NgModule, Component, Input, Output, EventEmitter} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatExpansionModule, MatDividerModule, MatFormFieldModule, MatInputModule, MatCheckboxModule,
    MatCardModule, MatTooltipModule} from '@angular/material';
import {getClassName} from '../../models/resourceModel';

@Component({
    selector: 'fieldEditor',
    template: `
        <!--Input-->
        <mat-form-field *ngIf="_isInput">
            <input matInput [placeholder]="label" [matTooltip]="spec.description"
                   [type]="_inputType"
                   [value]="value">
        </mat-form-field>

        <!--Check box-->
        <mat-checkbox *ngIf="_isBoolean" [matTooltip]="spec.description"
                      labelPosition="before"
                      [value]="value"
        >{{label}}
        </mat-checkbox>

        <!--Object - show fieldEditor for each property-->
        <section *ngIf="_isObject">
            <mat-expansion-panel class="w3-margin-bottom">
                <mat-expansion-panel-header>
                    <mat-panel-title>
                        {{label}}
                    </mat-panel-title>
                </mat-expansion-panel-header>

                <section *ngIf="!!spec.properties">
                    <section *ngFor="let key of objectKeys(spec.properties)">
                        <fieldEditor [value]=value[key] [label]="key" [spec]=spec.properties[key]></fieldEditor>
                    </section>
                </section>
                <section *ngIf="!spec.properties">
                    Add key-value pairs
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

                <section *ngFor="let item of value">
                    <fieldEditor [value]="item" [label]="label" [spec]="spec.items"></fieldEditor>
                </section>

                <mat-action-row>
                    <button class="w3-hover-light-grey">
                        <i class="fa fa-plus"></i>
                    </button>
                    <button class="w3-hover-light-grey">
                        <i class="fa fa-edit"></i>
                    </button>
                    <button class="w3-hover-light-grey">
                        <i class="fa fa-trash"></i>
                    </button>
                </mat-action-row>
            </mat-expansion-panel>
        </section>
    `
})
export class FieldEditor {
    _value;
    _spec;

    objectKeys = Object.keys;

    @Input('label') label;

    @Input('spec') set spec(newSpec){
        this._spec = newSpec;
        this._isInput = this.spec.type === "number"
            || this.spec.type === "string"
            || getClassName(this.spec) === "RGBColorScheme"
            || getClassName(this.spec) === "JSONPathScheme";
        this._isBoolean = this.spec.type === "boolean";
        this._isArray   = this.spec.type === "array";
        this._isObject  = this.spec.type === "object";

        this._inputType =  (this.spec.type === "string")
            ? "text"
            : this.spec.type
                ? this.spec.type
                : (getClassName(this.spec) === "RGBColorScheme")
                    ? "color"
                    : "text";

    }

    @Input('value') set value(newValue) {
        this._value = newValue;
    }

    get value(){
        return this._value;
    }

    get spec(){
        return this._spec;
    }
}

@NgModule({
    imports: [FormsModule, BrowserAnimationsModule, MatExpansionModule,
        MatDividerModule, MatFormFieldModule, MatInputModule,
        MatCheckboxModule, MatCardModule, MatTooltipModule],
    declarations: [FieldEditor],
    exports: [FieldEditor]
})
export class FieldEditorModule {
}