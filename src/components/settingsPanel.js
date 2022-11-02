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
import {$Field, $SchemaClass} from "../model";
import {StopPropagation} from "./gui/stopPropagation";
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatInputModule} from '@angular/material/input';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatExpansionModule} from '@angular/material/expansion';
//import {TreeModule} from '@circlon/angular-tree-component';
import {ResourceVisibility} from "./gui/resourceVisibility";
import { buildNeurulatedTriplets, autoLayoutNeuron, handleNeurulatedGroup, toggleScaffoldsNeuroview, toggleGroupLyphsView } from "../view/render/neuroView";

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
  selector: "settingsPanel",
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <section>
      <!--Highlighted entity-->
      <mat-accordion>
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title> Highlighted </mat-panel-title>
          </mat-expansion-panel-header>
          <div class="default-box pb-0">
            <div *ngIf="config.highlighted" class="default-boxContent">
              <resourceInfoPanel
                *ngIf="!!highlighted"
                [resource]="highlighted"
              ></resourceInfoPanel>
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
            <mat-panel-title> Selected </mat-panel-title>
          </mat-expansion-panel-header>
          <div class="default-box pb-0">
            <div class="default-searchBar default-box-header">
              <div class="search-bar">
                <img src="./styles/images/search.svg" />
                <searchBar
                  [selected]="_selectedName"
                  [searchOptions]="searchOptions"
                  (selectedItemChange)="selectBySearch($event)"
                >
                </searchBar>
              </div>
            </div>
            <div *ngIf="config.selected" class="default-boxContent">
              <resourceInfoPanel *ngIf="!!_selected" [resource]="_selected">
              </resourceInfoPanel>
              <!--                            <button *ngIf="!!_selected" title="Edit"-->
              <!--                                    class="w3-hover-light-grey" (click)="onEditResource.emit(_selected)">-->
              <!--                                <i class="fa fa-edit"> </i>-->
              <!--                            </button> -->
              <sciGraphSearch [selected]="_selected"> </sciGraphSearch>
            </div>
          </div>
        </mat-expansion-panel>
      </mat-accordion>

      <!--Group controls-->

      <mat-accordion *ngIf="!!groups">
        <mat-expansion-panel [expanded]="true">
          <mat-expansion-panel-header>
            <mat-panel-title> Groups </mat-panel-title>
          </mat-expansion-panel-header>

          <div class="default-box">
            <div class="default-box-header">
              <div class="search-bar">
                <img src="./styles/images/search.svg" />
                <input
                  type="text"
                  class="search-input"
                  placeholder="Search for a group"
                  name="searchTerm"
                  [(ngModel)]="searchTerm"
                  (input)="
                    search($event.target.value, 'filteredGroups', 'groups')
                  "
                />
                <img
                  *ngIf="searchTerm !== ''"
                  src="./styles/images/close.svg"
                  class="input-clear"
                  (click)="
                    clearSearch('searchTerm', 'filteredGroups', 'groups')
                  "
                />
              </div>
              <button
                mat-raised-button
                (click)="toggleAllGroups()"
                [disabled]="neuroViewEnabled"
              >
                Toggle all
              </button>
            </div>
            <div class="wrap" *ngFor="let group of filteredGroups">
              <mat-slide-toggle
                class="toggle-group"
                [checked]="!group.hidden"
                (change)="toggleGroup($event, group)"
                >{{ group.namespace ? group.namespace + ":" : ""
                }}{{ group.name || group.id }}</mat-slide-toggle
              >
            </div>
            <!--Tree structure-->
            <!-- <tree-root [focused]="true" [nodes]="nodes" #tree>
                          <ng-template #treeNodeTemplate let-node let-index="index">
                            <span>{{node.data.name}}</span>
                            <mat-slide-toggle></mat-slide-toggle>
                          </ng-template>
                          </tree-root> -->
            <!--Tree structure-->
          </div>
        </mat-expansion-panel>
      </mat-accordion>

      <mat-accordion *ngIf="!!dynamicGroups">
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title> Dynamic groups </mat-panel-title>
          </mat-expansion-panel-header>

          <div class="default-box">
            <div class="wrap">
              <mat-checkbox
                [(ngModel)]="neuroViewEnabled"
                (change)="enableNeuroview($event, true)"
                >Enable Neuroview</mat-checkbox
              >
            </div>
            <div class="default-box-header">
              <div class="search-bar">
                <img src="./styles/images/search.svg" />
                <input
                  type="text"
                  class="search-input"
                  id="filter"
                  #filter
                  placeholder="Search for a dynamic group"
                  name="searchDynamicTerm"
                  [(ngModel)]="searchDynamicTerm"
                  (input)="
                    search(
                      $event?.target?.value,
                      'filteredDynamicGroups',
                      'dynamicGroups'
                    )
                  "
                />
                <!--<input type="text" class="search-input" id="filter" #filter (keyup)="tree.treeModel.filterNodes(filter.value)" placeholder="Search for a group"/>-->
                <img
                  *ngIf="filter.value !== ''"
                  src="./styles/images/close.svg"
                  class="input-clear"
                  (click)="clearTreeSearch(filter, tree)"
                />
              </div>
              <button mat-raised-button (click)="toggleAllDynamicGroup()">
                Toggle all
              </button>
            </div>
            <div class="wrap" *ngFor="let group of filteredDynamicGroups">
              <mat-slide-toggle
                [checked]="!group.hidden"
                (change)="toggleGroup($event, group)"
                >{{ group.name || group.id }}</mat-slide-toggle
              >
            </div>
            <!--Tree structure-->
            <!-- <tree-root [focused]="true" [nodes]="nodes" #tree>
                          <ng-template #treeNodeTemplate let-node let-index="index">
                            <span>{{node.data.name}}</span>
                            <mat-slide-toggle></mat-slide-toggle>
                          </ng-template>
                        </tree-root> -->
            <!--Tree structure-->
          </div>
        </mat-expansion-panel>
      </mat-accordion>

      <!--Scaffold controls-->

      <mat-accordion *ngIf="scaffolds && scaffolds.length > 0">
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title> Scaffolds </mat-panel-title>
          </mat-expansion-panel-header>

          <div class="default-box">
            <div class="default-box-header">
              <div class="search-bar">
                <img src="./styles/images/search.svg" />
                <input
                  type="text"
                  class="search-input"
                  placeholder="Search for a group"
                  name="searchTermScaffolds"
                  [(ngModel)]="searchTermScaffolds"
                  (input)="searchScaffold($event.target.value)"
                />
                <img
                  *ngIf="searchTermScaffolds !== ''"
                  src="./styles/images/close.svg"
                  class="input-clear"
                  (click)="
                    clearSearch(
                      'searchTermScaffold',
                      'filteredScaffolds',
                      'scaffolds'
                    )
                  "
                />
              </div>
            </div>
            <div class="wrap" *ngFor="let scaffold of filteredScaffolds">
              <mat-slide-toggle
                [checked]="!scaffold.hidden"
                (change)="toggleScaffold(scaffold)"
                >{{ scaffold._parent ? scaffold._parent.id + ":" : ""
                }}{{ scaffold.name || scaffold.id }}</mat-slide-toggle
              >
            </div>
          </div>

          <!-- Component visibility -->
          <resourceVisibility
            title="Component visibility"
            [renderedResources]="renderedComponents"
            [dependentProperties]="['anchors', 'wires', 'regions']"
          >
          </resourceVisibility>

          <div class="default-box">
            <div class="settings-wrap">
              <div class="wrap">
                <mat-slide-toggle
                  matTooltip="Toggle scaffold resource visibility"
                  (change)="toggleVisibility()"
                  [checked]="scaffoldResourceVisibility"
                  >Show all resources
                </mat-slide-toggle>
              </div>
            </div>
          </div>

          <!-- Wire visibility -->
          <resourceVisibility
            title="Wire visibility"
            [renderedResources]="renderedWires"
          >
          </resourceVisibility>

          <!-- Regions visibility -->
          <resourceVisibility
            title="Region visibility"
            [renderedResources]="renderedRegions"
            [dependentProperties]="['facets', 'borderAnchors']"
          >
          </resourceVisibility>

          <!-- Anchor visibility -->
          <resourceVisibility
            title="Anchor visibility"
            [renderedResources]="renderedAnchors"
          >
          </resourceVisibility>
        </mat-expansion-panel>
      </mat-accordion>

      <!-- Settings -->
      <mat-accordion>
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title> Settings </mat-panel-title>
          </mat-expansion-panel-header>

          <div class="default-box">
            <div class="settings-wrap">
              <h5>Layout</h5>

              <div class="wrap">
                <mat-slide-toggle
                  matTooltip="Toggle view mode"
                  (change)="toggleMode()"
                  [checked]="config.layout.numDimensions === 2"
                  >2D mode
                </mat-slide-toggle>
              </div>

              <div class="wrap">
                <mat-slide-toggle
                  matTooltip="Toggle lyphs"
                  (change)="toggleLayout('showLyphs')"
                  [checked]="config.layout.showLyphs"
                  >Lyphs
                </mat-slide-toggle>
              </div>

              <div class="wrap">
                <mat-slide-toggle
                  matTooltip="Toggle layers"
                  [disabled]="!config.layout.showLyphs"
                  (change)="toggleLayout('showLayers')"
                  [checked]="config.layout.showLayers"
                  >Layers
                </mat-slide-toggle>
              </div>

              <div class="wrap">
                <mat-slide-toggle
                  matTooltip="Toggle 3D lyphs"
                  [disabled]="!config.layout.showLyphs"
                  (change)="toggleLayout('showLyphs3d')"
                  [checked]="config.layout.showLyphs3d"
                  >Lyphs 3D
                </mat-slide-toggle>
              </div>

              <div class="wrap">
                <mat-slide-toggle
                  matTooltip="Toggle coalescences"
                  [disabled]="!config.layout.showLyphs"
                  (change)="toggleLayout('showCoalescences')"
                  [checked]="config.layout.showCoalescences"
                  >Coalescences
                </mat-slide-toggle>
              </div>
            </div>

            <div class="settings-wrap">
              <h5>Labels</h5>
              <div class="wrap" *ngFor="let labelClass of _labelClasses">
                <mat-slide-toggle
                  matTooltip="Toggle labels"
                  [checked]="config.showLabels[labelClass]"
                  (change)="updateShowLabels(labelClass)"
                  ><img src="./styles/images/toggle-icon.svg" />{{
                    labelClass
                  }}</mat-slide-toggle
                >
                <mat-radio-group
                  [(ngModel)]="config.labels[labelClass]"
                  *ngIf="config.showLabels[labelClass]"
                >
                  <mat-radio-button
                    *ngFor="let labelProp of _labelProps"
                    [value]="labelProp"
                    (change)="updateLabelContent(labelClass, labelProp)"
                  >
                    {{ labelProp }}
                  </mat-radio-button>
                </mat-radio-group>
              </div>
            </div>

            <div class="settings-wrap">
              <h5>Helpers</h5>
              <div class="wrap" *ngFor="let helper of _helperKeys">
                <mat-slide-toggle
                  matTooltip="Toggle planes"
                  [checked]="_showHelpers.has(helper)"
                  (change)="toggleHelperPlane(helper)"
                  >{{ helper }}</mat-slide-toggle
                >
              </div>
            </div>
          </div>
        </mat-expansion-panel>
      </mat-accordion>
    </section>
  `,
  styles: [
    `
      :host >>> fieldset {
        border: 0.067rem solid ${COLORS.grey};
        margin: 0.134rem;
      }

      :host >>> legend {
        padding: 0.2em 0.5em;
        border: 0.067rem solid ${COLORS.grey};
        color: ${COLORS.grey};
        font-size: 90%;
        text-align: right;
      }

      .pb-0 {
        padding-bottom: 0 !important;
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

      .default-box .default-boxContent {
        padding: 1.067rem;
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
      :host >>> .default-box .default-boxContent .w3-label {
        width: 6.25rem;
        flex: none;
      }
      :host >>> .default-box .default-boxContent button {
        border: ${COLORS.inputBorderColor} 1px solid;
        background: transparent;
        color: ${COLORS.inputTextColor};
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.313rem 0.625rem;
        margin: 0.625rem 0 0;
        cursor: pointer;
      }
      :host >>> .default-box .default-boxContent button img {
        position: relative;
        top: -2px;
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
      :host
        >>> .default-searchBar
        .mat-form-field-appearance-legacy
        .mat-form-field-underline {
        display: none;
      }
      :host
        >>> .default-searchBar
        .mat-form-field-appearance-legacy
        .mat-form-field-wrapper {
        padding-bottom: 0;
      }
      :host
        >>> .default-searchBar
        .mat-form-field-should-float
        .mat-form-field-label {
        display: none !important;
      }
      :host >>> .default-searchBar .search-bar img {
        z-index: 10;
      }
      :host >>> .default-searchBar .mat-form-field-label {
        padding-left: 1.625rem;
        top: 1.5em;
        color: ${COLORS.inputPlacholderColor};
        font-size: 0.75rem;
        font-weight: 500;
      }
      :host >>> .default-searchBar .mat-form-field-infix {
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
        padding: 0.5rem 2rem 0 2rem;
      }
      :host >>> .default-searchBar .mat-focused .mat-form-field-infix {
        outline: none;
        border-color: ${COLORS.toggleActiveBg};
        box-shadow: 0 0 0 2px rgba(97, 61, 176, 0.1);
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

      :host ::ng-deep .default-box .wrap {
        padding: 0 1.067rem;
        display: flex;
      }

      :host ::ng-deep .default-box .wrap-neurulated {
        padding: 0 1.067rem;
        display: flex;
      }

      :host ::ng-deep .default-box .toggle-group {
        padding: 0 1.067rem;
        display: flex;
      }

      :host ::ng-deep .default-box .wrap .mat-slide-toggle {
        padding: 0.267rem 0;
      }

      :host ::ng-deep .default-box .mat-slide-toggle {
        height: auto;
        display: flex;
        width: 100%;
      }

      :host ::ng-deep .angular-tree-component {
        padding: 0 1.067rem;
        max-width: 100%;
        width: auto;
        display: block;
      }

      :host ::ng-deep .node-content-wrapper {
        flex-grow: 1;
        display: flex;
        align-items: center;
        padding: 0;
        border-radius: 0;
      }

      :host ::ng-deep .angular-tree-component {
        cursor: default;
      }

      :host ::ng-deep .node-content-wrapper-focused {
        background: transparent;
        box-shadow: none;
      }

      :host ::ng-deep .node-drop-slot {
        height: 0.06667rem;
        background: ${COLORS.inputBorderColor};
        margin: 0.5334rem 0 0;
        display: none;
      }

      :host ::ng-deep .node-content-wrapper:hover {
        box-shadow: none;
        background: transparent;
      }

      :host ::ng-deep .node-content-wrapper tree-node-content {
        flex-grow: 1;
        display: flex;
        align-items: center;
      }

      :host ::ng-deep tree-node-collection > div > tree-node {
        display: block;
      }

      :host
        ::ng-deep
        .angular-tree-component
        > tree-node-collection
        > div
        > tree-node
        + tree-node {
        border-top: 0.067rem solid ${COLORS.inputBorderColor};
        padding-top: 0.534rem;
        margin-top: 0.534rem;
      }

      :host ::ng-deep tree-node-expander {
        display: block;
      }

      :host ::ng-deep tree-node-expander * {
        box-sizing: border-box;
      }

      :host ::ng-deep .toggle-children-wrapper {
        display: block;
      }

      :host ::ng-deep .toggle-children {
        display: block;
        width: 0;
        height: 0;
        border-style: solid;
        margin-right: 0.8rem;
        background: none;
        top: 0;
        border-width: 0.23334rem 0 0.23334rem 0.26667rem;
        border-color: transparent transparent transparent
          ${COLORS.inputTextColor};
      }

      :host
        ::ng-deep
        .angular-tree-component
        > tree-node-collection
        > div
        > tree-node
        > .tree-node
        > tree-node-wrapper
        > .node-wrapper {
        color: ${COLORS.black};
      }

      :host
        ::ng-deep
        .angular-tree-component
        > tree-node-collection
        > div
        > tree-node
        > .tree-node
        > tree-node-wrapper
        > .node-wrapper
        .node-content-wrapper
        tree-node-content
        > span {
        border-color: transparent transparent transparent ${COLORS.black};
      }

      :host
        ::ng-deep
        tree-node-collection
        > div
        > tree-node:last-child
        .node-drop-slot:last-child {
        display: none;
        margin-top: 0;
      }

      :host ::ng-deep .toggle-children-wrapper {
        padding: 0;
      }

      :host ::ng-deep .node-content-wrapper tree-node-content > span {
        flex-grow: 1;
      }

      :host
        ::ng-deep
        .node-content-wrapper
        tree-node-content
        .mat-slide-toggle {
        width: auto !important;
      }

      :host ::ng-deep .node-content-wrapper:hover {
        box-shadow: none;
      }

      :host ::ng-deep .node-wrapper {
        min-height: 0.067rem;
        padding: 0.267rem 0;
        font-size: 0.8rem;
        line-height: 1.067rem;
        flex-grow: 1;
        display: flex;
        align-items: center;
        color: ${COLORS.inputTextColor};
      }

      :host ::ng-deep tree-node-children .node-drop-slot {
        display: none;
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

      :host
        ::ng-deep
        .mat-radio-button.mat-accent.mat-radio-checked
        .mat-radio-outer-circle {
        border-color: ${COLORS.toggleActiveBg};
      }

      :host ::ng-deep .mat-radio-button.mat-accent .mat-radio-inner-circle,
      :host
        ::ng-deep
        .mat-radio-button.mat-accent
        .mat-radio-ripple
        .mat-ripple-element:not(.mat-radio-persistent-ripple),
      :host
        ::ng-deep
        .mat-radio-button.mat-accent.mat-radio-checked
        .mat-radio-persistent-ripple,
      :host
        ::ng-deep
        .mat-radio-button.mat-accent:active
        .mat-radio-persistent-ripple {
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
        transition: all ease-in-out 0.3s;
      }

      :host ::ng-deep .mat-slide-toggle-bar {
        width: 2.134rem;
        height: 1.067rem;
        margin-right: 0;
        margin-left: 0.534rem;
        background: ${COLORS.inputBorderColor};
      }

      :host ::ng-deep .mat-slide-toggle-thumb-container {
        width: auto;
        height: auto;
        top: 0.134rem;
        left: 0.134rem;
      }

      :host ::ng-deep .mat-radio-button {
        display: flex;
        padding: 0.267rem 1.067rem 0.267rem 1.6rem;
      }

      :host
        ::ng-deep
        .mat-slide-toggle.mat-checked
        .mat-slide-toggle-content
        img {
        transform: rotate(90deg);
        transition: all ease-in-out 0.3s;
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

      :host ::ng-deep .settings-wrap {
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
    `,
  ],
})
export class SettingsPanel {
  _config;
  _scaffolds;
  _helperKeys;
  _showHelpers;
  _labelProps;
  _labelClasses;
  _selectedName;
  _modelId;
  searchTerm = "";
  filteredGroups;
  filteredDynamicGroups;
  searchTermScaffolds = "";
  filteredScaffolds;
  nodes;
  previousId = "";
  activeNeurulatedComponents = { groups: [], components: [] };

  scaffoldResourceVisibility: Boolean = false;
  renderedComponents;
  renderedWires;
  renderedRegions;
  renderedAnchors;

  @Input() graphData;

  @Input() groups;

  @Input() dynamicGroups;

  @Input("scaffolds") set scaffolds(newScaffolds) {
    this._scaffolds = newScaffolds;
    this.updateRenderedResources();
  }

  @Input("config") set config(newConfig) {
    if (this._config !== newConfig) {
      this._config = newConfig;
      this._labelClasses = this._config[$Field.labels]::keys();
      let ids = this._config.visibleGroups || [];
      this._showGroups = new Set(
        (this.groups || []).filter((g) => ids.includes(g.id))
      );
    }
  }

  @Input("helperKeys") set helperKeys(newHelperKeys) {
    if (this._helperKeys !== newHelperKeys) {
      this._helperKeys = newHelperKeys;
      this._showHelpers = new Set([]);
    }
  }

  @Input("modelId") set modelId(modelId) {
    if (this._modelId !== modelId) {
      this._modelId = modelId;
    }
  }

  @Input("selected") set selected(entity) {
    if (this.selected !== entity) {
      this._selected = entity;
      this._selectedName = entity ? entity.name || "" : "";
    }
  }
  @Input() searchOptions;
  @Input() highlighted;

  @Output() onSelectBySearch = new EventEmitter();
  @Output() onOpenExternal = new EventEmitter();
  @Output() onEditResource = new EventEmitter();
  @Output() onUpdateShowLabels = new EventEmitter();
  @Output() onUpdateLabelContent = new EventEmitter();
  @Output() onToggleGroup = new EventEmitter();
  @Output() onToggleMode = new EventEmitter();
  @Output() onToggleLayout = new EventEmitter();
  @Output() onToggleHelperPlane = new EventEmitter();
  @Output() onToggleNeurulatedGroup = new EventEmitter();

  constructor() {
    this._labelProps = [$Field.id, $Field.name];
    this._showHelpers = new Set([]);
    this.searchTerm = "";
    this.searchTermScaffolds = "";
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

  selectBySearch(name) {
    if (name !== this._selectedName) {
      this._selectedName = name;
      this.onSelectBySearch.emit(name);
    }
  }

  toggleMode() {
    this.config.layout.numDimensions =
      this.config.layout.numDimensions === 3 ? 2 : 3;
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
    let scaffoldResourceNames = [
      "renderedComponents",
      "renderedWires",
      "renderedRegions",
      "renderedAnchors",
    ];
    scaffoldResourceNames.forEach((prop) => (this[prop] = []));
    (this.scaffolds || []).forEach((s) => {
      //Only include wires from the scaffold, no components
      if (s.class === $SchemaClass.Scaffold && !s.hidden) {
        (s.components || []).forEach((r) => {
          r._parent = s;
          r._visible = true;
          this.renderedComponents.push(r);
        });
        if (this.scaffoldResourceVisibility) {
          (s.anchors || []).forEach((r) => {
            if (!r.generated) {
              r._parent = s;
              this.renderedAnchors.push(r);
            }
          });
          (s.wires || []).forEach((r) => {
            if (!r.generated) {
              r._parent = s;
              this.renderedWires.push(r);
            }
          });
          (s.regions || []).forEach((r) => {
            if (!r.generated) {
              r._parent = s;
              this.renderedRegions.push(r);
            }
          });
        }
      }
    });
    scaffoldResourceNames.forEach((prop) => {
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
    this.onUpdateLabelContent.emit(this.config.labels || {});
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
    let allVisible = this.groups.filter(
      (group) => group.hidden || group.undefined
    );

    for (let group of this.groups) {
      if (group.hidden || allVisible.length == 0) {
        this.onToggleGroup.emit(group);
      }
    }

    // If all groups are toggled, toggle dynamic groups too.
    this.toggleAllDynamicGroup();
  };

  hideVisibleGroups = () => {
    // Hide all visible
    let allVisible = this.dynamicGroups.filter((g) => g.hidden == false);
    // allVisible = allVisible.concat(this.activeNeurulatedComponents.groups);
    allVisible.forEach((g) => {
      g.lyphs.forEach((lyph) => {
        lyph.hidden = true;
      });
      this.onToggleGroup.emit(g);
    });
  };

  toggleGroup = (event, group) => {
    if (this.neuroViewEnabled) {
      // event.checked ? this.toggleNeuroView(false) : this.toggleNeuroView(true);
      this.activeNeurulatedComponents?.components?.forEach(
        (component) => (component.inactive = false)
      );

      // Hide all groups
      this.hideVisibleGroups();

      // FIXME : uNTOGGLE GROUPS
      // this.onToggleGroup.emit(group);

      this.scaffolds.forEach((scaffold) => {
        if (scaffold.hidden !== true) {
          this.onToggleGroup.emit(scaffold);
        }
      });

      this.activeNeurulatedComponents = { groups: [], components: [] };

      // Step 3 and 4: Switch on visibility of group. Toggle ON visibilty of group's lyphs if they are neuron segments only.
      console.log("Neurons for group : ", group);
      let neuronTriplets = buildNeurulatedTriplets(group);
      console.log("Triplets : ", neuronTriplets);
      handleNeurulatedGroup(event.checked, group, neuronTriplets);
      if (event.checked) {
        // Step 5 :Identify TOO Map components and turn them ON
        // Step 6 : Turn ON wire and regions that anchor group elements that are neuron segments
        const matchScaffolds = toggleScaffoldsNeuroview(
          this.scaffolds,
          this.activeNeurulatedComponents,
          neuronTriplets
        );
        if (matchScaffolds.length > 0) {
          matchScaffolds.forEach(
            (scaffold) =>
              scaffold.hidden !== false && this.onToggleGroup.emit(scaffold)
          );
        }
      }

      this.config.layout.showLayers && this.toggleLayout("showLayers");

      toggleGroupLyphsView(
        event,
        this.graphData,
        neuronTriplets, 
        this.activeNeurulatedComponents
      );
      this.onToggleNeurulatedGroup.emit();
      let that = this;
      window.addEventListener(
        "doneUpdating",
        () => {
          autoLayoutNeuron(neuronTriplets);
        }
      );

      console.log("all done now with webgl ");
    } else {
      this.onToggleGroup.emit(group);
    }
  };

  toggleAllDynamicGroup = () => {
    let allVisible = this.dynamicGroups.filter(
      (group) => group.hidden || group.undefined
    );

    for (let group of this.dynamicGroups) {
      if (group.hidden || allVisible.length == 0) {
        this.onToggleGroup.emit(group);
      }
    }
  };

  filterGroups = (groups) => {
    return groups;
  };

  // Step 1 : Default view in the left-hand side (LHS) viewing window is a blank: no parts of the TOO map are shown;
  toggleNeuroView = (visible) => {
    // Toggle visibility of scaffold components
    this.activeNeurulatedComponents?.components?.forEach(
      (component) => (component.inactive = !visible)
    );
    this.activeNeurulatedComponents.groups.forEach((g) => {
      handleNeurulatedGroup(visible, g, {});
    });
    this.hideVisibleGroups();
    this.scaffolds.forEach((scaffold) => {
      if (
        scaffold.hidden === visible ||
        (!visible && scaffold.hidden === undefined)
      ) {
        this.onToggleGroup.emit(scaffold);
      }
    });
    this.activeNeurulatedComponents = { groups: [], components: [] };
    this.updateRenderedResources();
  };

  /**
   * Neuroview mode, allows selecting only one dynamic group at a time.
   * @param {*} e - Checkbox event
   */
  enableNeuroview = (e) => {
    if (e.checked) {
      this.toggleNeuroView(false);
      this.config.layout.showLayers && this.toggleLayout("showLayers");
    } else {
      this.toggleNeuroView(true);
      !this.config.layout.showLayers && this.toggleLayout("showLayers");
    }
  };

  search(value, filterOptions, allOptions) {
    this[filterOptions] = this[allOptions]?.filter(
      (val) => val.name && val.name.toLowerCase().includes(value?.toLowerCase())
    );
  }

  searchScaffold(value) {
    this.filteredScaffolds = this.scaffolds.filter((scaffold) => {
      const lowerCaseValue = value?.toLowerCase();
      const displayTerm = (
        (scaffold._parent ? scaffold._parent.id + ":" : "") + scaffold.name
      ).toLowerCase();
      return (
        displayTerm.includes(lowerCaseValue) ||
        scaffold?._parent?.id?.toLowerCase()?.includes(lowerCaseValue) ||
        scaffold?.name?.toLowerCase()?.includes(lowerCaseValue)
      );
    });
  }

  ngOnInit() {
    this.previousId = this._modelId;
    this.filteredGroups = this.groups;
    this.filteredDynamicGroups = this.dynamicGroups;
    this.filteredScaffolds = this.scaffolds;
  }

  ngOnChanges() {
    if (this._modelId !== this.previousId) {
      this.previousId = this._modelId;
      this.search(this.searchTerm, "filteredGroups", "groups");
      this.search(this.searchTerm, "filteredDynamicGroups", "dynamicGroups");
      this.search(this.searchTerm, "filteredScaffolds", "scaffolds");
    }
    this.filteredGroups = this.filteredGroups || this.groups;
    this.filteredDynamicGroups =
      this.filteredDynamicGroups || this.dynamicGroups;
    this.filteredScaffolds = this.filteredScaffolds || this.scaffolds;
  }

  clearSearch(term, filterOptions, allOptions) {
    this[term] = "";
    this[filterOptions] = this[allOptions];
  }

  clearTreeSearch(filter, tree) {
    tree?.treeModel?.filterNodes("");
    filter.value = "";
  }
}

@NgModule({
    imports: [CommonModule, FormsModule, ReactiveFormsModule, ResourceInfoModule, ExternalSearchModule,
        MatSliderModule, SearchBarModule, MatCheckboxModule, MatRadioModule, LogInfoModule,
        MatSlideToggleModule, MatIconModule, MatInputModule, MatButtonModule, MatExpansionModule], //TreeModule],
    declarations: [SettingsPanel, StopPropagation, ResourceVisibility],
    entryComponents: [LogInfoDialog],
    exports: [SettingsPanel]
})
export class SettingsPanelModule {
}