import {NgModule, Component, Input, Output, EventEmitter} from '@angular/core';
import {MatDialog} from "@angular/material/dialog";
import {MatListModule} from '@angular/material/list';
import {MatMenuModule} from "@angular/material/menu";
import {CommonModule} from "@angular/common";
import {ResourceDeclarationModule} from "./resourceDeclarationEditor";
import {SearchAddBarModule} from "../gui/searchAddBar";
import {CheckboxFilterModule} from "../gui/checkboxFilter";
import {MatButtonModule} from '@angular/material/button';
import {MatDividerModule} from "@angular/material/divider";
import {cloneDeep, isObject, isNumber, sortBy, isArray, keys, values, entries} from 'lodash-bound';
import {ChainDeclarationModule} from "./chainDeclarationEditor";
import {MatSnackBar} from '@angular/material/snack-bar';
import {ICON, LyphTreeNode, LyphTreeViewModule} from "./lyphTreeView";
import {ResourceListViewModule, ListNode} from "./resourceListView";
import {COLORS} from '../utils/colors.js'
import {SearchOptions} from "../utils/searchOptions";
import {ResourceMaps} from "../utils/resourceMaps";
import {$Field, $SchemaClass, $Prefix, getGenID, getGenName} from "../../model";
import {LinkedResourceModule} from "../gui/linkedResource";
import {MatTabsModule} from "@angular/material/tabs";
import {ResourceEditor} from "./resourceEditor";
import {ResourceTreeNode, ResourceTreeViewModule} from "./resourceTreeView";
import {References} from "../utils/references";
import {MatTooltipModule} from "@angular/material/tooltip";
import {MatSelectModule} from "@angular/material/select";
import {MatFormFieldModule} from "@angular/material/form-field";
import cellOntoTermDefinitions from "../../data/cellOntoTerms.json";
import {defineNewResource, isIncluded, LYPH_TOPOLOGY} from "../../model/utils";
import {MaterialSelectDialog, MaterialSelectModule} from "../dialogs/materialSelectDialog";

