import {NgModule, Component, Input, Output, EventEmitter} from '@angular/core';
import {MatMenuModule} from "@angular/material/menu";
import {CommonModule} from "@angular/common";
import {MatButtonModule} from '@angular/material/button';
import {MatDividerModule} from "@angular/material/divider";
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatDialog} from "@angular/material/dialog";
import {cloneDeep, sortBy, isObject, isNumber} from 'lodash-bound';

import {ResourceDeclarationModule} from "./resourceDeclarationEditor";
import {SearchAddBarModule} from "./searchAddBar";
import {CheckboxFilterModule} from "./checkboxFilter";
import {LyphTreeViewModule, LyphTreeNode, ICON} from "./lyphTreeView";
import {LyphDeclarationModule} from "./lyphDeclarationEditor";
import {ListNode, ResourceListViewModule} from "./resourceListView";

import {$Field, $SchemaClass} from "../../model";
import {SearchOptions} from "../utils/searchOptions";
import {ResourceMaps} from "../utils/resourceMaps";
import {References} from "../utils/references";
import {getGenID} from "../../model/utils";
import {LinkedResourceModule} from "./linkedResource";
import {ResourceEditor} from "./resourceEditor";

const TREE = {
    lyphTree: "lyphTree",
    layerTree: "layerTree",
    internalTree: "internalTree"
}

@Component({
    selector: 'lyphEditor',
    template: `
        <section #lyphEditorD3 id="lyphEditorD3" class="w3-row">
            <section #lyphView id="lyphView" [class.w3-threequarter]="showPanel">
                <section class="w3-col">
                    <div class="w3-row w3-margin-right">
                        <button matTooltip="Toggle topology filter" class="w3-right" (click)="showFilter = !showFilter">
                            <i class="fa fa-filter"> </i>
                        </button>
                        <button matTooltip="Expand all" class="w3-right" (click)="lyphTreeExpanded = true">
                            <i class="fa fa-plus"> </i>
                        </button>
                        <button matTooltip="Collapse all" class="w3-right" (click)="lyphTreeExpanded = false">
                            <i class="fa fa-minus"> </i>
                        </button>
                    </div>
                    <checkboxFilter *ngIf="showFilter" [options]="topologyOptions"
                                    (onOptionToggle)="updateTopologyFilter($event)"
                    ></checkboxFilter>
                    <lyphTreeView
                            title="Lyphs"
                            [active]="activeTree === 'lyphTree'"
                            [expanded]="lyphTreeExpanded"
                            [treeData]="lyphTree"
                            [selectedNode]="selectedNode"
                            [linkedNode]="lyphToLink"
                            [showColor]=true
                            (onNodeClick)="selectLyph($event)"
                            (onChange)="processChange($event)"
                            (onColorUpdate)="updateColor($event)"
                    >
                    </lyphTreeView>
                </section>
                <section class="w3-col">
                    <lyphTreeView *ngIf="selectedLyph"
                                  title="Layers"
                                  ordered=true
                                  [active]="activeTree === 'layerTree'"
                                  [treeData]="layerTree"
                                  (onNodeClick)="selectLayer($event)"
                                  (onChange)="processLayerChange($event)"
                    >
                    </lyphTreeView>
                </section>
                <section class="w3-col">
                    <lyphTreeView *ngIf="selectedLyph"
                                  title="Internal lyphs"
                                  [active]="activeTree === 'internalTree'"
                                  [treeData]="internalTree"
                                  [showLayerIndex]="true"
                                  (onNodeClick)="selectInternal($event)"
                                  (onChange)="processInternalChange($event)"
                                  (onLayerIndexChange)="processInternalInLayerChange($event)"
                    >
                    </lyphTreeView>
                </section>
                <section class="w3-padding-right" style="position:relative;">
                    <section class="w3-bar-block w3-right vertical-toolbar" style="position:absolute; right:0">
                        <button class="w3-bar-item w3-hover-light-grey"
                                (click)="createLyph()" title="New lyph">
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
                    </section>
                </section>
            </section>
            <section *ngIf="showPanel" class="w3-quarter w3-white settings-panel">
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
                <lyphDeclaration
                        [lyph]="selectedLyphToEdit"
                        [regionOptions]="regionOptions"
                        (onValueChange)="updateProperty($event)"
                >
                </lyphDeclaration>
                <resourceListView
                        title="Chains"
                        [showMenu]="false"
                        [listData]="chainList"
                        (onNodeClick)="switchEditor($event)"
                >
                </resourceListView>
                <resourceListView
                        title="Coalescences"
                        [showMenu]="false"
                        [listData]="coalescenceList"
                        (onNodeClick)="switchEditor($event)"
                >
                </resourceListView>
            </section>
        </section>
    `,
    styles: [`
        #lyphView {
            display: flex;
            justify-content: space-between;
        }

        .settings-panel {
            height: 100vh;
            overflow-y: auto;
            overflow-x: auto;
        }

        .vertical-toolbar {
            margin-right: 20px;
        }
    `]
})
/**
 * @class
 * @property entitiesByID
 */
