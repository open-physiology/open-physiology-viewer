import {NgModule, Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatSliderModule} from '@angular/material/slider'
import {MatCheckboxModule} from '@angular/material/checkbox'
import {MatRadioModule} from '@angular/material/radio'
import {keys} from 'lodash-bound';
import {SearchBarModule} from '../gui/searchBar';
import {ResourceInfoModule} from '../gui/resourceInfo';
import {LogInfoModule, LogInfoDialog} from "../dialogs/logInfoDialog";
import {ExternalSearchModule} from "../gui/externalSearchBar";
import {$Field,} from "../../model";
import {StopPropagation} from "../gui/stopPropagation";
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatInputModule} from '@angular/material/input';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {MatSelectModule} from "@angular/material/select";
import {MatTooltipModule} from "@angular/material/tooltip";

/**
 * @ignore
 */

const COLORS = {
    grey: 'grey',
    white: '#FFFFFF',
    inputBorderColor: '#E0E0E0',
    inputTextColor: '#797979',
    inputPlacholderColor: '#C0C0C0',
    black: '#000000',
    toggleActiveBg: '#613DB0',
    headingBg: '#F1F1F1',
};

@Component({
    selector: 'settingsLabelsPanel',
    changeDetection: ChangeDetectionStrategy.Default,
    template: `
        <div class="settings-wrap">
            <h5>Labels</h5>
            <div class="wrap" *ngFor="let labelClass of labelClasses">
                <mat-slide-toggle matTooltip="Toggle labels"
                                  [checked]="config?.showLabels && config.showLabels[labelClass]"
                                  (change)="updateShowLabels(labelClass)"><img
                        src="./styles/images/toggle-icon.svg"/>{{ labelClass }}
                </mat-slide-toggle>
                <mat-radio-group [(ngModel)]="config.labels[labelClass]"
                                 *ngIf="config?.showLabels && config.showLabels[labelClass]">
                    <mat-radio-button *ngFor="let labelProp of labelProps"
                                      [value]="labelProp"
                                      (change)="updateLabelContent(labelClass, labelProp)"> {{ labelProp }}
                    </mat-radio-button>
                </mat-radio-group>
            </div>
        </div>
    `
})
export class SettingsLabelsPanel {
    @Input() config;
    @Input() labelClasses;
    @Input() labelProps;
    @Output() onUpdateShowLabels = new EventEmitter();
    @Output() onUpdateLabelContent = new EventEmitter();

    updateShowLabels(labelClass) {
        this.config.showLabels[labelClass] = !this.config.showLabels[labelClass];
        this.onUpdateShowLabels.emit(this.config.showLabels || {});
    }

    updateLabelContent(labelClass, labelProp) {
        this.config.labels[labelClass] = labelProp;
        this.onUpdateLabelContent.emit(this.config.labels || {})
    }
}

@Component({
    selector: 'settingsHighlightedPanel',
    changeDetection: ChangeDetectionStrategy.Default,
    template: `
        <mat-accordion>
            <mat-expansion-panel>
                <mat-expansion-panel-header>
                    <mat-panel-title>
                        Highlighted
                    </mat-panel-title>
                </mat-expansion-panel-header>
                <div class="default-box pb-0">
                    <div *ngIf="config?.highlighted" class="default-boxContent">
                        <resourceInfoPanel *ngIf="!!highlighted" [resource]="highlighted"></resourceInfoPanel>
                    </div>
                    <div *ngIf="!highlighted" class="default-boxError">
                        Hover an instance to see its details.
                    </div>
                </div>
            </mat-expansion-panel>
        </mat-accordion>
    `
})
export class SettingsHighlightedPanel {
    @Input() config;
    @Input() highlighted;
}

@Component({
    selector: 'settingsSelectedPanel',
    changeDetection: ChangeDetectionStrategy.Default,
    template: `
        <mat-accordion>
            <mat-expansion-panel>
                <mat-expansion-panel-header>
                    <mat-panel-title>
                        Selected
                    </mat-panel-title>
                </mat-expansion-panel-header>
                <div class="default-box pb-0">
                    <searchBar [selected]="selectedLabel" [searchOptions]="searchOptions"
                               (selectedItemChange)="this.onSelectBySearch.emit($event)">
                    </searchBar>
                    <div *ngIf="config?.selected" class="default-boxContent">
                        <button *ngIf="selected && selected.class === 'Lyph' " title="Edit"
                                class="w3-bar-item w3-right w3-hover-light-grey"
                                (click)="onEditResource.emit(selected)">
                            <i class="fa fa-edit"> </i>
                        </button>
                        <resourceInfoPanel *ngIf="!!selected" [resource]="selected"></resourceInfoPanel>
                        <sciGraphSearch [selected]="selected"></sciGraphSearch>
                    </div>
                </div>
            </mat-expansion-panel>
        </mat-accordion>
    `
})
export class SettingsSelectedPanel {
    @Input() config;
    @Input() selected;
    @Input() selectedLabel;
    @Input() searchOptions;
    @Output() onSelectBySearch = new EventEmitter();
    @Output() onEditResource = new EventEmitter();
}