@Component({
    selector: 'chainEditor',
    template: `
        <section #chainEditor id="chainEditor" class="w3-row w3-padding-16">
            <section #chainView id="chainView" [class.w3-threequarter]="showPanel">
                <section class="w3-col">
                    <resourceTreeView
                            listTitle="Chains"
                            [active]=true
                            [expanded]=false
                            [treeData]="chainList"
                            [selectedNode]="selectedNode"
                            [showColor]=true
                            [extraActions]="extraChainActions"
                            (onNodeClick)="selectChain($event)"
                            (onChange)="processChainChange($event)"
                            (onColorUpdate)="updateColor($event)"
                    >
                    </resourceTreeView>

                </section>
                <section class="w3-col">
                    <!-- Lyphs -->
                    <resourceListView *ngIf="selectedChain"
                                      listTitle="Lyphs"
                                      ordered=true
                                      expectedClass="Lyph"
                                      splitable=true
                                      [active]="activeList === 'lyphs'"
                                      [listData]="chainResources['lyphs']"
                                      [extraActions]="extraLyphActions"
                                      (onNodeClick)="selectLyph($event, 'lyphs')"
                                      (onChange)="processLyphChange($event)"
                    >
                    </resourceListView>
                </section>
                <section class="w3-col">
                    <!-- Lyph template -->
                    <div *ngIf="selectedChain" style="margin-right:80px;" class="w3-padding w3-margin-bottom w3-border">
                        <!-- Lyph template -->
                        <div class="title w3-padding-small">Lyph template</div>
                        <div class="resource-box w3-margin-top">
                            <div class="resource-boxContent">
                                {{selectedChain.lyphTemplate}}
                            </div>
                        </div>
                        <searchAddBar
                                [searchOptions]="searchOptions"
                                [selected]="candidateLyphTemplate?.id"
                                (selectedItemChange)="selectLyphTemplate($event)"
                                (addSelectedItem)="updateLyphTemplate($event)"
                        ></searchAddBar>

                        <!-- Num levels -->
                        <div class="title w3-padding-small">Number of levels</div>
                        <input type="number" matInput class="w3-input num-levels"
                               matTooltip="Number of levels in the chain"
                               min=0
                               max=100
                               [value]="selectedChain?.numLevels"
                               (input)="updateNumLevels($event.target.value)"
                        >
                    </div>

                    <!-- Level ontology terms -->
                    <div *ngIf="selectedChain" style="margin-right:80px;" class="w3-padding w3-margin-bottom w3-border">
                        <div class="title w3-padding-small">Level ontology terms</div>
                        <mat-form-field class="full-width"
                                        *ngFor="let levelOntologyTerm of chainResources['levelOntologyTerms']; let i = index">
                            <mat-select
                                    placeholder="Select a level annotation"
                                    [matTooltip]="'Level' + i"
                                    [value]="levelOntologyTerm"
                                    (selectionChange)="updateLevelOntoTerm(i, $event.value)">
                                <mat-option *ngFor="let option of cellOntoTerms" [value]="option.id">
                                    {{option.name}} ({{option.id}})
                                </mat-option>
                            </mat-select>
                        </mat-form-field>
                    </div>

                    <div *ngIf="selectedChain" style="margin-right:80px;" class="w3-padding w3-margin-bottom w3-border">
                        <!--Lyph template definition options -->
                        <mat-tab-group animationDuration="0ms" #tabChainMethod
                                       (selectedTabChange)="changeActiveList($event)">
                            <mat-tab class="w3-margin">
                                <!-- Housing lyph templates -->
                                <ng-template mat-tab-label>Housing lyph templates</ng-template>
                                <resourceListView *ngIf="selectedChain"
                                                  listTitle="Housing lyph templates"
                                                  expectedClass="Lyph"
                                                  [ordered]="false"
                                                  [labeled]="true"
                                                  [showLayerIndex]="true"
                                                  [active]="activeList === 'housingLyphTemplates'"
                                                  [listData]="chainResources['housingLyphTemplates']"
                                                  (onNodeClick)="selectLyph($event, 'housingLyphTemplates')"
                                                  (onChange)="processHousingLyphTemplateChange($event)"
                                                  (onLayerIndexChange)="processHousingLayerChange($event)"
                                >
                                </resourceListView>
                            </mat-tab>
                            <mat-tab class="w3-margin">
                                <!-- Housing lyphs -->
                                <ng-template mat-tab-label>Housing lyphs</ng-template>
                                <resourceListView *ngIf="selectedChain"
                                                  listTitle="Housing lyphs"
                                                  expectedClass="Lyph"
                                                  [ordered]="true"
                                                  [showLayerIndex]="true"
                                                  [active]="activeList === 'housingLyphs'"
                                                  [listData]="chainResources['housingLyphs']"
                                                  (onNodeClick)="selectLyph($event, 'housingLyphs')"
                                                  (onChange)="processHousingLyphChange($event)"
                                                  (onLayerIndexChange)="processHousingLayerChange($event)"
                                >
                                </resourceListView>
                            </mat-tab>
                        </mat-tab-group>

                    </div>
                    <resourceListView *ngIf="selectedChain?.levels"
                                      listTitle="Levels"
                                      [showMenu]="false"
                                      ordered=true
                                      expectedClass="Link"
                                      [listData]="chainResources['levels']"
                                      (onNodeClick)="selectLevel($event)"
                                      (onChange)="processLevelChange($event)"
                    >
                    </resourceListView>
                </section>
                <section class="w3-padding-right" style="position:relative;">
                    <section class="w3-bar-block w3-right vertical-toolbar" style="position:absolute; right:0">
                        <button class="w3-bar-item w3-hover-light-grey"
                                (click)="createChain()" title="New chain">
                            <i class="fa fa-file-pen"> </i>
                        </button>
                        <button class="w3-bar-item w3-hover-light-grey"
                                [disabled]="currentStep === 0"
                                (click)="showDiff()" title="Compare code">
                            <i class="fa fa-code-compare"> </i>
                        </button>
                        <mat-divider></mat-divider>
                        <button [disabled]="!canUndo" class="w3-bar-item"
                                (click)="undo()" [title]="undoTitle">
                            <i class="fa fa-rotate-left"> </i>
                        </button>
                        <button [disabled]="!canRedo" class="w3-bar-item"
                                (click)="redo()" [title]="redoTitle">
                            <i class="fa fa-rotate-right"> </i>
                        </button>
                        <button *ngIf="!showPanel" class="w3-bar-item w3-hover-light-grey"
                                (click)="showPanel = !showPanel" title="Show settings">
                            <i class="fa fa-cog"> </i>
                        </button>
                        <button *ngIf="showPanel" class="w3-bar-item w3-hover-light-grey"
                                (click)="showPanel = !showPanel" title="Hide settings">
                            <i class="fa fa-window-close"> </i>
                        </button>
                        <button class="w3-bar-item w3-hover-light-grey" (click)="saveChanges()"
                                title="Apply changes">
                            <div style="display: flex">
                                <i class="fa fa-check"> </i>
                                <span *ngIf="currentStep > 0" style="color: red">*</span>
                            </div>
                        </button>
                        <button [disabled]="currentStep > 0" class="w3-bar-item w3-hover-light-grey"
                                (click)="showInTheViewer()"
                                title="Show in the viewer">
                            <div style="display: flex">
                                <i class="fa fa-street-view"> </i>
                            </div>
                        </button>
                    </section>
                </section>
            </section>
            <section *ngIf="showPanel" class="w3-quarter w3-white settings-panel">
                <!-- Select lyph to link -->
                <linkedResource
                        [resource]="lyphToLink">
                </linkedResource>
                <searchAddBar
                        [searchOptions]="searchOptions"
                        [selected]="lyphToLink?.id"
                        (selectedItemChange)="selectLyphToLink($event)"
                        (addSelectedItem)="addLyph($event)"
                >
                </searchAddBar>
                <!-- level target -->
                <div class="resource-box" *ngIf="selectedLyph && (activeList === 'lyphs')">
                    <div class="resource-boxContent">
                        <div class="w3-padding w3-margin-bottom w3-border">
                            <div class="w3-margin-bottom"><b>{{selectedLyph.name || selecledLyph.id}}</b></div>
                            Level target: <b>{{selectedLyph._conveys?.target}}</b>
                        </div>
                    </div>
                </div>

                <chainDeclaration
                        [chain]="selectedChain"
                        [wireOptions]="wireOptions"
                        (onValueChange)="updateProperty($event)"
                        (onCreateLateral)="createLateral($event)"
                >
                </chainDeclaration>
                <lyphTreeView *ngIf="selectedLyph"
                              listTitle="Layers"
                              [ordered]="true"
                              [showMenu]="false"
                              [treeData]="layerTree"
                              (onNodeClick)="switchEditor($event)"
                >
                </lyphTreeView>
            </section>
        </section>
    `,
    styles: [`
        #chainView {
            display: flex;
            justify-content: space-between;
        }

        .settings-panel {
            height: 85vh;
            overflow-y: auto;
            overflow-x: auto;
        }

        .resource-box .resource-boxContent {
            padding: 0 0.625rem 0 0.625rem;
            font-size: 0.75rem;
            color: ${COLORS.inputTextColor};
            font-weight: 500;
        }

        .vertical-toolbar {
            margin-right: 20px;
        }

        .title {
            font-size: 0.8rem;
            font-weight: bold;
            line-height: 0.934rem;
        }

        .full-width {
            width: 100%;
        }

        .num-levels {
            text-align: right;
            font: 12px sans-serif;
            background: ${COLORS.white};
            border: 0.067rem solid ${COLORS.inputBorderColor};
            color: ${COLORS.inputTextColor};
            box-sizing: border-box;
            height: 1.7rem;
            width: 60px;
            font-size: 0.8rem;
            margin-left: 0.2rem;
        }
    `]
})
/**
 * @class
 * @property entitiesByID
 */
export class ChainEditorComponent extends ResourceEditor {
    constructor(snackBar: MatSnackBar, dialog: MatDialog) {
        super(snackBar, dialog);
    }

    layerTree;
    cellOntoTerms = cellOntoTermDefinitions;

    _helperFields = ['_class', '_generated', '_subtypes', '_supertype', '_node', '_id', '_conveys', '_layerIndex',
        '_maxLayerIndex', '_cloning', '_inMaterials', '_materials'];

    _extraLyphActions = [
        {
            operation: "connectRoot", label: "Connect chain root"
        },
        {
            operation: "connectLeaf", label: "Connect chain leaf"
        }
    ];

    extraChainActions = [
        {
            operation: "deleteWithLyphs", label: "Delete with lyphs", condition: this._chainHasLyphs
        },
        {
            operation: "createModification", label: "Create modification", condition: this._isChainTemplate
        }
    ];

    chainList;

    chainResources = {
        [$Field.lyphs]: [],
        [$Field.housingLyphs]: [],
        [$Field.housingLyphTemplates]: [],
        [$Field.levels]: [],
        [$Field.levelOntologyTerms]: []
    }

