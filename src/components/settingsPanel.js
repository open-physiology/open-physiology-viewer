import {NgModule, Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatSliderModule} from '@angular/material/slider'
import {MatCheckboxModule} from '@angular/material/checkbox'
import {MatRadioModule} from '@angular/material/radio'
import {keys} from 'lodash-bound';
import {SearchBarModule} from './gui/searchBar';
import {NestedTreeControl} from '@angular/cdk/tree';
import {ResourceInfoModule} from './gui/resourceInfo';
import {LogInfoModule, LogInfoDialog} from "./gui/logInfoDialog";
import {ExternalSearchModule} from "./gui/externalSearchBar";
import {$Field} from "../model";
import {StopPropagation} from "./gui/stopPropagation";
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatInputModule} from '@angular/material/input';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatExpansionModule} from '@angular/material/expansion';
// import {MatTreeNestedDataSource, MatTreeModule} from '@angular/material/tree';
import { TreeModule, TreeModel, TreeNode } from '@circlon/angular-tree-component';
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

const TREE_DATA= [
  {
    name: 'Internal',
    children: [
      {name: 'K36'},
      {name: 'K37'},
      {name: 'K38'},
      {name: 'K40'}
    ]
  },
  {
    name: 'Neuron 8',
    children: [{
      name: 'neuron',
      children: [
        {name: 'housing#img'},
        {name: 'K104'},
      ]
    }]
  },
  {
    name: 'IMG and PG',
    children: [
      {
        name: 'Lyphs',
        children: [
          {name: 'housing#img'},
          {name: 'K104'},
        ]
      },
      {
        name: 'Nodes',
        children: [
          {name: 'g102a'},
          {name: 'g102b'},
        ]
      },
      {
        name: 'Links',
        children: [
          {name: 'lnk-K102'},
          {name: 'lnk-K104'},
        ]
      }
    ]
  },
];

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

                <mat-accordion *ngIf="!!groups">
                  <mat-expansion-panel>
                    <mat-expansion-panel-header>
                      <mat-panel-title>
                        Groups
                      </mat-panel-title>
                    </mat-expansion-panel-header>

                    <div class="default-box">
                      <div class="default-box-header">
                        <div class="search-bar">
                          <img src="./styles/images/search.svg" />
                          <input type="text" class="search-input" placeholder="Search for a group" name="searchTerm" [(ngModel)]="searchTerm" (input)="search($event.target.value, 'filteredGroups', 'groups')" />
                          <img *ngIf="searchTerm !== ''" src="./styles/images/close.svg" class="input-clear" (click)="clearSearch('searchTerm', 'filteredGroups', 'groups')" />
                        </div>
                        <button mat-raised-button (click)="activateAllGroup()">Activate all</button>
                      </div>
                      <div class="wrap" *ngFor="let group of filteredGroups">
                        <mat-slide-toggle [checked]= "!group.hidden"  (change)= "onToggleGroup.emit(group)">{{group.name || group.id}}</mat-slide-toggle>
                      </div>
                    </div>
                  </mat-expansion-panel>
                </mat-accordion>




                <!--Dynamic groups-->

                <!-- <mat-accordion *ngIf="!!dynamicGroups">
                  <mat-expansion-panel>
                    <mat-expansion-panel-header>
                      <mat-panel-title>
                        Dynamic groups
                      </mat-panel-title>
                    </mat-expansion-panel-header>

                    <div class="default-box">
                      <div class="default-box-header">
                        <div class="search-bar">
                          <img src="./styles/images/search.svg" />
                          <input type="text" class="search-input" placeholder="Search for a group"/>
                        </div>
                        <button mat-raised-button>Activate all</button>
                      </div>
                      <div class="wrap" *ngFor="let group of dynamicGroups">
                        <mat-slide-toggle>{{group.name || group.id}}</mat-slide-toggle>
                      </div>
                    </div>
                  </mat-expansion-panel>
                </mat-accordion> -->

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
                          <img src="./styles/images/search.svg" />
                          <input type="text" class="search-input" id="filter" #filter (keyup)="tree.treeModel.filterNodes(filter.value)" placeholder="Search for a group"/>
                        </div>
                        <button mat-raised-button>Activate all</button>
                      </div>
                      <tree-root [focused]="true" [nodes]="nodes" #tree>
                        <ng-template #treeNodeTemplate let-node let-index="index">
                          <span>{{node.data.name}}</span>
                          <mat-slide-toggle></mat-slide-toggle>
                        </ng-template>
                      </tree-root>
                    </div>
                  </mat-expansion-panel>
                </mat-accordion>

                <!--Scaffold controls-->

                <mat-accordion *ngIf="!!scaffolds">
                  <mat-expansion-panel>
                    <mat-expansion-panel-header>
                      <mat-panel-title>
                        Scaffolds
                      </mat-panel-title>
                    </mat-expansion-panel-header>

                    <div class="default-box">
                      <div class="default-box-header">
                        <div class="search-bar">
                          <img src="./styles/images/search.svg" />
                          <input type="text" class="search-input" placeholder="Search for a group" name="searchTermScaffolds" [(ngModel)]="searchTermScaffolds" (input)="searchScaffold($event.target.value)" />
                          <img *ngIf="searchTermScaffolds !== ''" src="./styles/images/close.svg" class="input-clear" (click)="clearSearch('searchTermScaffold', 'filteredScaffolds', 'scaffolds')" />
                        </div>
                      </div>
                      <div class="wrap" *ngFor="let scaffold of filteredScaffolds">
                        <mat-slide-toggle [checked]= "!scaffold.hidden" (change)= "onToggleGroup.emit(scaffold)">{{scaffold._parent? scaffold._parent.id + ":" : ""}}{{scaffold.name || scaffold.id}}</mat-slide-toggle>
                      </div>
                    </div>
                  </mat-expansion-panel>
                </mat-accordion>

                <!-- Settings -->
                <mat-accordion *ngIf="!!scaffolds">
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

                      <div class="settings-wrap">
                        <h5>Labels</h5>
                        <div class="wrap" *ngFor="let labelClass of _labelClasses">
                          <mat-slide-toggle matTooltip="Toggle labels" [checked]="config.labels[labelClass]" (change)="updateLabels(labelClass)"><img src="./styles/images/toggle-icon.svg" />{{labelClass}}</mat-slide-toggle>
                          <mat-radio-group [(ngModel)]="_labels[labelClass]" *ngIf="config.labels[labelClass]">
                              <mat-radio-button *ngFor="let labelProp of _labelProps"
                                  [value]="labelProp"
                                  (change)="onUpdateLabelContent.emit(_labels)"> {{labelProp}}
                              </mat-radio-button>
                          </mat-radio-group>
                        </div>
                      </div>

                      <div class="settings-wrap">
                        <h5>Helpers</h5>
                        <div class="wrap" *ngFor="let helper of _helperKeys">
                          <mat-slide-toggle matTooltip="Toggle planes" [checked]="_showHelpers.has(helper)" (change)="toggleHelperPlane(helper)">{{helper}}</mat-slide-toggle>
                        </div>
                      </div>

                    </div>


                  </mat-expansion-panel>
                </mat-accordion>
            </section>
    `,
    styles: [`
        :host >>> fieldset {
            border: 0.067rem solid ${COLORS.grey};
            margin: 0.134rem;
        }

        :host >>> legend {
            padding: 0.2em 0.5em;
            border : 0.067rem solid ${COLORS.grey};
            color  : ${COLORS.grey};
            font-size: 90%;
            text-align: right;
        }

        .default-box .default-box-header {
          padding: 1.067rem;
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
          border: 0.067rem solid ${COLORS.inputBorderColor};
          box-sizing: border-box;
          border-radius: 0.134rem;
          margin: 0;
          height: 2.134rem;
          color: ${COLORS.inputTextColor};
          font-weight: 500;
          font-size: 0.8rem;
          line-height: 1.067rem;
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
          font-weight: 500;
          font-size: 0.8rem;
          line-height: 1.067rem;
          padding: 0 0.534rem 0 1.734rem;
        }

        .search-bar {
          position: relative;
        }

        .search-bar img {
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

        /* .search-bar .mat-form-field-subscript-wrapper {
          display: none;
        } */

        .default-box h4 {
          background: ${COLORS.headingBg};
          padding: 0.8rem 1.067rem;
          font-weight: 500;
          font-size: 0.8rem;
          line-height: 0.934rem;
          color: ${COLORS.black};
          margin: 0;
        }

        .default-box .wrap {
          padding: 0 1.067rem;
        }

        .default-box .wrap .mat-slide-toggle {
          padding: 0.267rem 0;
        }

        .default-box .mat-slide-toggle {
          height: auto;
          display: flex;
          width: 100%;
        }

        :host ::ng-deep .mat-tree-node {
          min-height: 0.067rem;
          padding: 0.267rem 0;
          font-size: 0.8rem;
          line-height: 1.067rem;
          flex-grow: 1;
          display: flex;
          align-items: center;
          color: ${COLORS.inputTextColor};
        }

        :host ::ng-deep .mat-tree-node .mat-tree-node {
          padding: 0;
        }

         :host ::ng-deep .mat-tree-node > li {
          flex-grow: 1;
          display: flex;
          align-items: center;
        }

        :host ::ng-deep .mat-tree {
          padding: 0 1.067rem;
          display: block;
        }

        :host ::ng-deep .mat-tree-node button {
          padding: 0;
          border: none;
          background: transparent;
          width: auto;
          height: auto;
        }

        :host ::ng-deep .mat-nested-tree-node {
          display: block;
        }

        :host ::ng-deep .mat-tree-node button {
          width: 1.067rem;
          height: 1.067rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.934rem;
          cursor: pointer;
          margin-right: 0.534rem;
          color: ${COLORS.black};
        }

        .default-box > .mat-tree > .mat-nested-tree-node + .mat-nested-tree-node {
          border-top: 0.067rem solid ${COLORS.inputBorderColor};
          padding-top: 0.534rem;
          margin-top: 0.534rem;
        }

        :host ::ng-deep .mat-nested-tree-node ul button {
          color: ${COLORS.inputTextColor};
        }

        :host ::ng-deep .mat-nested-tree-node ul button[disabled="true"] {
          display: none;
        }

        :host ::ng-deep .mat-nested-tree-node ul {
          margin: 0;
          padding: 0 0 0 1.6rem;
        }

        :host ::ng-deep .mat-nested-tree-node ul .mat-slide-toggle-content {
          color: ${COLORS.inputTextColor};
        }

        :host ::ng-deep .mat-radio-label {
          display: flex;
        }

        :host ::ng-deep .mat-radio-label-content {
          font-size: 0.8rem;
          line-height: 1.067rem;
          flex-grow: 1;
          display: flex;
          align-items: center;
          color: ${COLORS.inputTextColor};
        }

        :host ::ng-deep .mat-slide-toggle-label {
          flex-direction: row-reverse;
        }

        :host ::ng-deep .mat-radio-container {
          width: 0.934rem;
          height: 0.934rem;
        }

        :host ::ng-deep .mat-radio-outer-circle {
          width: 100%;
          height: 100%;
          border-width: 0.067rem;
          border-color: ${COLORS.inputTextColor};
        }

        :host ::ng-deep .mat-radio-button.mat-accent.mat-radio-checked .mat-radio-outer-circle {
          border-color: ${COLORS.toggleActiveBg};
        }

        :host ::ng-deep .mat-radio-button.mat-accent .mat-radio-inner-circle,
        :host ::ng-deep .mat-radio-button.mat-accent .mat-radio-ripple .mat-ripple-element:not(.mat-radio-persistent-ripple),
        :host ::ng-deep .mat-radio-button.mat-accent.mat-radio-checked .mat-radio-persistent-ripple,
        :host ::ng-deep .mat-radio-button.mat-accent:active .mat-radio-persistent-ripple {
          background-color: ${COLORS.toggleActiveBg};
        }

        :host ::ng-deep .mat-radio-inner-circle {
          width: 0.8rem;
          height: 0.8rem;
          left: 0.067rem;
          top: 0.067rem;
        }

        :host ::ng-deep .mat-slide-toggle-content {
          font-size: 0.8rem;
          line-height: 1.067rem;
          flex-grow: 1;
          display: flex;
          align-items: center;
          color: ${COLORS.black};
        }

        :host ::ng-deep .mat-slide-toggle-content img {
          margin-right: 0.534rem;
          transform: rotate(0deg);
          transition: all ease-in-out .3s;
        }

        :host ::ng-deep .mat-slide-toggle-bar {
          width: 2.134rem;
          height: 1.067rem;
          margin-right: 0;
          margin-left: 0.534rem;
          background: ${COLORS.inputBorderColor};
        }

        :host ::ng-deep .mat-slide-toggle-thumb-container {
          width: auto; height: auto;
          top: 0.134rem;
          left: 0.134rem;
        }

        :host ::ng-deep .mat-radio-button {
          display: flex;
          padding: 0.267rem 1.067rem 0.267rem 1.6rem;
        }

        :host ::ng-deep .mat-slide-toggle.mat-checked .mat-slide-toggle-content img {
          transform: rotate(90deg);
          transition: all ease-in-out .3s;
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
          box-shadow: 0 0.067rem 0.334rem rgba(0, 0, 0, 0.2);
          border-radius: 0.534rem;
          width: 0.8rem;
          height: 0.8rem;
        }

        :host ::ng-deep button.mat-raised-button {
          border: 0.067rem solid ${COLORS.inputBorderColor};
          padding: 0.534rem;
          color: ${COLORS.inputTextColor};
          font-weight: 500;
          font-size: 0.8rem;
          margin-left: 0.534rem;
          box-shadow: none;
          line-height: 1.067rem;
          border-radius: 0.134rem;
          flex-shrink: 0;
        }

        :host ::ng-deep .mat-button-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        :host ::ng-deep button.mat-raised-button .fa {
          display: block;
          margin-right: 0.267rem;
        }

        :host ::ng-deep .mat-expansion-indicator::after {
          display: block;
          border-color: ${COLORS.black};
          border-width: 0 0.067rem 0.067rem 0;
        }

        .default-box {
          padding-bottom: 1.067rem;
        }

        .default-box h5 {
          padding: 0.8rem 0;
          margin: 0 1.067rem;
          font-weight: 500;
          color: ${COLORS.black};
          font-size: 0.8rem;
          line-height: 0.934rem;
          display: flex;
          align-items: center;
        }

        .settings-wrap {
          padding-bottom: 0.8rem;
          margin-top: 0;
          position: relative;
        }


        :host ::ng-deep .mat-expansion-panel {
          box-shadow: none;
          border-top: 0.067rem solid ${COLORS.inputBorderColor};
          border-radius: 0 !important;
        }

        :host ::ng-deep .mat-expansion-panel-header {
          background: ${COLORS.headingBg};
          padding: 0.8rem 1.067rem;
          box-sizing: border-box;
          height: 2.534rem !important;
        }

        :host ::ng-deep .mat-expansion-panel-header.mat-expanded {
          background: ${COLORS.headingBg} !important;
        }

        :host ::ng-deep .mat-expansion-panel-header:hover {
          background: ${COLORS.headingBg} !important;
        }

        :host ::ng-deep .mat-expansion-panel-header-title {
          font-size: 0.8rem;
          line-height: 0.934rem;
          color: ${COLORS.black};
        }

        :host ::ng-deep .mat-expansion-panel-body {
          padding: 0;
        }

        .dynamic-tree-invisible {
          display: none;
        }

        .dynamic-tree ul,
        .dynamic-tree li {
          list-style-type: none;
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
    searchTerm = '';
    filteredGroups;
    searchTermScaffolds = '';
    filteredScaffolds;
    nodes;
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
        this.searchTerm = '';
        this.searchTermScaffolds = '';
        this.nodes = TREE_DATA;
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

    activateAllGroup = () => {
      for(let group of this.groups) {
        if(group.hidden) {
          this.onToggleGroup.emit(group);
        }
      }
    }

    search(value, filterOptions, allOptions) {
      this[filterOptions] = this[allOptions].filter((val) => val.name.toLowerCase().includes(value?.toLowerCase()));
    }

    searchScaffold(value) {
      this.filteredScaffolds = this.scaffolds.filter((scaffold) => {
        const lowerCaseValue = value?.toLowerCase();
        const displayTerm = ((scaffold._parent ? scaffold._parent.id + ":" : "") + scaffold.name).toLowerCase() ;
        return displayTerm.includes(lowerCaseValue) || scaffold?._parent?.id?.toLowerCase()?.includes(lowerCaseValue) || scaffold?.name?.toLowerCase()?.includes(lowerCaseValue);
      });
    }

    ngOnInit() {
      this.filteredGroups = this.groups;
      this.filteredScaffolds = this.scaffolds;
    }

    clearSearch(term, filterOptions, allOptions) {
      this[term] = '';
      this[filterOptions] = this[allOptions];
    }
}

@NgModule({
    imports: [CommonModule, FormsModule, ReactiveFormsModule, ResourceInfoModule, ExternalSearchModule,
        MatSliderModule, SearchBarModule, MatCheckboxModule, MatRadioModule, LogInfoModule, MatSlideToggleModule, MatIconModule, MatInputModule, MatButtonModule, MatExpansionModule, TreeModule],
    declarations: [SettingsPanel, StopPropagation],
    entryComponents: [LogInfoDialog],
    exports: [SettingsPanel]
})
export class SettingsPanelModule {
}