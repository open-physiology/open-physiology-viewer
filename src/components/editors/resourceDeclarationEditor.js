import {NgModule, Component, Input, Output, EventEmitter} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatSnackBar, MatSnackBarConfig} from '@angular/material/snack-bar';

import {UberonOptionsModule} from './uberonOptionsBar';

import {$Field, getGenID} from "../../model";
import {COLORS} from "../utils/colors";

@Component({
    selector: 'resourceDeclaration',
    template: `
        <div class="resource-box">
                <div class="resource-boxContent">
                    <!--Basic properties-->
                    <div class="w3-padding w3-margin-bottom w3-border">
                        <div class="w3-margin-bottom"><b>Definition</b></div>
                        <!--ID-->
                        <mat-form-field>
                            <input matInput class="w3-input"
                                   placeholder="id"
                                   matTooltip="Identifier"
                                   [value]="resource?.id"
                                   (keyup.enter)="updateValue('id', $event.target.value)"
                                   (focusout)="updateValue('id', $event.target.value)"
                            >
                        </mat-form-field>
                        <!--Name-->
                        <mat-form-field>
                            <input matInput class="w3-input"
                                   placeholder="name"
                                   matTooltip="Name"
                                   [value]="resource?.name"
                                   (keyup.enter)="updateValue('name', $event.target.value)"
                                   (focusout)="updateValue('name', $event.target.value)"
                            >
                        </mat-form-field>
                    </div>
                    <!--Ontology terms-->
                    <div class="w3-padding w3-margin-bottom w3-border">
                        <div class="w3-margin-bottom"><b>Ontology terms</b></div>

                        <ul *ngFor="let term of resource?.ontologyTerms; let i = index; trackBy: trackByFn"
                            class="w3-ul">
                            <mat-form-field class="removable_field">
                                <input matInput class="w3-input"
                                       placeholder="ontologyTerm"
                                       matTooltip="Ontology term"
                                       [value]="term"
                                       (input)="updateOneOfMany('ontologyTerms', $event.target.value, i)"
                                >
                            </mat-form-field>
                            <button matTooltip="Remove ontologyTerm"
                                    (click)="deleteOneFromMany(term, 'ontologyTerms')"
                                    class="w3-bar-item w3-right w3-hover-light-grey">
                                <i class="fa fa-trash"></i>
                            </button>
                        </ul>
                        <button matTooltip="Add ontologyTerm" (click)="addOneToMany('ontologyTerms')"
                                class="w3-bar-item w3-right w3-hover-light-grey">
                            <i class="fa fa-add">
                            </i>
                        </button>
                        <!--UBERON terms search-->
                        <div class="w3-block">
                            <uberonSearch
                                    [content]="resource?.name"
                                    (onInclude)="addManyToMany('ontologyTerms', $event)"
                            ></uberonSearch>
                        </div>

                    </div>
                </div>
        </div>
    `,
    styles: [`
        .mat-form-field {
            width: 100%;
        }

        .removable_field {
            width: calc(100% - 48px);
        }

        .resource-box .resource-boxContent {
            padding: 0 0.625rem 0 0.625rem;
            font-size: 0.75rem;
            color: ${COLORS.inputTextColor};
            font-weight: 500;
        }
    `]
})
/**
 * The class to edit a resource field
 */
export class ResourceDeclarationEditor {
    @Input() resource;
    @Output() onValueChange = new EventEmitter();
    _snackBar;
    _snackBarConfig = new MatSnackBarConfig();

    constructor(snackBar: MatSnackBar) {
        this._snackBar = snackBar;
        this._snackBarConfig.panelClass = ['w3-panel', 'w3-orange'];
    }

    updateValue(prop, value) {
        if (prop === $Field.id) {
            if (!value) {
                let message = "Cannot assign an empty identifier";
                this._snackBar.open(message, "OK", this._snackBarConfig);
                return;
            }
        }
        if (this.resource && (this.resource[prop] !== value)) {
            let oldValue = this.resource[prop];
            this.resource[prop] = value;
            this.onValueChange.emit({prop: prop, value: value, oldValue: oldValue});
        }
    }

    updateOneOfMany(prop, value, idx) {
        if (this.resource && idx > -1) {
            this.resource[prop][idx] = value;
        }
        this.onValueChange.emit({prop: prop, value: this.resource[prop]});
    }

    deleteOneFromMany(rID, prop) {
        if (this.resource) {
            let idx = this.resource[prop].findIndex(m => m === rID);
            if (idx > -1) {
                this.resource[prop].splice(idx, 1);
            }
            this.onValueChange.emit({prop: prop, value: this.resource[prop]});
        }
    }

    addOneToMany(prop) {
        if (this.resource) {
            this.resource[prop] = this.resource[prop] || [];
            this.resource[prop].push(getGenID(this.resource.id, prop, "new", this.resource[prop].length + 1));
            this.onValueChange.emit({prop: prop, value: this.resource[prop]});
        }
    }

    addManyToMany(prop, options) {
        if (this.resource) {
            this.resource[prop] = this.resource[prop] || [];
            let changed = false;
            (options || []).forEach(option => {
                if (!this.resource[prop].find(x => x === option.id)) {
                    if (!option.disabled) {
                        this.resource[prop].push(option.id);
                        changed = true;
                    }
                }
            });
            if (changed) {
                this.onValueChange.emit({prop: prop, value: this.resource[prop]});
            }
        }
    }

    trackByFn(index, item) {
        return index;
    }
}

@NgModule({
    imports: [FormsModule, BrowserAnimationsModule, MatFormFieldModule, MatInputModule, MatTooltipModule, UberonOptionsModule],
    declarations: [ResourceDeclarationEditor],
    exports: [ResourceDeclarationEditor]
})
export class ResourceDeclarationModule {
}