    activeList = "lyphs";

    @Input('model') set model(newModel) {
        this._model = newModel::cloneDeep();
        this.clearHelpers(this._model);
        this._modelText = JSON.stringify(this._model, null, 4);
        this.steps = [];
        this.currentStep = 0;
        this.entitiesByID = {};
        this.prepareChainList();
        ResourceMaps.materialsAndLyphs(this._model, this.entitiesByID);
        (this._model.groups || []).forEach(g => {
            if (g.imported && g.namespace !== this._model.namespace) {
                ResourceMaps.importedMaterialsAndLyphs(g, this.entitiesByID);
            }
        });
        // Need links and nodes for level editing
        (this._model.links || []).forEach(obj => {
            if (!obj.id) return;
            obj._class = $SchemaClass.Link;
            this.entitiesByID[obj.id] = obj;
            if (obj.conveyingLyph && obj.conveyingLyph in this.entitiesByID) {
                this.entitiesByID[obj.conveyingLyph]._conveys = obj;
            }
        });
        (this._model.nodes || []).forEach(obj => {
            if (!obj.id) return;
            obj._class = $SchemaClass.Node;
            this.entitiesByID[obj.id] = obj;
        });
        this.collectMaterials();
        this.collectSubtypes(); //Assigns _supertype and _subtypes to get interconnected hierarchy
        this.updateSearchOptions();
        this.updateScaffoldSearchOptions();
        this.updateView((this._model?.chains || [])[0]);
        this.saveStep('Initial model');
    };

    @Input('selectedNode') set selectedNode(value) {
        if (value && this._selectedNode !== value) {
            this.selectChain(value);
            this.candidateLyphTemplate = null;
        }
    }

    get selectedNode() {
        return this._selectedNode;
    }

    adjustLevelOntologyTermsListSize() {
        if (!this.selectedChain) return;
        this.chainResources.levelOntologyTerms = this.chainResources.levelOntologyTerms || [];
        if (this.selectedChain.numLevels > 0) {
            this.chainResources.levelOntologyTerms.length = this.selectedChain.numLevels;
        } else {
            this.chainResources.levelOntologyTerms = [];
        }
    }

    collectSpecializations() {
        const missing = new Set();
        (this._model?.chains || []).forEach(chain => {
            if (chain.specializationOf) {
                let supertype = this.entitiesByID[chain.specializationOf];
                if (supertype) {
                    supertype._subtypes = supertype._subtypes || [];
                    if (!supertype._subtypes.find(x => x.id === chain.id)) {
                        supertype._subtypes.push(chain);
                    }
                    chain._supertype = chain.specializationOf;
                } else {
                    missing.add(chain.specializationOf)
                }
            }
            (chain.specializations || []).forEach(subtypeID => {
                const subtype = this.entitiesByID[subtypeID];
                if (subtype) {
                    chain._subtypes = chain._subtypes || [];
                    if (!chain._subtypes.find(x => x.id === subtype.id)) {
                        chain._subtypes.push(subtype);
                    }
                    subtype._supertype = chain;
                } else {
                    missing.add(subtypeID);
                }
            });
        });
        if (missing.size > 0) {
            this.showWarning("No chain definitions found: " + [...missing].join(', '));
        }
    }

    prepareGroupedChainList() {
        this.collectSpecializations();
        const mapToNodes = (objOrID, parent, idx) => {
            if (!objOrID) return {};
            let resource = objOrID.id ? objOrID : this.entitiesByID[objOrID];
            let length = (parent?._subtypes || []).length || 0;
            let res = ResourceTreeNode.createInstance(resource, parent, idx, length);
            resource._node = res;
            if (resource._subtypes) {
                res.children = resource._subtypes.map((x, i) => mapToNodes(x, resource, i)).filter(x => x);
            }
            return res;
        };
        let treeData = (this._model.chains || []).filter(e => !e._supertype).map(e => mapToNodes(e)).filter(x => x);
        this.chainList = treeData::sortBy([$Field.id]);
    }

    /**
     * Prepare nodes for the editable chain list
     */
    prepareChainList() {
        // this.chainList = [];
        (this._model.chains || []).forEach((chain, idx) => {
            if (chain::isObject()) {
                if (!chain.id) {
                    let counter = 1;
                    let newID = "tmpChainID" + counter;
                    while (this.entitiesByID[newID]) {
                        newID = "tmpChainID" + ++counter;
                    }
                    chain._id = true;
                    chain.id = newID;
                }
                chain._class = $SchemaClass.Chain;
                this.entitiesByID[chain.id] = chain;
                // let node = ListNode.createInstance(chain, idx, this._model.chains.length);
                // this.chainList.push(node);
                // chain._node = node;
            }
        });
        this.prepareGroupedChainList();
    }

    /**
     * Select chain
     * @param node
     */
    selectChain(node) {
        let nodeID = node::isObject() ? node.id : node;
        this.selectedChain = this.entitiesByID[nodeID];
        this._selectedNode = this.selectedChain?._node;
        this.prepareChainResources();
    }

    selectLyph(node, prop) {
        if (node) {
            let nodeID = node::isObject() ? node.id : node;
            this.selectedLyph = this.entitiesByID[nodeID];
            this.prepareLayerTree();
            if (this.layerTree && this.layerTree.length > 0) {
                this.selectedLyph._maxLayerIndex = (this.layerTree[0].children || []).length - 1;
            }
        }
        this.activeList = prop;
    }

    selectLevel(node) {
        let nodeID = node::isObject() ? node.id : node;
        this.selectedLink = this.entitiesByID[nodeID];
        if (this.selectedLink.conveyingLyph) {
            this.selectLyph(this.selectedLink.conveyingLyph);
        }
    }

    /**
     * Prepare a hierarchy of inherited and own layers
     */
    prepareLayerTree() {
        let loops = [];
        [this.layerTree, loops] = LyphTreeNode.preparePropertyTree(this.selectedLyph, this.entitiesByID, $Field.layers, true);
        if (loops.length > 0) {
            this.showWarning("Loop is detected in the layer hierarchy of the following lyphs: " + loops.join(", "));
        }
    }