@Component({
    selector: 'settingsPanel',
    changeDetection: ChangeDetectionStrategy.Default,
    template: `
        <section #settingsPanel id="settingsPanel">
            <!-- Settings -->
            <mat-accordion>
                <mat-expansion-panel>
                    <mat-expansion-panel-header>
                        <mat-panel-title>
                            Settings
                        </mat-panel-title>
                    </mat-expansion-panel-header>

                    <div class="default-box">
                        <settingsLabelsPanel
                                [config]="config"
                                [labelClasses]="_labelClasses"
                                [labelProps]="_labelProps"
                                (onUpdateShowLabels)="onUpdateShowLabels.emit($event)"
                                (onUpdateLabelContent)="onUpdateLabelContent.emit($event)"
                        ></settingsLabelsPanel>

                        <div class="settings-wrap">
                            <h5>Helpers</h5>
                            <div class="wrap" *ngFor="let helper of _helperKeys">
                                <mat-slide-toggle matTooltip="Toggle planes" [checked]="_showHelpers.has(helper)"
                                                  (change)="toggleHelperPlane(helper)">{{ helper }}
                                </mat-slide-toggle>
                            </div>
                        </div>
                    </div>
                </mat-expansion-panel>
            </mat-accordion>
            
            <settingsHighlightedPanel
                [config]="config"
                [highlighted]="highlighted"
            ></settingsHighlightedPanel>

            <settingsSelectedPanel
                [config]="config"
                [selected]="selected"
                [selectedLabel]="selectedLabel"
                [searchOptions]="searchOptions"
                (onSelectBySearch)="onSelectBySearch.emit($event)"
                (onEditResource)="onEditResource.emit($event)"
            ></settingsSelectedPanel>
        </section>
    `,
    styles: [`

        .default-box .default-box-header {
            padding: 0.625rem;
            display: flex;
            align-items: center;
        }

        .mat-form-field {
            width: 100%;
        }

        .default-box .default-box-header .search-bar {
            flex-grow: 1;
            padding: 0 0.625rem 0 0;
            flex-grow: 1;
            position: relative;
        }

        .search-bar .mat-form-field-should-float .mat-form-field-label {
            display: none !important;
        }

        .search-bar .mat-form-field-label {
            padding-left: 1.625rem;
            top: 1.5em;
            color: ${COLORS.inputPlacholderColor};
        }

        .search-bar .mat-form-field-infix {
            background: ${COLORS.white};
            border: 0.067rem solid ${COLORS.inputBorderColor};
            box-sizing: border-box;
            border-radius: 0.134rem;
            margin: 0;
            height: 1.134rem;
            color: ${COLORS.inputTextColor};
            padding: 0.5rem 2rem 0 2rem;
        }

        .search-bar .mat-focused .mat-form-field-infix {
            outline: none;
            border-color: ${COLORS.toggleActiveBg};
            box-shadow: 0 0 0 2px rgba(97, 61, 176, 0.1);
        }

        .search-bar .mat-form-field {
            display: block;
            width: 100%;
        }

        .search-bar .mat-form-field-underline {
            display: none;
        }

        .search-bar input.mat-input-element {
            background: ${COLORS.white};
            border: 0.067rem solid ${COLORS.inputBorderColor};
            box-sizing: border-box;
            border-radius: 0.134rem;
            margin: 0;
            height: 2.134rem;
            color: ${COLORS.inputTextColor};
            padding: 0 0.534rem 0 1.734rem;
        }

        .search-bar .search-input {
            background: ${COLORS.white};
            border: 0.067rem solid ${COLORS.inputBorderColor};
            box-sizing: border-box;
            border-radius: 0.134rem;
            margin: 0;
            display: block;
            width: 100%;
            height: 2.134rem;
            color: ${COLORS.inputTextColor};
            padding: 0 0.534rem 0 1.734rem;
            font-size: 0.75rem;
        }

        .search-bar img {
            z-index: 10;
            position: absolute;
            left: 0.534rem;
            top: 50%;
            transform: translateY(-50%);
            color: ${COLORS.inputTextColor};
            font-size: 0.934rem;
        }

        .search-bar img.input-clear {
            right: 0.534rem;
            cursor: pointer;
            left: auto;
        }

        .search-bar .search-input:focus {
            outline: none;
            border-color: ${COLORS.toggleActiveBg};
            box-shadow: 0 0 0 2px rgba(97, 61, 176, 0.1);
        }

        .search-bar .search-input::placeholder {
            color: ${COLORS.inputPlacholderColor};
        }

        .default-box .default-boxContent {
            padding: 0.625rem;
            font-size: 0.75rem;
            color: ${COLORS.inputTextColor};
            font-weight: 500;
        }

        .default-box .default-box-header ~ .default-boxContent {
            padding-top: 0;
        }

        :host >>> .default-box .default-boxFooter {
            text-align: right;
        }

        :host >>> .default-box .default-boxContent section section {
            display: flex;
        }

        :host >>> .default-box .default-boxError {
            min-height: 6.25rem;
            display: flex;
            justify-content: center;
            align-items: center;
            color: ${COLORS.inputTextColor};
            font-size: 0.75rem;
            font-weight: 500;
        }

        :host >>> .default-box .default-boxContent ~ .default-boxError {
            padding-bottom: 2rem;
        }

        :host >>> .default-box .default-boxResult {
            border-top: ${COLORS.inputBorderColor} 1px solid;
            margin: 1rem 0 0;
            padding-top: 0.625rem;
        }

        :host >>> .default-box .default-boxResult {
            display: flex;
        }

        :host >>> .default-box .default-boxResult label {
            width: 6.25rem;
            flex: none;
        }

        :host >>> .default-box .default-boxResult ~ .default-boxError {
            display: none;
        }

        :host >>> .default-box .default-boxContent button:hover {
            background: transparent !important;
            color: ${COLORS.inputTextColor} !important;
        }

        .default-box h4 {
            background: ${COLORS.headingBg};
            padding: 0.8rem 1.067rem;
            font-weight: 500;
            font-size: 0.8rem;
            line-height: 0.934rem;
            color: ${COLORS.black};
            margin: 0;
        }

        .default-box {
            font-size: 0.75rem;
        }

        :host ::ng-deep .default-box .wrap {
            padding: 0 1.067rem;
        }
    `]
})
export class SettingsPanel {
    _config;
    _helperKeys;
    _showHelpers;
    _labelProps;
    _labelClasses;
    selectedLabel;