export class LyphEditorComponent extends ResourceEditor {
    _helperFields = ['_class', '_generated', '_subtypes', '_supertype', '_node', '_id'];

    lyphTree = [];
    internalTree = [];
    layerTree = [];
    chainList = [];

    topologyOptions: Option[] = [
        {name: 'None', id: undefined},
        {name: 'TUBE', id: 'TUBE'},
        {name: 'BAG- (BAG)', id: 'BAG'},
        {name: 'BAG+ (BAG2)', id: 'BAG2'},
        {name: 'CYST', id: 'CYST'}
    ];

    constructor(snackBar: MatSnackBar, dialog: MatDialog) {
        super(snackBar, dialog);
    }

    @Input('model') set model(newModel) {
        this._model = newModel::cloneDeep();
        this._modelText = JSON.stringify(this._model, null, 4);
        this.steps = [];
        this.currentStep = 0;
        this.prepareLyphTree();
        this.updateRegionOptions();
        this.saveStep('Initial model');
    };

    @Input('selectedNode') set selectedNode(value) {
        if (value && this._selectedNode !== value) {
            this._selectedNode = value;
            this.selectLyph(this._selectedNode);
        }
    }

    /**
     * Select lyph to connect via search menu
     * @param nodeLabel
     */
    selectLyphToLink(nodeLabel) {
        this.lyphToLink = this.selectBySearch(nodeLabel);
    }

    get selectedNode() {
        return this._selectedNode;
    }

    prepareChainList() {
        this.chainList = [];
        (this._model.chains || []).forEach(chain => {
            if (!chain::isObject()) return;
            if ((chain.lyphs || []).find(e => e === this.selectedLyph?.id)) {
                chain._class = $SchemaClass.Chain;
                if (!this.chainList.find(x => x.id === chain.id)) {
                    this.chainList.push(ListNode.createInstance(chain));
                }
            }
            if (chain.lyphTemplate === this.selectedLyph?.id) {
                if (!this.chainList.find(x => x.id === chain.id)) {
                    this.chainList.push(ListNode.createInstance(chain));
                }
            }
        });
    }

    prepareCoalescenceList() {
        this.coalescenceList = [];
        (this._model.coalescences || []).forEach(coalescence => {
            if ((coalescence.lyphs || []).find(e => e === this.selectedLyph?.id)) {
                if (coalescence::isObject()) {
                    coalescence._class = $SchemaClass.Coalescence;
                }
                this.coalescenceList.push(ListNode.createInstance(coalescence));
            }
        });
    }

    /**
     * Create a new lyph definition
     * @returns {{[p: string]: *, _class: *}}
     */
    defineNewLyph(lyphDef) {
        let newLyph = lyphDef;
        if (!newLyph) {
            let newCounter = 1;
            let newID = "_newLyph" + newCounter;
            while (this.entitiesByID[newID]) {
                newID = "_newLyph" + ++newCounter;
            }
            newLyph = {
                [$Field.id]: newID,
                [$Field.name]: "New lyph " + newCounter,
                "_class": $SchemaClass.Lyph
            }
        }
        this._model.lyphs = this._model.lyphs || [];
        this._model.lyphs.push(newLyph);
        this.entitiesByID[newLyph.id] = newLyph;
        return newLyph;
    }

    /**
     * Pass given lyph to dependent components to display and edit its relations and properties
     * @param newSelected
     */
    updateView(newSelected) {
        let lyph = newSelected ? newSelected : (this.lyphTree.length > 0) ? this.lyphTree[0].resource : null;
        this.selectLyph(lyph);
        this.updateLyphOptions();
        this.lyphToLink = null;
        this.activeTree = TREE.lyphTree;
    }

    /**
     * Create a new lyph
     */
    createLyph(lyphDef) {
        let lyph = this.defineNewLyph(lyphDef);
        let node = LyphTreeNode.createInstance(lyph);
        this.lyphTree = [node, ...this.lyphTree];
        this.updateView(lyph);
        this.saveStep("Create new lyph " + lyph.id);
        return lyph;
    }

