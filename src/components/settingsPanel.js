import {NgModule, Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatSliderModule} from '@angular/material/slider'
import {MatCheckboxModule} from '@angular/material/checkbox'
import {MatRadioModule} from '@angular/material/radio'
import {keys} from 'lodash-bound';
import {SearchBarModule} from './gui/searchBar';
import {ResourceInfoModule} from './gui/resourceInfo';
import {LogInfoModule, LogInfoDialog} from "./dialogs/logInfoDialog";
import {ExternalSearchModule} from "./gui/externalSearchBar";
import {$Field, $SchemaClass} from "../model";
import {StopPropagation} from "./gui/stopPropagation";
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatInputModule} from '@angular/material/input';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatFormFieldModule} from '@angular/material/form-field';
import {ResourceVisibility} from "./gui/resourceVisibility";
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
    selector: 'settingsPanel',
    changeDetection: ChangeDetectionStrategy.Default,
    template: `
        <section>   
            <!-- Settings -->
            <mat-accordion>
                <mat-expansion-panel>
                    <mat-expansion-panel-header>
                        <mat-panel-title>
                            Settings
                        </mat-panel-title>
                    </mat-expansion-panel-header>

                    <div class="default-box">
                        <div class="settings-wrap">

                            <h5>Layout</h5>

                            <div class="wrap">
                                <mat-slide-toggle matTooltip="Toggle view mode" (change)="toggleMode()"
                                                  [checked]="config.layout.numDimensions === 2">2D mode
                                </mat-slide-toggle>
                            </div>

                            <div class="wrap">
                                <mat-slide-toggle matTooltip="Toggle lyphs" (change)="toggleLayout('showLyphs')"
                                                  [checked]="config.layout.showLyphs">Lyphs
                                </mat-slide-toggle>
                            </div>

                            <div class="wrap">
                                <mat-slide-toggle matTooltip="Toggle layers" [disabled]="!config.layout.showLyphs"
                                                  (change)="toggleLayout('showLayers')"
                                                  [checked]="config.layout.showLayers">Layers
                                </mat-slide-toggle>
                            </div>

                            <div class="wrap">
                                <mat-slide-toggle matTooltip="Toggle 3D lyphs" [disabled]="!config.layout.showLyphs"
                                                  (change)="toggleLayout('showLyphs3d')"
                                                  [checked]="config.layout.showLyphs3d">Lyphs 3D
                                </mat-slide-toggle>
                            </div>

                            <div class="wrap">
                                <mat-slide-toggle matTooltip="Toggle coalescences" [disabled]="!config.layout.showLyphs"
                                                  (change)="toggleLayout('showCoalescences')"
                                                  [checked]="config.layout.showCoalescences">Coalescences
                                </mat-slide-toggle>
                            </div>
                        </div>

                        <div class="settings-wrap">
                            <h5>Labels</h5>
                            <div class="wrap" *ngFor="let labelClass of _labelClasses">
                                <mat-slide-toggle matTooltip="Toggle labels" [checked]="config.showLabels[labelClass]"
                                                  (change)="updateShowLabels(labelClass)"><img
                                        src="./styles/images/toggle-icon.svg"/>{{labelClass}}</mat-slide-toggle>
                                <mat-radio-group [(ngModel)]="config.labels[labelClass]"
                                                 *ngIf="config.showLabels[labelClass]">
                                    <mat-radio-button *ngFor="let labelProp of _labelProps"
                                                      [value]="labelProp"
                                                      (change)="updateLabelContent(labelClass, labelProp)"> {{labelProp}}
                                    </mat-radio-button>
                                </mat-radio-group>
                            </div>
                        </div>

                        <div class="settings-wrap">
                            <h5>Helpers</h5>
                            <div class="wrap" *ngFor="let helper of _helperKeys">
                                <mat-slide-toggle matTooltip="Toggle planes" [checked]="_showHelpers.has(helper)"
                                                  (change)="toggleHelperPlane(helper)">{{helper}}</mat-slide-toggle>
                            </div>
                        </div>
                    </div>
                </mat-expansion-panel>
            </mat-accordion>
            <!--Highlighted entity-->
            <mat-accordion>
                <mat-expansion-panel>
                    <mat-expansion-panel-header>
                        <mat-panel-title>
                            Highlighted
                        </mat-panel-title>
                    </mat-expansion-panel-header>
                    <div class="default-box pb-0">
                        <div *ngIf="config.highlighted" class="default-boxContent">
                            <resourceInfoPanel *ngIf="!!highlighted" [resource]="highlighted"></resourceInfoPanel>
                        </div>
                        <div *ngIf="!highlighted" class="default-boxError">
                            Hover an instance to see its details.
                        </div>
                    </div>
                </mat-expansion-panel>
            </mat-accordion>
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
                        <div *ngIf="config.selected" class="default-boxContent">
                            <button *ngIf="_selected && _selected.class === 'Lyph' " title="Edit"
                                    class="w3-bar-item w3-right w3-hover-light-grey"
                                    (click)="onEditResource.emit(_selected)">
                                <i class="fa fa-edit"> </i>
                            </button>
                            <resourceInfoPanel *ngIf="!!_selected" [resource]="_selected">
                            </resourceInfoPanel>
                            <sciGraphSearch [selected]="_selected">
                            </sciGraphSearch>
                        </div>
                    </div>
                </mat-expansion-panel>
            </mat-accordion>

            <!--Group controls-->

            <mat-accordion *ngIf="!!groups">
                <mat-expansion-panel [expanded]="true">
                    <mat-expansion-panel-header>
                        <mat-panel-title>
                            Groups
                        </mat-panel-title>
                    </mat-expansion-panel-header>

                    <div class="default-box">
                        <div class="default-box-header">
                            <div class="search-bar">
                                <img src="./styles/images/search.svg"/>
                                <input type="text" class="w3-input search-input" placeholder="Search for a group"
                                       name="searchTerm" [(ngModel)]="searchTerm"
                                       (input)="search($event.target.value, 'filteredGroups', 'groups')"/>
                                <img *ngIf="searchTerm !== ''" src="./styles/images/close.svg" class="input-clear"
                                     (click)="clearSearch('searchTerm', 'filteredGroups', 'groups')"/>
                            </div>
                            <button mat-raised-button (click)="toggleAllGroups()">Toggle all</button>
                        </div>
                        <div class="wrap" *ngFor="let group of filteredGroups">
                            <mat-slide-toggle [checked]="!group.hidden"
                                              [matTooltip]="group.name + ' (' + group.id + ')'"
                                              (change)="onToggleGroup.emit(group)">{{group.namespace ? group.namespace + ":" : ""}}
                                {{group.name || group.id}}</mat-slide-toggle>
                        </div>
                    </div>
                </mat-expansion-panel>
            </mat-accordion>

            <!--Dynamic groups-->
            <mat-accordion *ngIf="!!dynamicGroups">
                <mat-expansion-panel>
                    <mat-expansion-panel-header>
                        <mat-panel-title>
                            Dynamic groups
                        </mat-panel-title>
                    </mat-expansion-panel-header>

                    <div class="default-box">
                        <div class="default-box-header">
                            <div class="search-bar">
                                <img src="./styles/images/search.svg"/>
                                <input type="text" class="search-input" id="filter" #filter
                                       placeholder="Search for a dynamic group" name="searchDynamicTerm"
                                       [(ngModel)]="searchDynamicTerm"
                                       (input)="search($event?.target?.value, 'filteredDynamicGroups', 'dynamicGroups')"/>
                                <img *ngIf="filter.value !== ''" src="./styles/images/close.svg" class="input-clear"
                                     (click)="clearTreeSearch(filter, tree)"/>
                            </div>
                            <button mat-raised-button (click)="toggleAllDynamicGroup()">Toggle all</button>
                        </div>
                        <div class="wrap" *ngFor="let group of filteredDynamicGroups">
                            <mat-slide-toggle [checked]="!group.hidden"
                                              [matTooltip]="group.name + ' (' + group.id + ')'"
                                              (change)="onToggleGroup.emit(group)">{{group.name || group.id}}</mat-slide-toggle>
                        </div>
                    </div>
                </mat-expansion-panel>
            </mat-accordion>

            <!--Scaffold controls-->

            <mat-accordion *ngIf="scaffolds && scaffolds.length > 0">
                <mat-expansion-panel>
                    <mat-expansion-panel-header>
                        <mat-panel-title>
                            Scaffolds
                        </mat-panel-title>
                    </mat-expansion-panel-header>

                    <div class="default-box">
                        <div class="default-box-header">
                            <div class="search-bar">
                                <img src="./styles/images/search.svg"/>
                                <input type="text" class="search-input" placeholder="Search for a group"
                                       name="searchTermScaffolds" [(ngModel)]="searchTermScaffolds"
                                       (input)="searchScaffold($event.target.value)"/>
                                <img *ngIf="searchTermScaffolds !== ''" src="./styles/images/close.svg"
                                     class="input-clear"
                                     (click)="clearSearch('searchTermScaffold', 'filteredScaffolds', 'scaffolds')"/>
                            </div>
                        </div>
                        <div class="wrap" *ngFor="let scaffold of filteredScaffolds">
                            <mat-slide-toggle [checked]="!scaffold.hidden"
                                              (change)="toggleScaffold(scaffold)">{{scaffold._parent ? scaffold._parent.id + ":" : ""}}{{scaffold.name || scaffold.id}}</mat-slide-toggle>
                        </div>
                    </div>

                    <!-- Component visibility -->
                    <resourceVisibility
                            title="Component visibility"
                            [renderedResources]="renderedComponents"
                            [dependentProperties]="['anchors', 'wires', 'regions']">
                    </resourceVisibility>

                    <div class="default-box">
                        <div class="settings-wrap">
                            <div class="wrap">
                                <mat-slide-toggle matTooltip="Toggle scaffold resource visibility"
                                                  (change)="toggleVisibility()"
                                                  [checked]="scaffoldResourceVisibility">Show all resources
                                </mat-slide-toggle>
                            </div>
                        </div>
                    </div>

                    <!-- Wire visibility -->
                    <resourceVisibility
                            title="Wire visibility"
                            [renderedResources]="renderedWires">
                    </resourceVisibility>

                    <!-- Regions visibility -->
                    <resourceVisibility
                            title="Region visibility"
                            [renderedResources]="renderedRegions"
                            [dependentProperties]="['facets', 'borderAnchors']">
                    </resourceVisibility>

                    <!-- Anchor visibility -->
                    <resourceVisibility
                            title="Anchor visibility"
                            [renderedResources]="renderedAnchors">
                    </resourceVisibility>
                </mat-expansion-panel>
            </mat-accordion>
            <!--Variance-->
            <mat-accordion *ngIf="clades?.length > 0">
                <mat-expansion-panel>
                    <mat-expansion-panel-header>
                        <mat-panel-title>
                            <mat-checkbox *ngIf="varianceDisabled" matTooltip="Reset" class="w3-margin-right"
                                          [checked]="varianceDisabled"
                                          (change)="onCladeReset.emit()">
                            </mat-checkbox>
                            Variance
                        </mat-panel-title>
                    </mat-expansion-panel-header>
                    <mat-form-field>
                        <div class="default-box pb-0">
                            <mat-select *ngIf="!cladeDisabled" class="default-boxContent"
                                        [disabled]="varianceDisabled"
                                        [placeholder]="Clade"
                                        [matTooltip]="Clade"
                                        [value]="clade"
                                        (selectionChange)="onCladeChange.emit($event.value)">
                                <mat-option *ngFor="let option of clades" [value]="option.id">
                                    {{option.id}}
                                </mat-option>
                            </mat-select>
                        </div>
                    </mat-form-field>
                </mat-expansion-panel>
            </mat-accordion>
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
    _scaffolds;
    _helperKeys;
    _showHelpers;
    _labelProps;
    _labelClasses;
    selectedLabel;
    searchTerm = '';
    filteredGroups;
    filteredDynamicGroups;
    searchTermScaffolds = '';
    filteredScaffolds;
    nodes;

    scaffoldResourceVisibility: Boolean = false;
    renderedComponents;
    renderedWires;
    renderedRegions;
    renderedAnchors;

    @Input() groups;

    @Input() dynamicGroups;

    @Input('scaffolds') set scaffolds(newScaffolds) {
        this._scaffolds = newScaffolds;
        this.updateRenderedResources();
    }

    @Input('config') set config(newConfig) {
        if (this._config !== newConfig) {
            this._config = newConfig;
            this._labelClasses = this._config[$Field.labels]::keys();
            let ids = this._config.visibleGroups || [];
            this._showGroups = new Set((this.groups || []).filter(g => ids.includes(g.id)));
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

    @Input() varianceDisabled;
    @Input() clade;
    @Input() clades;

    @Output() onSelectBySearch = new EventEmitter();
    @Output() onOpenExternal = new EventEmitter();
    @Output() onEditResource = new EventEmitter();
    @Output() onUpdateShowLabels = new EventEmitter();
    @Output() onUpdateLabelContent = new EventEmitter();
    @Output() onToggleGroup = new EventEmitter();
    @Output() onToggleMode = new EventEmitter();
    @Output() onToggleLayout = new EventEmitter();
    @Output() onToggleHelperPlane = new EventEmitter();
    @Output() onCladeChange = new EventEmitter();
    @Output() onCladeReset = new EventEmitter();

    constructor() {
        this._labelProps = [$Field.id, $Field.name];
        this._showHelpers = new Set([]);
        this.searchTerm = '';
        this.searchTermScaffolds = '';
    }

    get config() {
        return this._config;
    }

    get selected() {
        return this._selected;
    }

    get scaffolds() {
        return this._scaffolds;
    }

    toggleMode() {
        this.config.layout.numDimensions = (this.config.layout.numDimensions === 3) ? 2 : 3;
        this.onToggleMode.emit(this.config.layout.numDimensions);
    }

    toggleLayout(prop) {
        this.config.layout[prop] = !this.config.layout[prop];
        this.onToggleLayout.emit(prop);
    }

    toggleScaffold(scaffold) {
        this.onToggleGroup.emit(scaffold);
        if (scaffold.class === $SchemaClass.Scaffold) {
            this.updateRenderedResources();
        }
    }

    toggleVisibility() {
        this.scaffoldResourceVisibility = !this.scaffoldResourceVisibility;
        this.updateRenderedResources();
    }

    updateRenderedResources() {
        let scaffoldResourceNames = ["renderedComponents", "renderedWires", "renderedRegions", "renderedAnchors"];
        scaffoldResourceNames.forEach(prop => this[prop] = []);
        (this.scaffolds || []).forEach(s => {
            //Only include wires from the scaffold, no components
            if (s.class === $SchemaClass.Scaffold && !s.hidden) {
                (s.components || []).forEach(r => {
                    r._parent = s;
                    r._visible = true;
                    this.renderedComponents.push(r);
                });
                if (this.scaffoldResourceVisibility) {
                    (s.anchors || []).forEach(r => {
                        if (!r.generated) {
                            r._parent = s;
                            this.renderedAnchors.push(r);
                        }
                    });
                    (s.wires || []).forEach(r => {
                        if (!r.generated) {
                            r._parent = s;
                            this.renderedWires.push(r);
                        }
                    });
                    (s.regions || []).forEach(r => {
                        if (!r.generated) {
                            r._parent = s;
                            this.renderedRegions.push(r);
                        }
                    });
                }
            }
        });
        scaffoldResourceNames.forEach(prop => {
            if (this[prop].length === 0) {
                this[prop] = undefined;
            }
        });
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

    toggleAllGroups = () => {
        let allVisible = this.groups.filter(group => group.hidden || group.undefined);

        for (let group of this.groups) {
            if (group.hidden || allVisible.length == 0) {
                this.onToggleGroup.emit(group);
            }
        }

        // If all groups are toggled, toggle dynamic groups too.
        this.toggleAllDynamicGroup();
    }

    toggleAllDynamicGroup = () => {
        let allVisible = this.dynamicGroups.filter(group => group.hidden || group.undefined);

        for (let group of this.dynamicGroups) {
            if (group.hidden || allVisible.length == 0) {
                this.onToggleGroup.emit(group);
            }
        }
    }

    search(value, filterOptions, allOptions) {
        this[filterOptions] = this[allOptions]?.filter((val) => val.name && val.name.toLowerCase().includes(value?.toLowerCase()));
    }

    searchScaffold(value) {
        this.filteredScaffolds = this.scaffolds.filter((scaffold) => {
            const lowerCaseValue = value?.toLowerCase();
            const displayTerm = ((scaffold._parent ? scaffold._parent.id + ":" : "") + scaffold.name).toLowerCase();
            return displayTerm.includes(lowerCaseValue) || scaffold?._parent?.id?.toLowerCase()?.includes(lowerCaseValue) || scaffold?.name?.toLowerCase()?.includes(lowerCaseValue);
        });
    }

    ngOnInit() {
        this.filteredGroups = this.groups;
        this.filteredDynamicGroups = this.dynamicGroups;
        this.filteredScaffolds = this.scaffolds;
    }

    ngOnChanges() {
        this.search(this.searchTerm, 'filteredGroups', 'groups');
        this.search(this.searchTerm, 'filteredDynamicGroups', 'dynamicGroups');
        this.search(this.searchTerm, 'filteredScaffolds', 'scaffolds');
        this.filteredGroups = this.filteredGroups || this.groups;
        this.filteredDynamicGroups = this.filteredDynamicGroups || this.dynamicGroups;
        this.filteredScaffolds = this.filteredScaffolds || this.scaffolds;
    }

    clearSearch(term, filterOptions, allOptions) {
        this[term] = '';
        this[filterOptions] = this[allOptions];
    }

    clearTreeSearch(filter, tree) {
        tree?.treeModel?.filterNodes('');
        filter.value = '';
    }
}

@NgModule({
    imports: [CommonModule, FormsModule, BrowserAnimationsModule, ReactiveFormsModule, ResourceInfoModule, ExternalSearchModule,
        MatSliderModule, SearchBarModule, MatCheckboxModule, MatRadioModule, LogInfoModule,
        MatSlideToggleModule, MatIconModule, MatInputModule, MatButtonModule, MatExpansionModule,
        MatFormFieldModule, MatAutocompleteModule, MatSelectModule, MatTooltipModule
    ], //TreeModule],
    declarations: [SettingsPanel, StopPropagation, ResourceVisibility],
    entryComponents: [LogInfoDialog],
    exports: [SettingsPanel]
})

export class SettingsPanelModule {
}