    split(lyphNode, index) {
        if (this.selectedChain) {
            let headLyphs = this.selectedChain.lyphs.slice(0, index);
            let tailLyphs = this.selectedChain.lyphs.slice(index + 1);
            if (headLyphs.length === 0 || tailLyphs.length === 0) {
                this.showWarning("Splitting cannot lead to a chain with no lyphs. Create a new chain instead!");
                return;
            }
            let nodeID = getGenID($Prefix.leaf, lyphNode.id.replace("lyph_", "").replace("lyph-", ""));
            // The main chain gets shorter
            this.selectedChain.lyphs = headLyphs;
            this.selectedChain.leaf = nodeID;

            let tailChain = {
                [$Field.id]: getGenID(this.selectedChain.id, $Prefix.tail),
                [$Field.name]: getGenName(this.selectedChain.name, $Prefix.tail),
                [$Field.lyphs]: tailLyphs,
                [$Field.root]: nodeID
            }
            const oldName = this.selectedChain.name;
            if (this.selectedChain.name?.includes("->")) {
                const [root, leaf] = this.selectedChain.name.split(/\s*->\s*/);
                if (lyphNode.label?.includes("->")) {
                    const [start, end] = lyphNode.label.split(/\s*->\s*/);
                    this.selectedChain.name = this.selectedChain.name.replace(leaf, end);
                    tailChain.name = getGenName(end, "->", leaf);
                }
            }
            // Create a group to place both head and tail
            const gID = getGenID($Prefix.gParts, this.selectedChain.id);
            let group = (this._model.groups || []).find(g => g.id === gID) || {
                [$Field.id]: gID,
                [$Field.name]: getGenName("Parts of", oldName || this.selectedChain.id)
            }
            group.chains = group.chains || [];
            if (!group.chains.find(c => c.id === this.selectedChain.id)) {
                group.chains.push(this.selectedChain.id);
            }
            group.chains.push(tailChain.id);
            this._model.groups = this._model.groups || [];
            this._model.groups.push(group);

            tailChain = this.createChain(tailChain, false);
            tailChain.lyphs = tailLyphs;

            this.prepareChainResources([$Field.lyphs]);
            this.saveStep("Split chain " + this.selectedChain.id + " at level " + index);
        }
    }

    moveLevelUp(node, index, prop) {
        if (!this.selectedChain) return;
        if (this.selectedChain[prop]) {
            let tmp = this.selectedChain[prop][index - 1];
            this.selectedChain[prop][index - 1] = this.selectedChain[prop][index];
            this.selectedChain[prop][index] = tmp;
            this.prepareChainResources([prop]);
            this.saveStep("Move up lyph " + index + " of chain " + this.selectedChain.id);
        }
    }

    moveLevelDown(node, index, prop) {
        if (!this.selectedChain) return;
        if (this.selectedChain[prop]) {
            let tmp = this.selectedChain[prop][index + 1];
            this.selectedChain[prop][index + 1] = this.selectedChain[prop][index];
            this.selectedChain[prop][index] = tmp;
            this.prepareChainResources([prop]);
            this.saveStep("Move down lyph " + index + " of chain " + this.selectedChain.id);
        }
    }

    prepareLevelTargets() {
        (this.selectedChain?.lyphs || []).forEach((lyphID, idx) => {
            let lyph = this.entitiesByID[lyphID];
            if (lyph) {
                if (!lyph._conveys && lyph.conveys) {
                    lyph._conveys = this.entitiesByID[lyph.conveys];
                }
                if (!lyph._conveys) {
                    lyph._conveys = {
                        "target": getGenID(this.selectedChain?.id, $Prefix.node, idx + 1)
                    }
                }
                if (this.selectedChain?.leaf && this.selectedChain.lyphs.length - 1 === idx) {
                    lyph._conveys.target = this.selectedChain.leaf;
                }
            }
        });
    }

    prepareChainLyphIcons(nodes) {
        (nodes || []).forEach(node => {
            let lyph = node.resource;
            if (lyph) {
                if (lyph.layers?.length > 0 && !node.icons.includes(ICON.LAYERS)) {
                    node.icons.push(ICON.LAYERS);
                }
            }
            if (node.parent?.layers?.length > 0 && !node.icons.includes(ICON.LAYERS)) {
                node.icons.push(ICON.LAYERS);
                node.icons.push(ICON.INHERITED);
            }
        });
    }

    prepareResourceList(prop) {
        if (!this.selectedChain) return res;
        let res = [];
        (this.selectedChain[prop] || []).forEach((resourceID, idx) => {
            let resource = this.entitiesByID[resourceID];
            if (prop === $Field.housingLyphTemplates || prop === $Field.housingLyphs) {
                if (this.selectedChain.housingLayers?.length > idx) {
                    resource._layerIndex = this.selectedChain.housingLayers[idx];
                } else {
                    resource._layerIndex = 0;
                }
            }
            let node = ListNode.createInstance(resource || resourceID, idx, this.selectedChain[prop].length);
            res.push(node);
        });
        return res;
    }

    prepareChainResources(props) {
        if (!this.selectedChain) return;
        if (!props || props.length === 0) {
            props = [$Field.lyphs, $Field.housingLyphs, $Field.housingLyphTemplates, $Field.levels];
        }
        props.forEach(prop => {
            this.chainResources[prop] = this.prepareResourceList(prop);
            if (prop === $Field.lyphs) {
                this.prepareLevelTargets();
                this.prepareChainLyphIcons(this.chainResources[prop]);
            }
        });
        this.adjustLevelOntologyTermsListSize();
        (this.selectedChain.levelOntologyTerms || []).forEach((ontTermRef, i) => {
            this.chainResources.levelOntologyTerms[i] = isIncluded(this.cellOntoTerms, ontTermRef) ? ontTermRef : {};
        });
        //
    }

    /**
     * Prepare a list of lyph id-name pairs for search box
     */
    updateSearchOptions() {
        this.searchOptions = SearchOptions.materialsAndLyphs(this._model);
        this.templateSearchOptions = SearchOptions.lyphTemplates(this._model);
    }

    updateScaffoldSearchOptions() {
        this.wireOptions = [];
        this.anchorOptions = [];
        (this._model?.scaffolds || []).forEach(scaffold => {
            SearchOptions.wires(scaffold, this.wireOptions);
            SearchOptions.anchors(scaffold, this.anchorOptions);
        });
    }

    /**
     * Select lyph to connect via search menu
     * @param nodeLabel
     */
    selectLyphToLink(nodeLabel) {
        this.lyphToLink = this.selectBySearch(nodeLabel);
    }

    selectLyphTemplate(nodeLabel) {
        this.candidateLyphTemplate = this.selectBySearch(nodeLabel);
    }