    /**
     * Add a given lyph as layer or internal lyph
     * @param lyphID
     */
    addLyph(lyphID) {
        let lyph = this.entitiesByID[lyphID];
        if (lyph) {
            if (this.selectedLyph) {
                if (this.activeTree === TREE.layerTree) {
                    this.addLayer(this.selectedLyph);
                } else {
                    if (this.activeTree === TREE.internalTree) {
                        this.addInternal(this.selectedLyph);
                    } else {
                        this.addSubtype(this.selectedLyph);
                    }
                }
            } else {
                this.showMessage("Cannot add lyph: the parent lyph is not selected!");
            }
        } else {
            this.showMessage("Unknown lyph!");
        }
    }

    collectSubtypes() {
        let missing = new Set();
        //Prepare _subtype/_supertype hierarchy
        (this._model.lyphs || []).forEach(lyph => {
            if (lyph.supertype) {
                let supertype = this.entitiesByID[lyph.supertype];
                if (supertype) {
                    supertype._subtypes = supertype._subtypes || [];
                    if (!supertype._subtypes.find(x => x.id === lyph.id)) {
                        supertype._subtypes.push(lyph);
                    }
                    lyph._supertype = supertype;
                } else {
                    missing.add(lyph.supertype)
                }
            }
            (lyph.subtypes || []).forEach(subtype => {
                if (this.entitiesByID[subtype]) {
                    lyph._subtypes = lyph._subtypes || [];
                    if (!lyph._subtypes.find(x => x.id === this.entitiesByID[subtype].id)) {
                        lyph._subtypes.push(this.entitiesByID[subtype]);
                    }
                    this.entitiesByID[subtype]._supertype = lyph;
                } else {
                    missing.add(subtype);
                }
            });
        });
        if (missing.size > 0) {
            this.showMessage("Cannot generate tree nodes for lyphs (external or undefined): " + [...missing].join(', '));
        }
    }

    /**
     * Create a hierarchy of defined lyphs
     * @returns {({}|LyphTreeNode)[]}
     */
    prepareLyphTree() {
        this.entitiesByID = {};
        ResourceMaps.materialsAndLyphs(this._model, this.entitiesByID);
        this.collectSubtypes();
        //Recursively create lyph tree nodes
        let stack = [];
        let loops = [];
        const mapToNodes = (lyphOrID, parent, idx) => {
            if (!lyphOrID) return {};
            if (parent) {
                stack.push(parent);
            }
            let lyph = lyphOrID.id ? lyphOrID : this.entitiesByID[lyphOrID];
            let topologyOption = this.topologyOptions.find(x => x.id === lyph.topology);
            if (topologyOption?.disabled) {
                return;
            }
            let length = (parent?._subtypes || []).length || 0;
            let res = LyphTreeNode.createInstance(lyph || lyphOrID, parent, idx, length);
            if (lyph) {
                let loopStart = stack.find(x => x.id === lyph.id);
                //Loop detected
                if (loopStart) {
                    loops.push(lyph.id);
                } else {
                    lyph._node = res;
                    if (lyph._subtypes) {
                        res.children = lyph._subtypes.map((x, i) => mapToNodes(x, lyph, i)).filter(x => x);
                    }
                    if (res.resource?.layers && !res.icons.includes(ICON.LAYERS)) {
                        res.icons.push(ICON.LAYERS);
                    }
                    if (parent?.layers && !res.icons.includes(ICON.LAYERS)) {
                        res.icons.push(ICON.LAYERS);
                        res.icons.push(ICON.INHERITED);
                    }
                    if (res.resource?.internalLyphs && !res.icons.includes(ICON.INTERNAL)) {
                        res.icons.push(ICON.INTERNAL);
                    }
                }
            }
            if (parent) {
                stack.pop();
            }
            return res;
        };
        let treeData = (this._model.lyphs || []).filter(e => !e._supertype).map(e => mapToNodes(e)).filter(x => x);
        this.lyphTree = treeData::sortBy([$Field.isTemplate, $Field.id]);
        this.updateView(this.selectedLyph);
        if (loops.length > 0) {
            this.showMessage("Loop is detected in the supertype hierarchy of the following lyphs: " + loops.join(", "));
        }
    }

    /**
     * Update lyph tree when lyph identifier changes
     * @param oldValue
     * @param newValue
     */
    updateLyphTreeNodeID(oldValue, newValue) {
        if (oldValue === newValue) {
            return;
        }
        const replaceNode = parent => {
            if (parent.id === oldValue) {
                if (newValue === undefined) {
                    delete parent.id;
                } else {
                    parent.id = newValue;
                }
            }
            (parent.children || []).forEach(e => replaceNode(e));
        }
        (this.lyphTree || []).forEach(e => replaceNode(e));
    }

