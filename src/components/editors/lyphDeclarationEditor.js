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

import {COLORS} from '../utils/colors';
import {$Field} from "../../model";

@Component({
    selector: 'lyphDeclaration',
    template: `
        <resourceDeclaration
                [resource]="lyph"
                (onValueChange)="onValueChange.emit($event)"
        ></resourceDeclaration>
        <div class="resource-box">
            <div class="resource-boxContent">
                <div *ngIf="lyph?._class === 'Lyph'" class="resource-box">
                    <!--Topology-->
                    <div class="w3-padding w3-margin-bottom w3-border">
                        <div class="w3-margin-bottom"><b>Topology</b></div>
                        <div class="w3-block">
                            <mat-checkbox matTooltip="Indicates that the lyph defines layers for its subtypes"
                                          labelPosition="after"
                                          [checked]="lyph?.isTemplate"
                                          (change)="updateValue('isTemplate', $event.checked)"
                            >isTemplate?
                            </mat-checkbox>
                        </div>
                        <div class="w3-block">
                            <mat-radio-group name="topology" aria-label="Topology" [value]="currentTopology">
                                <mat-radio-button *ngFor="let option of topologyOptions" class="w3-margin-right"
                                                  [value]="option" (change)="updateValue('topology', option.id)">
                                    {{ option.name }}
                                </mat-radio-button>
                            </mat-radio-group>
                        </div>
                    </div>
                    <!--Region-->
                    <div class="w3-padding w3-margin-bottom w3-border">
                        <div><b>Region</b></div>
                        <searchAddBar
                                [searchOptions]="regionOptions"
                                [selected]="selectedRegion"
                                (selectedItemChange)="selectBySearch($event)"
                                (addSelectedItem)="replaceRegion($event)"
                        ></searchAddBar>
                        <div class="resource-boxContent">
                            <!--Search for region-->
                            <mat-form-field>
                                <input matInput class="w3-input"
                                       placeholder="hostedBy"
                                       matTooltip="Lyph or region to host the lyph"
                                       [value]="lyph?.hostedBy"
                                       (keyup.enter)="updateValue('hostedBy', $event.target.value)"
                                       (focusout)="updateValue('hostedBy', $event.target.value)"
                                >
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
export class LyphDeclarationEditor {
    _lyph;
    @Output() onValueChange = new EventEmitter();

    topologyOptions: Option[] = [
        {name: 'None', id: undefined},
        {name: 'TUBE', id: 'TUBE'},
        {name: 'BAG- (BAG)', id: 'BAG'},
        {name: 'BAG+ (BAG2)', id: 'BAG2'},
        {name: 'CYST', id: 'CYST'}
    ];

    @Input() regionOptions = [];

    @Input('lyph') set lyph(newLyph) {
        if (this._lyph !== newLyph) {
            this._lyph = newLyph;
            this.currentTopology = this.topologyOptions.find(e => e.id === newLyph?.topology) || this.topologyOptions[0];
        }
    }

    get lyph() {
        return this._lyph;
    }

    updateValue(prop, value) {
        if (this.lyph && (this.lyph[prop] !== value)) {
            let oldValue = this.lyph[prop];
            if (!value) {
                delete this.lyph[prop];
            } else {
                this.lyph[prop] = value;
            }
            this.onValueChange.emit({prop: prop, value: value, oldValue: oldValue});
        }
    }

    selectBySearch(nodeLabel) {
        if (!nodeLabel) {
            return;
        }
        this.selectedRegion = nodeLabel.substring(
            nodeLabel.lastIndexOf("(") + 1,
            nodeLabel.lastIndexOf(")")
        );
    }

    replaceRegion(value) {
        if (this.lyph) {
            let oldValue = this.lyph.hostedBy;
            this.lyph.hostedBy = value;
            this.onValueChange.emit({prop: $Field.hostedBy, value: value, oldValue: oldValue});
        }
    }
}

@NgModule({
    imports: [FormsModule, BrowserAnimationsModule, MatFormFieldModule, MatInputModule, MatTooltipModule,
        MatCheckboxModule, MatRadioModule, ResourceDeclarationModule, SearchAddBarModule],
    declarations: [LyphDeclarationEditor],
    exports: [LyphDeclarationEditor]
})
export class LyphDeclarationModule {
}