    updateLyphTemplate(node) {
        if (!this.selectedChain) {
            this.showWarning("Cannot update lyph template: chain is not selected");
            return;
        }
        if (this.selectedChain.lyphs) {
            this.showWarning("Cannot update lyph template: chain is defined by sequence of lyphs");
            return;
        }
        if (!this.candidateLyphTemplate) {
            if (this.selectedChain.lyphTemplate) {
                delete this.selectedChain.lyphTemplate;
                this.saveStep("Removed lyph template from chain " + this.selectedChain.id);
            }
        } else {
            if (this.candidateLyphTemplate !== this.selectedChain.lyphTemplate) {
                this.selectedChain.lyphTemplate = this.candidateLyphTemplate.id;
                this.saveStep("Replaced lyph template in chain " + this.selectedChain.id);
            }
        }
    }

    changeActiveList(tabEvent) {
        if (tabEvent.index === 0) {
            this.activeList = "housingLyphTemplates";
        } else {
            this.activeList = "housingLyphs";
        }
    }

    get extraLyphActions() {
        if (this.chainToLink) {
            return this._extraLyphActions;
        }
        return [];
    }

    processChainChange({operation, node, index}) {
        switch (operation) {
            case 'insert':
                this.addChain(node, index);
                break;
            case 'delete':
                this.deleteChain(node);
                break;
            case 'deleteWithLyphs':
                this.deleteChain(node, true);
                break;
            case 'createModification':
                this.createModification(node, index);
                break;
            case 'define':
                this.showWarning("Cannot define unknown resource!");
                break;
            case 'select':
                if (this.chainToLink && this.chainToLink.id === node.id) {
                    this.chainToLink = null;
                } else {
                    this.chainToLink = this.entitiesByID[node.id];
                }
                break;
        }
    }

    createModification(node) {
        let chainPrototype = node.resource;
        if (chainPrototype?.lyphTemplate) {
            let oldLyph = this.entitiesByID[chainPrototype.lyphTemplate];
            if (!oldLyph) {
                this.showWarning("LyphTemplate definition is not found!");
                return;
            }
            let oldMaterialMap = ResourceMaps.getMaterials(oldLyph, this.entitiesByID);
            let levels = Array.from(new Set((chainPrototype.levelOntologyTerms||[]))).filter(x => x);
            if (levels.length === 0){
                levels = ["All levels"];
            }

            const dialogRef = this.dialog.open(MaterialSelectDialog, {
                width: '90%',
                data: {
                    'materialsByLyphID': oldMaterialMap,
                    'entitiesByID': this.entitiesByID,
                    'levelOntologyTerms': levels
                }
            });
            dialogRef.afterClosed().subscribe(result => {
                if (result) {
                    this.createChainFromPrototype(chainPrototype, result);
                }
            });

        } else {
            this.showWarning("Chain definition is not found or contains no lyphTemplate!");
        }
    }

    reviseHierarchy(oldLyph, replacementMap){

        const replaceLyph = (objOrID) => {
            let obj = objOrID::isObject()? objOrID: this.entitiesByID[objOrID];
            if (!obj) return oldLyph;
            //Replicating lyph
            let lyphDef = defineNewResource(obj::cloneDeep(), this.entitiesByID);
            let materialMap = replacementMap[obj.id] || [];
            for (let i = 0; i < lyphDef.layers?.length; i++){
                if (materialMap[lyphDef.layers[i]]) {
                    lyphDef.layers[i] = materialMap[lyphDef.layers[i]];
                }
                //NK recursively revise layers?
            }
            if (lyphDef._supertype){
                let s = replaceLyph(lyphDef._supertype);
                if (s?.id) {
                    lyphDef.supertype = s.id;
                    lyphDef._supertype = s;
                }
            }
            return this.defineNewLyph(lyphDef);
        }
        return replaceLyph(oldLyph);
    }

    createChainFromPrototype(chainPrototype, replacementMapLevels) {
        if (replacementMapLevels::keys().length === 0){
            return;
        }
        let oldLyph = this.entitiesByID[chainPrototype.lyphTemplate];
        if (!oldLyph){
            this.showWarning("Failed to locate lyph template definition");
            return;
        }
        let topology = ResourceMaps.getTopology(oldLyph);
        const N = chainPrototype.numLevels;

        const chainDef = defineNewResource({
            [$Field.id]: chainPrototype.id, //The identifier is auto-created by appending counter
            [$Field.name]: chainPrototype.name,
            [$Field.lyphs]: new Array(N),
            [$Field.specializationOf]: chainPrototype.id, //Keep the reference to the original chain
            "_class": $SchemaClass.Chain
        }, this.entitiesByID);

        let newLyphs = {};

        replacementMapLevels::entries().forEach(([level, replacementMap]) => {

            let reviseLyph = false;
            (oldLyph.layers ||[]).forEach(layer => {
                if (replacementMap[layer.id]) reviseLyph = true;
            });
            if (reviseLyph){
                newLyphs[level] = this.reviseHierarchy(oldLyph);
            } else {
                let reviseHierarchy = false;
                let curr = oldLyph;
                while (curr._supertype) {
                    curr = curr._supertype::isObject() ? curr._supertype : this.entitiesByID[curr._supertype];
                    if (replacementMap[curr.id]) {
                        reviseHierarchy = true;
                        break;
                    }
                }
                newLyphs[level] = reviseHierarchy ? this.reviseHierarchy(oldLyph._supertype, replacementMap): oldLyph;
            }
        });

        const modifyLyphTemplate = (lyphDef, idx) => {
            let level = "All levels";
            if ((chainPrototype.levelOntologyTerms||[]).length > idx && chainPrototype.levelOntologyTerms[idx]){
                level = chainPrototype.levelOntologyTerms[idx];
            }
            let newLyph = newLyphs[level] || oldLyph;
            if (newLyph) {
                if (newLyph.supertype) lyphDef.supertype = newLyph.supertype;
                if (newLyph.layers) lyphDef.layers = newLyph.layers;
            }
            return (lyphDef.id in this.entitiesByID)? this.entitiesByID[lyphDef.id].id: this.defineNewLyph(lyphDef).id;
        }

        if (topology === LYPH_TOPOLOGY.CYST || topology === LYPH_TOPOLOGY.BAG2) {
            // BAG2
            let lyphDef = defineNewResource({
                [$Field.id]: getGenID(oldLyph.id, "bag+"),
                [$Field.name]: getGenName(oldLyph.name || oldLyph.id, "(BAG+)"),
                [$Field.isTemplate]: true,
                [$Field.topology]: LYPH_TOPOLOGY.BAG2,
            }, this.entitiesByID);
            chainDef.lyphs[0] = modifyLyphTemplate(lyphDef, 0);
        }
        if (topology === LYPH_TOPOLOGY.CYST || topology === LYPH_TOPOLOGY.BAG) {
            //BAG
            let lyphDef = defineNewResource({
                [$Field.id]: getGenID(oldLyph.id, "bag-"),
                [$Field.name]: getGenName(oldLyph.name || oldLyph.id, "(BAG-)"),
                [$Field.isTemplate]: true,
                [$Field.topology]: LYPH_TOPOLOGY.BAG
            }, this.entitiesByID);
            chainDef.lyphs[N-1] = modifyLyphTemplate(lyphDef, N-1);
        }
        let n = chainDef.lyphs.filter(x => x).length;
        if (n > 0) {
            //TUBE
             let lyphDef = defineNewResource({
                [$Field.id]: getGenID(oldLyph.id, "tube"),
                [$Field.name]: getGenName(oldLyph.name || oldLyph.id, "(TUBE)"),
                [$Field.isTemplate]: true,
                [$Field.topology]: LYPH_TOPOLOGY.TUBE
            }, this.entitiesByID);
            for (let i = 0; i < N; i++) {
                if (!chainDef.lyphs[i]) {
                    chainDef.lyphs[i] = modifyLyphTemplate(lyphDef, i);
                }
            }
        }

        this.createChain(chainDef, false); // Do not register "create chain" action
        this.saveStep("Create chain modification", chainDef.id);
    }