    searchTerm = '';

    @Input('config') set config(newConfig) {
        if (this._config !== newConfig) {
            this._config = newConfig || {};
            this._labelClasses = this._config[$Field.labels]::keys();
        }
    }

    @Input('helperKeys') set helperKeys(newHelperKeys) {
        if (this._helperKeys !== newHelperKeys) {
            this._helperKeys = newHelperKeys;
            this._showHelpers = new Set([]);
        }
    }

    @Input('selected') set selected(entity) {
        if (this.selected !== entity) {
            this._selected = entity;
            this.selectedLabel = (entity?.name || '?') + ' (' + entity?.id + ')';
        }
    }

    @Input() searchOptions;
    @Input() highlighted;

    @Output() onSelectBySearch = new EventEmitter();
    @Output() onUpdateShowLabels = new EventEmitter();
    @Output() onUpdateLabelContent = new EventEmitter();
    @Output() onToggleLayout = new EventEmitter();
    @Output() onToggleHelperPlane = new EventEmitter();

    constructor() {
        this._labelProps = [$Field.id, $Field.name];
        this._showHelpers = new Set([]);
        this.searchTerm = '';
    }

    get config() {
        return this._config;
    }

    get selected() {
        return this._selected;
    }

    toggleMode() {
        this.config.layout.numDimensions = (this.config.layout.numDimensions === 3) ? 2 : 3;
        this.onToggleMode.emit(this.config.layout.numDimensions);
    }

    updateShowLabels(labelClass) {
        this.config.showLabels[labelClass] = !this.config.showLabels[labelClass];
        this.onUpdateShowLabels.emit(this.config.showLabels || {});
    }

    updateLabelContent(labelClass, labelProp) {
        this.config.labels[labelClass] = labelProp;
        this.onUpdateLabelContent.emit(this.config.labels || {})
    }

    toggleHelperPlane(helper) {
        if (!helper) {
            return;
        }
        if (this._showHelpers.has(helper)) {
            this._showHelpers.delete(helper);
        } else {
            this._showHelpers.add(helper);
        }
        this.onToggleHelperPlane.emit(helper);
    }

    search(value, filterOptions, allOptions) {
        this[filterOptions] = this[allOptions]?.filter((val) => val.name && val.name.toLowerCase().includes(value?.toLowerCase()));
    }

    clearSearch(term, filterOptions, allOptions) {
        this[term] = '';
        this[filterOptions] = this[allOptions];
    }
}

@NgModule({
    imports: [CommonModule, FormsModule, BrowserAnimationsModule, ReactiveFormsModule, ResourceInfoModule, ExternalSearchModule,
        MatSliderModule, SearchBarModule, MatCheckboxModule, MatRadioModule, LogInfoModule,
        MatSlideToggleModule, MatIconModule, MatInputModule, MatButtonModule, MatExpansionModule,
        MatFormFieldModule, MatAutocompleteModule, MatSelectModule, MatTooltipModule
    ],
    declarations: [SettingsPanel, SettingsLabelsPanel, SettingsHighlightedPanel, SettingsSelectedPanel, StopPropagation],
    entryComponents: [LogInfoDialog],
    exports: [SettingsPanel, SettingsLabelsPanel, SettingsHighlightedPanel, SettingsSelectedPanel]
})
export class SettingsPanelModule {
}