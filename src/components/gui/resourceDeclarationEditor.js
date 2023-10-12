import {NgModule, Component, Input, Output, EventEmitter} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {COLORS} from "./utils";
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatTooltipModule} from '@angular/material/tooltip';
import {$Field} from "../../model";

@Component({
    selector: 'resourceDeclaration',
    template: `
        <div class="resource-box">
            <div class="settings-wrap">
                <div class="resource-boxContent">
                    <mat-form-field>
                        <input matInput class="w3-input"
                               placeholder="id"
                               matTooltip="Identifier"
                               [value]="resource?.id"
                               (keyup.enter)="updateValue('id', $event.target.value)"
                        >
                    </mat-form-field>

                    <mat-form-field>
                        <input matInput class="w3-input"
                               placeholder="name"
                               matTooltip="Name"
                               [value]="resource?.name"
                               (keyup.enter)="updateValue('name', $event.target.value)"
                        >
                    </mat-form-field>

                    <ul *ngFor="let term of resource?.ontologyTerms; let i = index; trackBy: trackByFn" class="w3-ul">
                        <mat-form-field class="removable_field">
                            <input matInput class="w3-input"
                                   placeholder="ontologyTerm"
                                   matTooltip="Ontology term"
                                   [value]="term"
                                   (input)="updateOneOfMany('ontologyTerms', $event.target.value, i)"
                            >
                        </mat-form-field>
                        <button mat-menu-item matTooltip="Remove ontologyTerm"
                                (click)="deleteOneFromMany(term, 'ontologyTerms')" class="w3-right w3-hover-light-grey">
                            <i class="fa fa-trash"></i>
                        </button>
                    </ul>
                    <button mat-menu-item matTooltip="Add ontologyTerm" (click)="addOneToMany('ontologyTerms')"
                            class="w3-right w3-hover-light-grey">
                        <i class="fa fa-add">
                        </i>
                    </button>
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

        .settings-wrap {
            padding-bottom: 0.8rem;
            margin-top: 0;
            position: relative;
        }

        .resource-box .resource-boxContent {
            padding: 1.067rem;
            font-size: 0.75rem;
            color: ${COLORS.inputTextColor};
            font-weight: 500;
        }

        .resource-box .resource-boxContent button {
            border: ${COLORS.inputBorderColor} 1px solid;
            background: transparent;
            color: ${COLORS.inputTextColor};
            font-size: 0.75rem;
            font-weight: 500;
            padding: 0.313rem 0.625rem;
            margin: 0.625rem 0 0;
            cursor: pointer;
        }

        .resource-box .resource-boxContent button img {
            position: relative;
            top: -2px;
        }

        .resource-box .resource-boxContent button:hover {
            background: transparent !important;
            color: ${COLORS.inputTextColor} !important;
        }
    `]
})
/**
 * The class to edit a resource field
 */
export class ResourceDeclarationEditor {
    @Input() resource;
    @Output() onValueChange = new EventEmitter();

    updateValue(prop, value) {
        if (prop === $Field.id) {
            //NK TODO Validate by schema that it is correct
        }
        let oldValue = this.resource[prop];
        if (this.resource) {
            this.resource[prop] = value;
        }
        this.onValueChange.emit({prop: prop, value: value, oldValue: oldValue});
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
            this.resource[prop].push(this.resource.id + "_" + prop + "_new_" + (this.resource[prop].length + 1));
            this.onValueChange.emit({prop: prop, value: this.resource[prop]});
        }
    }

    trackByFn(index, item) {
        return index;
    }
}

@NgModule({
    imports: [FormsModule, BrowserAnimationsModule, MatFormFieldModule, MatInputModule, MatTooltipModule],
    declarations: [ResourceDeclarationEditor],
    exports: [ResourceDeclarationEditor]
})
export class ResourceDeclarationModule {
}