    defineNewChain = (chainDef) => {
        let newChain = chainDef || defineNewResource({[$Field.id]: "_newChain", [$Field.name]: "New chain"},
            this.entitiesByID);
        newChain._class = $SchemaClass.Chain;
        this._model.chains = this._model.chains || [];
        this._model.chains.push(newChain);
        this.entitiesByID[newChain.id] = newChain;
        return newChain;
    }

    /**
     * Create a new chain
     */
    createChain(_chain, register = true) {
        const chain = this.defineNewChain(_chain);
        // let node = ListNode.createInstance(chain);
        let node = ResourceTreeNode.createInstance(chain);
        this.chainList = [node, ...this.chainList];
        this.selectChain(chain.id);
        if (register) {
            this.saveStep("Create chain " + chain.id);
        }
        return chain;
    }

    /**
     * Add chain
     * @param node
     * @param index
     */
    addChain(node, index) {
        this.createChain();
    }

    deleteChain(node, deleteLyphs = false) {
        let chain = this.entitiesByID[node.id];
        let cls = chain._class?.toLowerCase() || $SchemaClass.Chain;
        if (chain) {
            let idx = (this._model.chains || []).findIndex(e => e.id === node.id);
            if (idx > -1) {
                References.clearChainRefs(this._model, node.id);
                this._model.chains.splice(idx, 1);
                if (deleteLyphs) {
                    (chain.lyphs || []).forEach(lyph => {
                        References.clearMaterialRefs(this._model, lyph.id);
                        References.removeMaterialOrLyph(this._model, lyph.id);
                    });
                    this.updateSearchOptions();
                }
                this.prepareChainList();
                this.updateView(this._model.chains[0]);
            }
        }
        this.saveStep("Delete " + cls + " " + node.id);
    }

    updateView(chain) {
        this.selectedChain = chain;
        this.prepareChainResources();
        if (this.selectedNode?.id !== this.selectedChain?.id) {
            this.selectedNode = this.selectedChain?._node;
        }
        this.activeList = "lyphs";
    }

    /**
     * Process menu operation in the chain lyph view
     * @param operation - chosen operation
     * @param node - lyph subject
     * @param index - lyph index
     */
    processLyphChange({operation, node, index}) {
        switch (operation) {
            case 'insert':
                this.addLyphToList(node, index, $Field.lyphs);
                break;
            case 'delete':
                this.deleteLyphFromList(node, index, $Field.lyphs, $Field.levelIn);
                break;
            case 'select':
                this.lyphToLink = this.entitiesByID[node.id];
                break;
            case 'up':
                this.moveLevelUp(node, index, $Field.lyphs);
                break;
            case 'down':
                this.moveLevelDown(node, index, $Field.lyphs);
                break;
            case 'defineAsLyph':
                this.defineAsLyph(node);
                break;
            case "split":
                this.split(node, index);
                break;
            case 'connectRoot':
                this.connectChain($Field.root, node);
                break;
            case 'connectLeaf':
                this.connectChain($Field.leaf, node);
                break;
        }
    }

    addLyph(node, index) {
        switch (this.activeList) {
            case $Field.lyphs:
                this.addLyphToList(node, index, $Field.lyphs);
                break;
            case $Field.housingLyphs:
                this.addLyphToList(node, index, $Field.housingLyphs, this._isValidHousingLyph);
                break;
            case $Field.housingLyphTemplates:
                this.addLyphToList(node, index, $Field.housingLyphTemplates, this._isValidHousingLyphTemplate);
                break;
        }
    }

    processLevelChange({operation, node, index}) {
        this.showWarning("Operations on levels are not supported by the chain editor!");
    }

    // housing lyph templates
    processHousingLyphTemplateChange({operation, node, index}) {
        switch (operation) {
            case 'insert':
                this.addLyphToList(node, index, $Field.housingLyphTemplates, this._isValidHousingLyphTemplate);
                break;
            case 'delete':
                this.deleteLyphFromList(node, index, $Field.housingLyphTemplates, $Field.providesChains);
                break;
            case 'up':
                this.moveLevelUp(node, index, $Field.housingLyphTemplates);
                break;
            case 'down':
                this.moveLevelDown(node, index, $Field.housingLyphTemplates);
                break;
            case 'defineAsLyph':
                this.defineAsLyph(node, true);
                break;
        }
    }

    // housing lyphs
    processHousingLyphChange({operation, node, index}) {
        switch (operation) {
            case 'insert':
                this.addLyphToList(node, index, $Field.housingLyphs, this._isValidHousingLyph);
                break;
            case 'delete':
                this.deleteLyphFromList(node, index, $Field.housingLyphs, $Field.bundlesChains);
                break;
            case 'up':
                this.moveLevelUp(node, index, $Field.housingLyphs);
                break;
            case 'down':
                this.moveLevelDown(node, index, $Field.housingLyphs);
                break;
            case 'defineAsLyph':
                this.defineAsLyph(node);
                break;
        }
    }

