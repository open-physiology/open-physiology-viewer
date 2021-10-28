import {NgModule, Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatSliderModule} from '@angular/material/slider'
import {MatCheckboxModule} from '@angular/material/checkbox'
import {MatRadioModule} from '@angular/material/radio'
import {keys} from 'lodash-bound';
import {SearchBarModule} from './gui/searchBar';

import {ResourceInfoModule} from './gui/resourceInfo';
import {LogInfoModule, LogInfoDialog} from "./gui/logInfoDialog";
import {ExternalSearchModule} from "./gui/externalSearchBar";
import {$Field} from "../model";
import {StopPropagation} from "./gui/stopPropagation";
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatInputModule} from '@angular/material/input';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
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

                <!--Highlighted entity-->

                <fieldset *ngIf="config.highlighted" class="w3-card w3-round w3-margin-small">
                    <legend>Highlighted</legend>
                    <resourceInfoPanel *ngIf="!!highlighted" [resource]="highlighted"> </resourceInfoPanel>
                </fieldset>

                <!--Search bar-->

                <fieldset class="w3-card w3-round w3-margin-small-small">
                    <legend>Search</legend>
                    <searchBar [selected]="_selectedName" [searchOptions]="searchOptions"
                               (selectedItemChange)="selectBySearch($event)">
                    </searchBar>
                </fieldset>

                <!--Selected resource-->

                <fieldset *ngIf="config.selected" class="w3-card w3-round w3-margin-small">
                    <legend>Selected</legend>
                    <resourceInfoPanel *ngIf="!!_selected" [resource]="_selected">
                    </resourceInfoPanel>
                    <button *ngIf="!!_selected" title="Edit"
                            class="w3-hover-light-grey w3-right" (click)="onEditResource.emit(_selected)">
                        <i class="fa fa-edit"> </i>
                    </button>
                </fieldset>

                <!--SciGraph search-->

                <fieldset class="w3-card w3-round w3-margin-small">
                    <legend>SciGraph search</legend>
                    <sciGraphSearch [selected]="_selected">
                    </sciGraphSearch>
                </fieldset>

                <!--Group controls-->

                <div *ngIf="!!groups" class="default-box">
                  <h4>Groups</h4>
                  <div class="default-box-header">
                    <div class="search-bar">
                      <img src="./styles/images/search.svg" />
                      <input type="text" class="search-input" placeholder="Search for a group" />
                    </div>
                    <button mat-raised-button><i class="fa fa-filter"></i> Filter</button>
                    <button mat-raised-button>Activate all</button>
                  </div>
                  <div class="wrap" *ngFor="let group of groups">
                    <mat-slide-toggle>{{group.name || group.id}}</mat-slide-toggle>
                  </div>
                </div>

                <!--Dynamic groups-->

                <div *ngIf="!!dynamicGroups" class="default-box">
                  <h4>Dynamic groups</h4>
                  <div class="default-box-header">
                    <div class="search-bar">
                      <i class="fa fa-search"></i>
                      <input type="text" class="search-input" placeholder="Search for a group" />
                    </div>
                    <button mat-raised-button>Activate all</button>
                  </div>
                  <div class="wrap" *ngFor="let group of dynamicGroups">
                    <mat-slide-toggle>{{group.name || group.id}}</mat-slide-toggle>
                  </div>
                </div>

                <!--Scaffold controls-->

                <div *ngIf="!!scaffolds" class="default-box">
                  <h4>Scaffolds</h4>
                  <div class="default-box-header">
                    <div class="search-bar">
                      <i class="fa fa-search"></i>
                      <input type="text" class="search-input" placeholder="Search for a scaffold" />
                    </div>
                  </div>
                  <div class="wrap" *ngFor="let scaffold of scaffolds">
                    <mat-slide-toggle>{{scaffold._parent? scaffold._parent.id + ":" : ""}}{{scaffold.name || scaffold.id}}</mat-slide-toggle>
                  </div>
                </div>

                <!-- Settings -->
                <div class="default-box">
                  <h4>Settings</h4>

                  <div class="settings-wrap">
                    <h5>Layout</h5>
                    <div class="wrap">
                      <mat-slide-toggle matTooltip="Toggle view mode" (change)="toggleMode()" [checked]="config.layout.numDimensions === 2">2D mode</mat-slide-toggle>
                    </div>

                    <div class="wrap">
                      <mat-slide-toggle matTooltip="Toggle lyphs" (change)="toggleLayout('showLyphs')" [checked]="config.layout.showLyphs">Lyphs</mat-slide-toggle>
                    </div>

                    <div class="wrap">
                      <mat-slide-toggle matTooltip="Toggle layers" [disabled]="!config.layout.showLyphs" (change)="toggleLayout('showLayers')" [checked]="config.layout.showLayers">Layers</mat-slide-toggle>
                    </div>

                    <div class="wrap">
                      <mat-slide-toggle matTooltip="Toggle 3D lyphs" [disabled]="!config.layout.showLyphs" (change)="toggleLayout('showLyphs3d')" [checked]="config.layout.showLyphs3d">Lyphs 3D</mat-slide-toggle>
                    </div>

                    <div class="wrap">
                      <mat-slide-toggle matTooltip="Toggle coalescences" [disabled]="!config.layout.showLyphs" (change)="toggleLayout('showCoalescences')" [checked]="config.layout.showCoalescences">Coalescences</mat-slide-toggle>
                    </div>
                  </div>

                  <!--View helpers-->
                  <div class="settings-wrap">
                    <h5>Helpers</h5>
                    <div class="wrap" *ngFor="let helper of _helperKeys">
                      <mat-slide-toggle matTooltip="Toggle planes" [checked]="_showHelpers.has(helper)" (change)="toggleHelperPlane(helper)">{{helper}}</mat-slide-toggle>
                    </div>
                  </div>

                  <!--Label config-->
                  <div class="settings-wrap">
                    <h5>Labels</h5>
                    <div class="wrap" *ngFor="let labelClass of _labelClasses">
                      <mat-slide-toggle matTooltip="Toggle labels" [checked]="config.labels[labelClass]" (change)="updateLabels(labelClass)">{{labelClass}}</mat-slide-toggle>
                      <mat-radio-group [(ngModel)]="_labels[labelClass]" *ngIf="config.labels[labelClass]">
                          <mat-radio-button *ngFor="let labelProp of _labelProps" class="w3-margin-left"
                              [value]="labelProp"
                              (change)="onUpdateLabelContent.emit(_labels)"> {{labelProp}}
                          </mat-radio-button>
                      </mat-radio-group>
                    </div>
                  </div>
                </div>
            </section>
    `,
    styles: [`
        :host >>> fieldset {
            border: 0.06666667rem solid ${COLORS.grey};
            margin: 0.133333rem;
        }

        :host >>> legend {
            padding: 0.2em 0.5em;
            border : 0.06666667rem solid ${COLORS.grey};
            color  : ${COLORS.grey};
            font-size: 90%;
            text-align: right;
        }

        .default-box {
          box-shadow: inset 0 -0.06666667rem 0 ${COLORS.inputBorderColor};
        }

        .default-box .default-box-header {
          padding: 1.06666667rem;
          display: flex;
          align-items: center;
        }

        .default-box .default-box-header .search-bar {
          flex-grow: 1;
        }

        .search-bar .mat-form-field {
          display: block;
          width: 100%;
        }

        .search-bar .mat-form-field-underline {
          display: none;
        }

        .search-bar .mat-form-field-appearance-legacy .mat-form-field-wrapper {
          padding-bottom: 0;
        }

        .search-bar .mat-form-field-appearance-legacy .mat-form-field-infix {
          padding: 0;
          width: 100%;
          margin: 0;
          border: none;
        }

        .search-bar input.mat-input-element {
          background: ${COLORS.white};
          border: 0.0666666667rem solid ${COLORS.inputBorderColor};
          box-sizing: border-box;
          border-radius: 0.133333rem;
          margin: 0;
          height: 2.133333rem;
          color: ${COLORS.inputTextColor};
          font-weight: 500;
          font-size: 0.8rem;
          line-height: 1.06666667rem;
          padding: 0 0.533333333rem 0 1.73333333rem;
        }

        .search-bar .search-input {
          background: ${COLORS.white};
          border: 0.0666666667rem solid ${COLORS.inputBorderColor};
          box-sizing: border-box;
          border-radius: 0.133333rem;
          margin: 0;
          display: block;
          width: 100%;
          height: 2.133333rem;
          color: ${COLORS.inputTextColor};
          font-weight: 500;
          font-size: 0.8rem;
          line-height: 1.06666667rem;
          padding: 0 0.533333333rem 0 1.73333333rem;
        }

        .search-bar {
          position: relative;
        }

        .search-bar .fa {
          position: absolute;
          left: 0.533333333rem;
          top: 0.533333333rem;
          color: ${COLORS.inputTextColor};
          font-size: 0.933333333rem;
        }

        .search-bar .search-input:focus {
          outline: none;
          box-shadow: none;
          border: 0.0666666667rem solid ${COLORS.inputBorderColor};
        }

        .search-bar .search-input::placeholder {
          color: ${COLORS.inputPlacholderColor};
        }

        /* .search-bar .mat-form-field-subscript-wrapper {
          display: none;
        } */

        .default-box h4 {
          background: ${COLORS.headingBg};
          padding: 0.8rem 1.06666667rem;
          font-weight: 500;
          font-size: 0.8rem;
          line-height: 0.933333333rem;
          color: ${COLORS.black};
          margin: 0;
        }

        .default-box .wrap {
          padding: 0.266666667rem 1.06666667rem;
        }

        .default-box .mat-slide-toggle {
          height: auto;
        }

        :host ::ng-deep .mat-slide-toggle-content {
          font-weight: 500;
          font-size: 0.8rem;
          line-height: 1.06666667rem;
          color: ${COLORS.inputTextColor};
        }

        :host ::ng-deep .mat-slide-toggle-bar {
          width: 2.133333rem;
          height: 1.06666667rem;
          background: ${COLORS.inputBorderColor};
        }

        :host ::ng-deep .mat-slide-toggle-thumb-container {
          width: auto; height: auto;
          top: 0.133333rem;
          left: 0.133333rem;
        }

        :host ::ng-deep .mat-slide-toggle.mat-checked .mat-slide-toggle-bar {
          background: ${COLORS.toggleActiveBg};
        }

        :host ::ng-deep .mat-slide-toggle.mat-checked .mat-slide-toggle-thumb {
          background: ${COLORS.white};
        }

        :host ::ng-deep .mat-slide-toggle .mat-slide-toggle-ripple {
          display: none;
        }

        :host ::ng-deep .mat-slide-toggle-thumb {
          background: ${COLORS.white};
          box-shadow: 0 0.0666666667rem 0.333333333rem rgba(0, 0, 0, 0.2);
          border-radius: 0.533333333rem;
          width: 0.8rem;
          height: 0.8rem;
        }

        :host ::ng-deep button.mat-raised-button {
          border: 0.0666666667rem solid ${COLORS.inputBorderColor};
          padding: 0.533333333rem;
          color: ${COLORS.inputTextColor};
          font-weight: 500;
          font-size: 0.8rem;
          margin-left: 0.533333333rem;
          box-shadow: none;
          line-height: 1.06666667rem;
          border-radius: 0.133333rem;
          flex-shrink: 0;
        }

        :host ::ng-deep .mat-button-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        :host ::ng-deep button.mat-raised-button .fa {
          display: block;
          margin-right: 0.266666667rem;
        }

        .default-box h5 {
          padding: 0.8rem 0;
          margin: 0 0 0.533333333rem 1.06666667rem;
          font-weight: 500;
          color: ${COLORS.black};
          font-size: 0.8rem;
          box-shadow: inset 0 -0.0666666667rem 0 ${COLORS.inputBorderColor};
          line-height: 0.933333333rem;
          display: flex;
          align-items: center;
        }

        .default-box .settings-wrap .wrap {
          padding-left: 4rem;
        }
    `]
})
export class SettingsPanel {
    _config;
    _helperKeys;
    _showHelpers;
    _labelProps;
    _labelClasses;
    _selectedName;

    @Input() groups;

    @Input() dynamicGroups;

    @Input() scaffolds;

    @Input('config') set config(newConfig) {
        if (this._config !== newConfig) {
            this._config = newConfig;
            this._labelClasses = this._config[$Field.labels]::keys();
            let ids = this._config.visibleGroups || [];
            this._showGroups = new Set((this.groups||[]).filter(g => ids.includes(g.id)));
        }
    }

    @Input('helperKeys') set helperKeys(newHelperKeys){
        if (this._helperKeys !== newHelperKeys) {
            this._helperKeys = newHelperKeys;
            this._showHelpers = new Set([]);
        }
    }
    @Input('selected') set selected(entity){
        if (this.selected !== entity) {
            this._selected = entity;
            this._selectedName = entity ? entity.name || "" : "";
        }
    }
    @Input() searchOptions;
    @Input() highlighted;

    @Output() onSelectBySearch     = new EventEmitter();
    @Output() onEditResource       = new EventEmitter();
    @Output() onUpdateLabels       = new EventEmitter();
    @Output() onUpdateLabelContent = new EventEmitter();
    @Output() onToggleGroup        = new EventEmitter();
    @Output() onToggleMode         = new EventEmitter();
    @Output() onToggleLayout       = new EventEmitter();
    @Output() onToggleHelperPlane  = new EventEmitter();

    constructor() {
        this._labelProps    = [$Field.id, $Field.name];
        this._labels        = {Anchor: $Field.id, Wire: $Field.id, Node: $Field.id, Link: $Field.id, Lyph: $Field.id, Region: $Field.id};
        this._showHelpers   = new Set([]);
    }

    get config() {
        return this._config;
    }

    get selected(){
        return this._selected;
    }

    get scaffolds(){
        return this._scaffolds;
    }

    selectBySearch(name) {
        if (name !== this._selectedName) {
            this._selectedName = name;
            this.onSelectBySearch.emit(name);
        }
    }

    toggleMode(){
        this.config.layout.numDimensions = (this.config.layout.numDimensions === 3)? 2: 3;
        this.onToggleMode.emit(this.config.layout.numDimensions);
    }

    toggleLayout(prop){
        this.config.layout[prop] = !this.config.layout[prop];
        this.onToggleLayout.emit(prop);
    }

    updateLabels(labelClass) {
        this.config.labels[labelClass] = !this.config.labels[labelClass];
        this.onUpdateLabels.emit(this.config.labels||{});
    }

    toggleHelperPlane(helper) {
        if (!helper) { return; }
        if (this._showHelpers.has(helper)){
            this._showHelpers.delete(helper);
        } else {
            this._showHelpers.add(helper);
        }
        this.onToggleHelperPlane.emit(helper);
    }
}

@NgModule({
    imports: [CommonModule, FormsModule, ReactiveFormsModule, ResourceInfoModule, ExternalSearchModule,
        MatSliderModule, SearchBarModule, MatCheckboxModule, MatRadioModule, LogInfoModule, MatSlideToggleModule, MatIconModule, MatInputModule, MatButtonModule],
    declarations: [SettingsPanel, StopPropagation],
    entryComponents: [LogInfoDialog],
    exports: [SettingsPanel]
})
export class SettingsPanelModule {
}