    /**
     * Update node's property
     * @param id - node's identifier
     * @param newValue - new property value
     * @param prop - updated property
     */
    updateLyphTreeNodeProperty(id, newValue, prop) {
        const replaceNode = parent => {
            if (parent.id === id) {
                if (newValue === undefined) {
                    delete parent[prop];
                } else {
                    parent[prop] = newValue;
                }
            }
            (parent.children || []).forEach(e => replaceNode(e));
        }
        (this.lyphTree || []).forEach(e => replaceNode(e));
    }

    /**
     * Prepare a list of lyph id-name pairs for search box
     */
    updateLyphOptions() {
        this.searchOptions = SearchOptions.materialsAndLyphs(this._model);
    }

    /**
     * Prepare a list of scaffold region id-name pairs for search box
     */
    updateRegionOptions() {
        this.regionOptions = [];
        (this._model?.scaffolds || []).forEach(scaffold => {
            let nm = scaffold.namespace ? scaffold.namespace + ":" : "";
            (scaffold.regions || []).forEach(e => {
                this.regionOptions.push({
                    id: nm + e.id,
                    label: (e.name || '?') + ' (' + nm + e.id + ')',
                    type: $SchemaClass.Region
                });
            })
        });
    }

    /**
     * Select an active lyph to see and edit
     * @param nodeOrID
     */
    selectLyph(nodeOrID) {
        if (!nodeOrID) return;
        const lyphID = nodeOrID::isObject() ? nodeOrID.id : nodeOrID;
        this.selectedLyph = this.entitiesByID[lyphID];
        this._selectedNode = this.selectedLyph?._node;
        this.selectedLyphToEdit = this.selectedLyph;
        this.prepareLayerTree();
        this.prepareInternalTree();
        this.prepareChainList();
        this.prepareCoalescenceList();
        this.activeTree = TREE.lyphTree;
    }

    /**
     * Select a layer of the active lyph
     * @param node
     */
    selectLayer(node) {
        let nodeID = node::isObject() ? node.id : node;
        if (this.selectedLyph?.id !== nodeID) {
            this.selectedLyphToEdit = this.entitiesByID[nodeID];
        }
        this.activeTree = TREE.layerTree;
    }

    /**
     * Select an internal lyph of the active lyph
     * @param node
     */
    selectInternal(node) {
        let nodeID = node::isObject() ? node.id : node;
        if (this.selectedLyph?.id !== nodeID) {
            this.selectedLyphToEdit = this.entitiesByID[nodeID];
        }
        this.activeTree = TREE.internalTree;
    }

    /** A helper method to cap the layer index for internal lyph assignment */
    _setMaxLayerIndex() {
        if (this.internalTree?.length > 0 && this.layerTree?.length > 0) {
            (this.internalTree[0].children || []).forEach(c => {
                c.maxLayerIndex = this.layerTree[0].children.length - 1;
            });
        }
    }

    /**
     * Prepare a hierarchy of inherited and own layers
     */
    prepareLayerTree() {
        let loops = [];
        [this.layerTree, loops] = LyphTreeNode.preparePropertyTree(this.selectedLyph, this.entitiesByID, $Field.layers, true);
        if (loops.length > 0) {
            this.showMessage("Loop is detected in the layer hierarchy of the following lyphs: " + loops.join(", "));
        }
    }

    /**
     * Prepare a hierarchy of inherited and own internal lyphs
     */
    prepareInternalTree() {
        let loops = [];
        [this.internalTree, loops] = LyphTreeNode.preparePropertyTree(this.selectedLyph, this.entitiesByID, $Field.internalLyphs, true);
        if (loops.length > 0) {
            this.showMessage("Loop is detected in the internal lyph hierarchy of the following lyphs: " + loops.join(", "));
        }
        this._setMaxLayerIndex();
    }