    /*
    Connects a chain to lyph by assigning the auto-generated target node to the chain as root or leaf
    */
    connectChain(prop, node) {
        if (!this.chainToLink) {
            this.showWarning("Chain to link is not selected!");
        } else {
            let lyph = this.entitiesByID[node.id];
            if (lyph && lyph._conveys?.target) {
                this.chainToLink[prop] = lyph._conveys?.target;
                this.saveStep(`Connected ${this.chainToLink.id} to chain ${this.selectedChain.id} after lyph ${lyph.id}`);
                this.chainToLink = null;
            } else {
                this.showWarning("Node to link the chain is not detected!");
            }
        }
    }

    //Helper method to create a material/lyph object
    _addDefinition(prop, nodeID) {
        if (!this.entitiesByID[nodeID]) {
            this.entitiesByID[nodeID] = {
                [$Field.id]: nodeID
            };
        }
        let resource = this.entitiesByID[nodeID];
        resource.name = "Generated " + nodeID;
        resource._class = $SchemaClass.Lyph;
        delete resource._generated;
        this._model[prop] = this._model[prop] || [];
        this._model[prop].push(resource);
    }

    /**
     * Add lyph definition
     * @param node
     * @param isTemplate
     */
    defineAsLyph(node, isTemplate = false) {
        this._addDefinition($Field.lyphs, node.id);
        if (isTemplate) {
            node.isTemplate = true;
        }
        this.saveStep("Define as lyph " + node.id);
        this.updateSearchOptions();
    }

    _chainHasLyphs(node) {
        if (node?.resource) {
            return ((node.resource._class === $SchemaClass.Chain) && node.resource.lyphs?.length > 0);
        }
        return false;
    }

    _isChainTemplate(node) {
        if (node?.resource) {
            return ((node.resource._class === $SchemaClass.Chain) && node.resource.lyphTemplate && (node.resource.numLevels > 1));
        }
        return false;
    }

    _isLyphInstance(lyph, selectedChain) {
        return lyph._class === $SchemaClass.Lyph && !lyph.isTemplate;
    }

    _isLyphOrTemplate(lyph, selectedChain) {
        return lyph._class === $SchemaClass.Lyph;
    }

    _isValidHousingLyph(lyph, selectedChain) {
        return (lyph._class === $SchemaClass.Lyph) && !lyph.isTemplate && ((selectedChain?.housingLyphTemplates || []).length === 0);
    }

    _isValidHousingLyphTemplate(lyph, selectedChain) {
        return (lyph._class === $SchemaClass.Lyph) && ((selectedChain?.housingLyphs || []).length === 0);
    }

    /**
     * Add layer to the lyph
     * @param node
     * @param index
     * @param prop
     * @param fncValidate
     */
    addLyphToList(node, index, prop, fncValidate) {
        if (this.selectedChain) {
            if (!this.lyphToLink) {
                this.showWarning("Lyph is not selected!");
            } else {
                if (!fncValidate || fncValidate(this.lyphToLink, this.selectedChain)) {
                    this.selectedChain[prop] = this.selectedChain[prop] || [];
                    this.selectedChain[prop].push(this.lyphToLink.id);
                    this.prepareChainResources([prop]);
                    this.saveStep(`Added ${this.lyphToLink.id} to chain's ${this.selectedChain.id} "${prop}"`);
                } else {
                    this.showWarning(`Cannot add ${this.lyphToLink.id} to the chain's property "${prop}" - model consistency validation failed!`);
                }
            }
        } else {
            this.showWarning("Cannot add lyph: no chain is selected!");
        }
    }

    deleteLyphFromList(node, index, prop, relatedProp) {
        if (!this.selectedChain) {
            this.showWarning("Cannot delete the lyph: chain is not selected!");
        } else {
            if (index > -1 && this.selectedChain[prop]?.length > index) {
                this.selectedChain[prop].splice(index, 1);
                let lyph = this.entitiesByID[node.id];
                if (lyph && lyph[relatedProp]) {
                    if (lyph[relatedProp]::isArray()) {

                    } else {
                        delete lyph[relatedProp];
                    }
                }
                this.saveStep(`Removed lyph ${node.id} from chain's ${this.selectedChain.id} property ${prop}`);
            }
            this.prepareChainResources([prop]);
        }
    }

    updateColor({node, color}) {
        if (node) {
            let res = this.entitiesByID[node.id];
            if (res) {
                if (color) {
                    res.color = color;
                } else {
                    delete res.color;
                }
                this.saveStep(`Update color ` + res.id);
            }
        }
    }

    updateLevelOntoTerm(idx, termID) {
        if (!this.selectedChain) return;
        this.selectedChain.levelOntologyTerms = this.selectedChain.levelOntologyTerms || [];
        if (this.selectedChain.levelOntologyTerms.length <= idx) {
            this.selectedChain.levelOntologyTerms.length = idx + 1;
        }
        for (let i = 0; i < this.selectedChain.levelOntologyTerms.length; i++) {
            this.selectedChain.levelOntologyTerms[i] = this.selectedChain.levelOntologyTerms[i] || {};
        }
        this.selectedChain.levelOntologyTerms[idx] = termID;
        this.cellOntoTerms.forEach(def => {
            if (def.id && !(this._model.ontologyTerms || []).find(obj => obj.id === def.id)) {
                this._model.ontologyTerms = this._model.ontologyTerms || [];
                this._model.ontologyTerms.push(def);
            }
        });
        this.saveStep(`Update level ${idx + 1} ontology term to ` + termID);
    }

    /**
     * Update selected lyph property
     * @param prop
     * @param value
     * @param oldValue
     */
    updateProperty({prop, value, oldValue}) {
        if (!$Field[prop]) {
            this.showWarning("Cannot update unknown property!");
        }
        if (this.selectedChain) {
            if (prop === $Field.id) {
                this.entitiesByID[value] = this.entitiesByID[oldValue];
                delete this.entitiesByID[oldValue];
                if (this.selectedChain._id) {
                    delete this.selectedChain._id;
                }
            }
            if (prop === $Field.id) {
                this.prepareChainList();
            } else {
                if (value) {
                    this.selectedChain[prop] = value;
                } else {
                    delete this.selectedChain[prop];
                }
            }
            this.saveStep(`Update property ${prop} of chain ` + this.selectedChain.id);
        }
    }

    updateNumLevels(value) {
        if (!this.selectedChain) {
            this.showWarning("Cannot update number of levels: chain is not selected");
            return;
        }
        let numLevels = parseInt(value);
        if (numLevels > 0) {
            this.selectedChain.numLevels = numLevels;
            this.saveStep(`Updated numLevels property of chain ` + this.selectedChain.id);
        } else {
            if (this.selectedChain.numLevels) {
                delete this.selectedChain.numLevels;
                this.saveStep(`Removed numLevels property of chain ` + this.selectedChain.id);
            }
        }
        this.adjustLevelOntologyTermsListSize();
    }

