import {NgModule, Component, Input, Output, EventEmitter} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatTooltipModule} from '@angular/material/tooltip';
import {ResourceDeclarationModule} from "./resourceDeclarationEditor";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatRadioModule} from "@angular/material/radio";
import {SearchAddBarModule} from "./searchAddBar";

import {COLORS} from '../gui/utils.js'
import {$Field} from "../../model";

@Component({
    selector: 'chainDeclaration',
    template: `
        <!-- ID, name, ontology terms -->
        <resourceDeclaration
                [resource]="_chain"
                (onValueChange)="onValueChange.emit($event)"
        ></resourceDeclaration>
        <div class="resource-box">
            <div class="settings-wrap">
                <div class="resource-boxContent">
                    <div *ngIf="_chain?._class === 'Chain'" class="resource-box">
                        <!-- Root and leaf -->
                          <div class="w3-padding w3-margin-bottom w3-border">
                            <div class="w3-margin-bottom"><b>Root and leaf</b></div>
                            <mat-form-field>
                                <input matInput class="w3-input"
                                       placeholder="root"
                                       matTooltip="Chain root node"
                                       [value]="chain?.root"
                                       (keyup.enter)="updateValue('root', $event.target.value)"
                                       (focusout)="updateValue('root', $event.target.value)"
                                >
                            </mat-form-field>
                            <mat-form-field>
                                <input matInput class="w3-input"
                                       placeholder="leaf"
                                       matTooltip="Chain leaf node"
                                       [value]="chain?.leaf"
                                       (keyup.enter)="updateValue('leaf', $event.target.value)"
                                       (focusout)="updateValue('leaf', $event.target.value)"
                                >
                            </mat-form-field> 
                        </div>
                        <!-- Laterals -->
                        <div class="w3-padding w3-margin-bottom w3-border">
                            <div class="w3-margin-bottom"><b>Lateral chains</b></div>
                            <mat-form-field>
                                <input matInput class="w3-input"
                                       placeholder="Lateral prefix"
                                       matTooltip="Lateral chain name prefix"
                                       [(ngModel)]="prefix"
                                     >
                            </mat-form-field>
                            <button (click)="onCreateLateral.emit(prefix)"
                                    matTooltip="Create a lateral chain"
                                    class="w3-right w3-hover-light-grey">
                                <i class="fa fa-add">
                                </i>
                            </button>
                        </div>
                        <!-- Positioning - wiredTo -->
                        <div class="w3-padding w3-margin-bottom w3-border">
                            <div class="w3-margin-bottom"><b>Wire</b></div>
                            <searchAddBar
                                    [searchOptions]="wireOptions"
                                    [selected]="selectedWire"
                                    (selectedItemChange)="selectBySearch($event)"
                                    (addSelectedItem)="replaceWire($event)"
                            ></searchAddBar>
                            <mat-form-field>
                                <input matInput class="w3-input"
                                       placeholder="wiredTo"
                                       matTooltip="Wire to direct the chain"
                                       [value]="chain?.wiredTo"
                                       (keyup.enter)="updateValue('wiredTo', $event.target.value)"
                                       (focusout)="updateValue('wiredTo', $event.target.value)"                                >
                            </mat-form-field>
                        </div>                      
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .mat-form-field {
            width: 100%;
        }

        .settings-wrap {
            padding-bottom: 0.8rem;
            margin-top: 0;
            position: relative;
        }

        .resource-box .resource-boxContent {
            padding: 0.625rem;
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
    `]
})
/**
 * The class to edit a resource field
 */
export class ChainDeclarationEditor {
    prefix = "left";
    _chain;
    @Output() onValueChange = new EventEmitter();

    @Output() onCreateLateral = new EventEmitter();

    @Input('lyph') set chain(newChain) {
        if (this._chain !== newChain) {
            this._chain = newChain;
        }
    }

    @Input() wireOptions;

    get chain() {
        return this._chain;
    }

    updateValue(prop, value) {
        if (this.chain && (this.chain[prop] !== value)) {
            let oldValue = this.chain[prop];
            if (!value) {
                delete this.chain[prop];
            } else {
                this.chain[prop] = value;
            }
            this.onValueChange.emit({prop: prop, value: value, oldValue: oldValue});
        }
    }

    selectBySearch(nodeLabel) {
        this.selectedWire = nodeLabel.substring(
            nodeLabel.indexOf("(") + 1,
            nodeLabel.lastIndexOf(")")
        );
    }

    replaceWire(value) {
        if (this.chain) {
            let oldValue = this.chain.wiredTo;
            this.chain.wiredTo = value;
            this.onValueChange.emit({prop: $Field.wiredTo, value: value, oldValue: oldValue});
        }
    }

    updatePrefix(value){
        this.prefix = value;
    }
}

@NgModule({
    imports: [FormsModule, BrowserAnimationsModule, MatFormFieldModule, MatInputModule, MatTooltipModule,
        MatCheckboxModule, MatRadioModule, ResourceDeclarationModule, SearchAddBarModule],
    declarations: [ChainDeclarationEditor],
    exports: [ChainDeclarationEditor]
})
export class ChainDeclarationModule {
}