    /**
     * Update selected lyph property
     * @param prop
     * @param value
     * @param oldValue
     */
    updateProperty({prop, value, oldValue}) {
        if (!$Field[prop]) {
            this.showMessage("Cannot update unknown property!");
        }
        if (this.selectedLyphToEdit) {
            if (prop === $Field.id) {
                References.replaceMaterialRefs(this._model, this.selectedLyphToEdit.id, value);
                this.entitiesByID[value] = this.entitiesByID[oldValue];
                delete this.entitiesByID[oldValue];
                if (this.selectedLyphToEdit._id) {
                    //Lyph had a fake generated identifier, now a user assigned identifier explicitly
                    delete this.selectedLyphToEdit._id;
                }
            }
            if ([$Field.id, $Field.name, $Field.isTemplate].includes(prop)) {
                this.updateLyphOptions();
            }
            if (prop === $Field.id) {
                this.updateLyphTreeNodeID(oldValue, value);
            } else {
                this.selectedLyphToEdit[prop] = value;
                this.updateLyphTreeNodeProperty(this.selectedLyphToEdit.id, value, prop);
            }
            this.prepareLayerTree();
            this.prepareInternalTree();
            this.saveStep(`Update property ${prop} of lyph ` + this.selectedLyphToEdit.id);
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
        resource._class = prop === $Field.lyphs ? $SchemaClass.Lyph : $SchemaClass.Material;
        delete resource._generated;
        this._model[prop] = this._model[prop] || [];
        this._model[prop].push(resource);
    }

    //Helper method to remove material/lyph object
    _removeMaterialOrLyph(nodeID) {
        let idx = (this._model.materials || []).findIndex(m => m.id === nodeID);
        if (idx > -1) {
            this._model.materials.splice(idx, 1);
        } else {
            idx = (this._model.lyphs || []).findIndex(m => m.id === nodeID);
            this._model.lyphs.splice(idx, 1);
        }
        this.updateLyphOptions();
    }

    /**
     * Process menu operation in the main lyph view
     * @param operation - chosen operation
     * @param node - lyph subject
     * @param index - lyph's index
     */
    processChange({operation, node, index}) {
        switch (operation) {
            case 'clone':
                this.cloneLyph(node);
                break;
            case 'select':
                this.lyphToLink = this.entitiesByID[node.id];
                break;
            case 'insert':
                this.addSubtype(node, index);
                break;
            case 'delete':
                this.deleteLyph(node, index);
                break;
            case 'deleteDef':
                this.deleteDefinition(node, this.lyphTree);
                break;
            case 'removeParent':
                this.removeSupertype(node, index);
                break;
            case 'removeChildren':
                this.removeSubtypes(node, index);
                break;
            case 'defineAsMaterial':
                this.defineAsMaterial(node, index);
                break;
            case 'defineAsLyph':
                this.defineAsLyph(node, index);
                break;
        }
    }

    /**
     * Remove supertype from the given lyph
     * @param node
     */
    removeSupertype(node) {
        let lyph = this.entitiesByID[node.id];
        if (lyph) {
            if (lyph._supertype && lyph._supertype.subtypes) {
                lyph._supertype.subtypes = lyph._supertype.subtypes.filter(e => e !== node.id);
            } else {
                console.error(lyph._supertype, node.id);
                this.showMessage("Cannot delete supertype: supertype definition error!");
            }
            delete lyph.supertype;
            this.prepareLyphTree();
            this.selectLyph(lyph);
            this.saveStep("Remove supertype of " + node.id);
        } else {
            this.showMessage("Cannot delete supertype: lyph not found!");
        }
    }

    /**
     * Remove subtypes from the given lyph
     * @param node
     */
    removeSubtypes(node) {
        let lyph = this.entitiesByID[node.id];
        if (lyph) {
            (lyph._subtypes || []).forEach(subtype => {
                delete subtype.supertype;
            })
            delete lyph.subtypes;
            this.prepareLyphTree();
            this.selectLyph(lyph);
            this.saveStep("Remove subtypes of " + node.id);
        } else {
            this.showMessage("Cannot remove subtypes: lyph not found!");
        }
    }

    /**
     * Delete lyph definition
     * @param node
     * @param activeTree
     */
    deleteDefinition(node, activeTree) {
        let lyph = this.entitiesByID[node.id];
        if (lyph) {
            this._removeMaterialOrLyph(node.id);
            this.prepareLyphTree();
            this.selectLyph(lyph.supertype);
            this.saveStep("Delete definition " + node.id);
        } else {
            this.showMessage("Cannot delete definition: lyph not found!");
        }
    }

    /**
     * Delete the lyph from the model
     * @param node
     */
    deleteLyph(node) {
        let material = this.entitiesByID[node.id];
        let cls = material._class?.toLowerCase() || $SchemaClass.Lyph;
        if (material) {
            References.clearMaterialRefs(this._model, node.id);
            this._removeMaterialOrLyph(node.id);
            this.prepareLyphTree();
            this.selectLyph(node.parent);
            this.saveStep("Delete " + cls + " " + node.id);
        } else {
            this.showMessage("Cannot delete lyph: definition not found!");
        }
    }

    /**
     * Add lyph definition
     * @param node
     */
    defineAsLyph(node) {
        this._addDefinition($Field.lyphs, node.id);
        node.type = $SchemaClass.Lyph;
        this.saveStep("Define as lyph " + node.id);
    }

    /**
     * Add material definition
     * @param node
     */
    defineAsMaterial(node) {
        this._addDefinition($Field.materials, node.id);
        node.type = $SchemaClass.Material;
        this.saveStep("Define as material " + node.id);
    }

    /**
     * Process menu operation in the internal lyphs view
     * @param operation - chosen operation
     * @param node - lyph subject
     * @param index - lyph index
     */
    processInternalChange({operation, node, index}) {
        switch (operation) {
            case 'select':
                this.lyphToLink = this.entitiesByID[node.id];
                break;
            case 'insert':
                this.addInternal(node);
                break;
            case 'clone':
                this.cloneInternal(node);
                break;
            case 'delete':
                this.deleteInternal(node, index);
                break;
            case 'deleteDef':
                this.deleteDefinition(node, this.internalTree);
                break;
            case 'removeParent':
                this.deleteInternal(node, index);
                break;
            case 'removeChildren':
                this.removeAllInternal(node);
                break;
            case 'defineAsMaterial':
                this.defineAsMaterial(node);
                break;
            case 'defineLyph':
                this.defineAsLyph(node);
                break;
        }
    }

    removeAllInternal(node) {
        let lyph = this.entitiesByID[node.id];
        if (lyph) {
            (lyph.internalLyphs || []).forEach(layer => delete layer.internalIn);
            delete lyph.internalLyphs;
            this.prepareInternalTree();
            if (lyph._node) {
                lyph._node.icons = lyph._node.icons.filter(icon => icon !== ICON.INTERNAL);
            }
            this.saveStep("Remove internal lyphs of " + node.id);
        }
    }

    addInternal(node) {
        let parent = this.entitiesByID[node.id] || this.selectedLyph;
        if (parent) {
            if (parent._class === $SchemaClass.Lyph) {
                if (!this.lyphToLink || this._isValidInternal(parent, this.lyphToLink)) {
                    let lyph = this.lyphToLink || this.defineNewLyph();
                    parent.internalLyphs = parent.internalLyphs || [];
                    parent.internalLyphs.push(lyph.id);
                    if (lyph !== this.lyphToLink) {
                        let node = LyphTreeNode.createInstance(lyph);
                        this.lyphTree = [node, ...this.lyphTree];
                    }
                    this.prepareInternalTree();
                    if (parent._node && !parent._node.icons.includes(ICON.INTERNAL)) {
                        parent._node.icons.push(ICON.INTERNAL);
                    }
                    this.saveStep(`Add internal lyph ${lyph.id} to lyph ${parent.id}`);
                }
            } else {
                this.showMessage("Cannot add internal lyph to a resource other than lyph!");
            }
        } else {
            this.showMessage("Cannot add internal: no lyph is selected!");
        }
    }

    /**
     * Delete internal lyph
     * @param node
     * @param index
     */
    deleteInternal(node, index) {
        let parent = node.parent::isObject() ? node.parent : this.entitiesByID[node.parent];
        if (!parent) {
            this.showMessage("Cannot delete the internal tree root!");
        } else {
            if (index > -1 && parent.internalLyphs?.length > index) {
                parent.internalLyphs.splice(index, 1);
                let lyph = this.entitiesByID[node.id];
                if (lyph) {
                    delete lyph.internalIn;
                }
                if (parent.internalLyphs.length === 0) {
                    if (parent._node) {
                        parent._node.icons = parent._node.icons.filter(icon => icon !== ICON.INTERNAL);
                    }
                }
            }
            this.prepareInternalTree();
        }
    }

    /**
     * Update 'internalLyphsInLayers' property
     * @param node
     * @param layerIndex
     */
    processInternalInLayerChange({node, layerIndex}) {
        if (node.parent) {
            let parent = this.entitiesByID[node.parent.id];
            let idx = node.index;
            if (!idx::isNumber()) {
                idx = (parent.internalLyphs || []).findIndex(e => e === node.id);
            }
            if (idx > -1) {
                parent.internalLyphsInLayers = parent.internalLyphsInLayers || [];
                if (parent.internalLyphsInLayers.length < idx) {
                    parent.internalLyphsInLayers.length = idx + 1;
                }
                parent.internalLyphsInLayers[idx] = Number(layerIndex);
                this.prepareLayerTree();
                this.saveStep(`Place internal lyph ${node.id} to layer ` + layerIndex);
            }
        }
    }

    /**
     * Process menu operation in the layers view
     * @param operation - chosen operation
     * @param node - lyph subject
     * @param index - lyph position
     */
    processLayerChange({operation, node, index}) {
        switch (operation) {
            case 'select':
                this.lyphToLink = this.entitiesByID[node.id];
                break;
            case 'insert':
                this.addLayer(node);
                break;
            case 'delete':
                this.deleteLayer(node, index);
                break;
            case 'clone':
                this.cloneLayer(node);
                break;
            case 'deleteDef':
                this.deleteDefinition(node, this.layerTree);
                break;
            case 'up':
                this.moveLayerUp(node, index);
                break;
            case 'down':
                this.moveLayerDown(node, index);
                break;
            case 'removeParent':
                this.deleteLayer(node, index);
                break;
            case 'removeChildren':
                this.removeLayers(node);
                break;
            case 'defineAsMaterial':
                this.defineAsMaterial(node);
                break;
            case 'defineAsLyph':
                this.defineAsLyph(node);
                break;
        }
    }

    removeLayers(node) {
        let lyph = this.entitiesByID[node.id];
        if (lyph) {
            (lyph.layers || []).forEach(layer => delete layer.layerIn);
            delete lyph.layers;
            this.prepareLayerTree();
            if (lyph._node) {
                lyph._node.icons = lyph._node.icons.filter(icon => icon !== ICON.LAYERS);
            }
            this.saveStep("Remove layers of " + node.id);
        }
    }

    _isValidSubtype(parent, child) {
        if (parent === child) {
            this.showMessage("Cannot add a lyph as subtype to its a supertype!");
            return false;
        }
        return true;
    }

    _isValidLayer(parent, child) {
        const hasTemplateLayers = _parent => {
            let supertype = this.entitiesByID[_parent];
            if (supertype) {
                if ((supertype.layers || []).length > 0) {
                    return true;
                } else {
                    if (supertype._supertype) {
                        return hasTemplateLayers(supertype._supertype);
                    }
                }
            }
            return false;
        }
        let res = (parent !== child) && !hasTemplateLayers(parent._supertype);
        if (!res) {
            this.showMessage("Cannot add a layer to this lyph: hierarchy or dependency conflict!");
            return false;
        }
        return true;
    }

    _isValidInternal(parent, child) {
        if ((child.internalLyphs || []).find(e => e.id === parent.id)) {
            this.showMessage("Cannot include lyph as internal to itself!");
            return false;
        }
        if (!child.isTemplate) {
            if ((parent.internalLyphs || []).find(e => e.id === child.id)) {
                this.showMessage("The lyph is already included as internal!");
                return false;
            }
        }
        return parent !== child;
    }

    /**
     * Add subtype to a lyph template
     * @param node
     */
    addSubtype(node) {
        if (this.lyphToLink) {
            if (!this.lyphToLink._class || this.lyphToLink._class !== $SchemaClass.Lyph) {
                this.showMessage("Cannot add a non-lyph resource as subtype");
                return;
            }
        }
        let lyph = this.lyphToLink ? this.lyphToLink : this.defineNewLyph();
        let parent = this.entitiesByID[node.id] || this.selectedLyph;
        if (parent) {
            if (this._isValidSubtype(parent, lyph)) {
                parent.isTemplate = true;
                if (lyph.supertype) {
                    let oldParent = this.entitiesByID[lyph.supertype];
                    if (oldParent && oldParent.subtypes) {
                        oldParent.subtypes = oldParent.subtypes.filter(x => x !== lyph.id);
                    }
                }
                lyph.supertype = parent.id;
                this.prepareLyphTree();
                this.selectLyph(lyph);
                this.saveStep(`Add subtype ${lyph.id} to lyph ${parent.id}`);
            }
        } else {
            this.showMessage("Cannot add subtype: no lyph is selected!");
        }
        9
    }

    /**
     * Create a new lyph by cloning an existing lyph
     * @param node
     */
    cloneLyph(node) {
        let oldLyph = this.entitiesByID[node.id] || this.selectedLyph;
        if (oldLyph) {
            const lyphDef = oldLyph::cloneDeep();
            lyphDef.id = getGenID(oldLyph.id, "clone");
            let newCounter = 2;
            while (this.entitiesByID[lyphDef.id]) {
                lyphDef.id = getGenID(oldLyph.id, "clone" + newCounter++);
            }
            let lyph = this.defineNewLyph(lyphDef);
            let newNode = LyphTreeNode.createInstance(lyph, node.parent);
            if (node.parent) {
                this.prepareLyphTree();
                this.selectedNode = newNode;
            } else {
                this.lyphTree = [newNode, ...this.lyphTree];
                this.updateView(lyph);
            }
            this.saveStep("Clone lyph " + lyph.id);
            return lyph;
        } else {
            this.showMessage("Cannot clone the lyph: definition not found!");
        }
    }

    /**
     * Add layer to the lyph
     * @param node
     */
    addLayer(node) {
        let parent = this.entitiesByID[node.id] || this.selectedLyph;
        if (parent) {
            if (parent._class === $SchemaClass.Lyph) {
                if (!this.lyphToLink || this._isValidLayer(parent, this.lyphToLink)) {
                    let lyph = this.lyphToLink || this.defineNewLyph();
                    parent.layers = parent.layers || [];
                    parent.layers.push(lyph.id);
                    if (lyph !== this.lyphToLink) {
                        let node = LyphTreeNode.createInstance(lyph);
                        this.lyphTree = [node, ...this.lyphTree];
                    }
                    this.prepareLayerTree();
                    if (parent._node && !parent._node.icons.includes(ICON.LAYERS)) {
                        parent._node.icons.push(ICON.LAYERS);
                    }
                    if (parent.internalLyphs) {
                        this.prepareInternalTree();
                    }
                    this.saveStep(`Add layer ${lyph.id} to lyph ${parent.id}`);
                }
            } else {
                this.showMessage("Cannot add layer to a resource other than lyph!");
            }
        } else {
            this.showMessage("Cannot add layer: no lyph is selected!");
        }
    }

    cloneLayer(node) {
        if (!node.parent || !node.parent.id) {
            this.showMessage("Cannot clone the layer: unknown parent!");
        }
        let parent = this.entitiesByID[node.parent.id];
        if (parent) {
            let newLyph = this.cloneLyph(node);
            this.lyphToLink = newLyph;
            this.addLayer(parent);
            this.selectLyph(parent);
            this.selectLayer(newLyph);
        } else {
            this.showMessage("Cannot clone the layer: parent not found!");
        }
    }

    cloneInternal(node) {
        if (!node.parent || !node.parent.id) {
            this.showMessage("Cannot clone the internal lyph: unknown parent!");
        }
        let parent = this.entitiesByID[node.parent.id];
        if (parent) {
            let newLyph = this.cloneLyph(node);
            this.lyphToLink = newLyph;
            this.addInternal(parent);
            this.selectLyph(parent);
            this.selectInternal(newLyph);
        } else {
            this.showMessage("Cannot clone the internal lyph: parent not found!");
        }
    }

    /**
     * Delete layer from the lyph
     * @param node
     * @param index
     */
    deleteLayer(node, index) {
        let parent = node.parent::isObject() ? node.parent : this.entitiesByID[node.parent];
        if (!parent) {
            this.showMessage("Cannot delete the layer tree root!");
        } else {
            if (index > -1 && parent.layers?.length > index) {
                parent.layers.splice(index, 1);
                let lyph = this.entitiesByID[node.id];
                if (lyph) {
                    delete lyph.layerIn;
                }
                if (parent.layers.length === 0) {
                    if (parent._node) {
                        parent._node.icons = parent._node.icons.filter(icon => icon !== ICON.LAYERS);
                    }
                }
                this.saveStep("Remove layer " + node.id + " from " + parent.id);
            }
            this.prepareLayerTree();
            if (parent.internalLyphs) {
                this.prepareInternalTree();
            }
        }
    }

    moveLayerUp(node, index) {
        if (this.layerTree) {
            let parent = this.entitiesByID[this.layerTree[0].id];
            let tmp = parent.layers[index - 1];
            parent.layers[index - 1] = parent.layers[index];
            parent.layers[index] = tmp;
            this.prepareLayerTree();
            this.saveStep("Move up layer " + index + " of lyph " + parent.id);
        }
    }

    moveLayerDown(node, index) {
        if (this.layerTree) {
            let parent = this.entitiesByID[this.layerTree[0].id];
            let tmp = parent.layers[index + 1];
            parent.layers[index + 1] = parent.layers[index];
            parent.layers[index] = tmp;
            this.prepareLayerTree();
            this.saveStep("Move down layer " + index + " of lyph " + parent.id);
        }
    }

    getCurrentState(action) {
        let snapshot = this._model::cloneDeep();
        return {
            action: action,
            snapshot: snapshot,
            selected: this.selectedLyph?.id,
            active: this.activeTree
        }
    }

    /**
     * Restore history state
     */
    restoreState() {
        this.prepareLyphTree();
        this.selectLyph(this.entitiesByID[this.steps[this.currentStep].selected]);
        this.activeTree = this.steps[this.currentStep].active;
    }

    updateTopologyFilter(options) {
        this.prepareLyphTree();
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
}

@NgModule({
    imports: [CommonModule, MatMenuModule, ResourceDeclarationModule, SearchAddBarModule, MatButtonModule,
        MatDividerModule, LyphTreeViewModule, LyphDeclarationModule, CheckboxFilterModule, ResourceListViewModule,
        LinkedResourceModule, LinkedResourceModule],
    declarations: [LyphEditorComponent],
    exports: [LyphEditorComponent]
})
export class LyphEditorModule {
}