    getCurrentState(action) {
        let snapshot = this._model::cloneDeep();
        return {
            action: action,
            snapshot: snapshot,
            selected: this.selectedChain?.id,
            active: this.activeList
        }
    }

    /**
     * Restore history state
     */
    restoreState() {
        this.prepareChainList();
        let newSelected = this.entitiesByID[this.steps[this.currentStep].selected];
        this.updateView(newSelected);
        this.activeList = this.steps[this.currentStep].active;
    }

    createLateral(lateralPrefix) {
        if (this.selectedChain) {
            const prefixID = lateralPrefix || $Prefix.lateral;
            const prefixName = prefixID.charAt(0).toUpperCase() + prefixID.slice(1);

            function getResourceCopy(r) {
                let copy = r::cloneDeep();
                copy.id = getGenID(prefixID, r.id);
                copy.name = getGenName(prefixName, r.name);
                return copy;
            }

            const isLyphInstance = id => {
                if (id.includes(":")) return false;
                const lyph = this.entitiesByID[id];
                return (lyph && !lyph._cloning && lyph._class === $SchemaClass.Lyph && !lyph.isTemplate);
            }

            const copyLyph = id => {
                if (!isLyphInstance(id)) {
                    return;
                }
                const lyph = this.entitiesByID[id];
                lyph._cloning = true;
                if (lyph.namespace && lyph.namespace !== this._model.namespace) {
                    throw Error("Cannot copy a resource from another workspace: ", lyph.id);
                }
                const lyphCopy = getResourceCopy(lyph);
                //Layers
                if (lyph.layers) {
                    lyphCopy.layers = lyph.layers.map(id => isLyphInstance(id) ? getGenID(prefixID, id) : id);
                    lyph.layers.forEach(id => copyLyph(id));
                }
                //Internal lyphs
                if (lyph.internalLyphs) {
                    lyphCopy.internalLyphs = lyph.internalLyphs.map(id => isLyphInstance(id) ? getGenID(prefixID, id) : id);
                    lyph.internalLyphs.forEach(id => copyLyph(id));
                }
                this._model.lyphs.push(lyphCopy);
                this.entitiesByID[lyphCopy.id] = lyphCopy;
                delete lyph._cloning;
                return true;
            }

            const copyNode = id => {
                const node = this.entitiesByID[id];
                if (node && node._class === $SchemaClass.Node) {
                    const nodeCopy = getResourceCopy(node);
                    this._model.node.push(nodeCopy);
                }
            }

            const copyLink = id => {
                if (id.includes(":")) {
                    throw Error("Cannot copy a resource from another workspace: ", id);
                }
                const link = this.entitiesByID[id];
                if (link && link._class === $SchemaClass.Link) {
                    const linkCopy = getResourceCopy(link);
                    if (link.conveyingLyph && isLyphInstance(link.conveyingLyph)) {
                        linkCopy.conveyingLyph = getGenID(prefixID, link.conveyingLyph);
                        copyLyph(link.conveyingLyph);
                    }
                    ["source", "target"].forEach(prop => {
                        if (link[prop]) {
                            linkCopy[prop] = getGenID(prefixID, link[prop]);
                            copyNode(link[prop]);
                        }
                    });
                    this._model.links.push(linkCopy);
                }
            }

            const chain = getResourceCopy(this.selectedChain);
            if (this.selectedChain.lyphs) {
                chain.lyphs = this.selectedChain.lyphs.map(id => isLyphInstance(id) ? getGenID(prefixID, id) : id);
                this.selectedChain.lyphs.forEach(id => copyLyph(id));
            } else {
                if (this.selectedChain.levels) {
                    // Levels are links that connect to a chain - need to clone link definitions
                    chain.levels = this.selectedChain.levels.map(id => getGenID(prefixID, id));
                    this.selectedChain.levels.forEach(id => copyLink(id));
                }
            }
            // Make lateral chain disconnected by default
            // delete chain.root;
            // delete chain.leaf;

            delete chain.specializations; // Remove cloned prototype's specializations
            chain.specializationOf = this.selectedChain.id;

            // Put lateral copy to the common group
            let groups = (this._model.groups || []).filter(g => g.id.startsWith($Prefix.gParts) && (g.chains || []).find(c => c === this.selectedChain.id));
            if (groups.length === 0) {
                this._model.groups = this._model.groups || [];
                this._model.groups.push({
                    [$Field.id]: getGenID($Prefix.gParts, this.selectedChain.id),
                    [$Field.name]: getGenName($Prefix.gParts, this.selectedChain.name || this.selectedChain.id),
                    [$Field.chains]: [this.selectedChain.id, chain.id]
                });
            } else {
                groups.forEach(g => {
                    g.chains.push(chain.id);
                });
            }

            this.createChain(chain);
        }
    }

    /**
     * Update 'internalLyphsInLayers' property
     * @param node
     * @param layerIndex
     */
    processHousingLayerChange({node, layerIndex}) {
        if (this.selectedChain && node && node.resource) {
            let lyph = node.resource;
            let idx = node.index;
            if (!idx::isNumber()) {
                idx = (lyph.providesChains || []).findIndex(e => e === this.selectedChain.id);
            }
            if (idx > -1) {
                this.selectedChain.housingLayers = this.selectedChain.housingLayers || [];
                if (this.selectedChain.housingLayers.length < idx) {
                    this.selectedChain.housingLayers.length = idx + 1;
                }
                this.selectedChain.housingLayers[idx] = Number(layerIndex);
                this.saveStep(`Start chain ${node.id} from layer ` + layerIndex);
            }
        }
    }

    @Output() onShowInTheViewer = new EventEmitter();

    showInTheViewer() {
        this.onShowInTheViewer.emit(this._selectedNode);
    }
}

@NgModule({
    imports: [CommonModule, MatMenuModule, MatTooltipModule, MatSelectModule, MatFormFieldModule, MatListModule,
        MatButtonModule, MatDividerModule, MatTabsModule, ResourceDeclarationModule, SearchAddBarModule, ResourceListViewModule,
        ChainDeclarationModule, CheckboxFilterModule, LyphTreeViewModule, LinkedResourceModule, ResourceTreeViewModule, MaterialSelectModule],
    declarations: [ChainEditorComponent],
    exports: [ChainEditorComponent]
})
export class ChainEditorModule {
}

