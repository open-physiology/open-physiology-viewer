import {NgModule, Component, Input, Output, EventEmitter} from '@angular/core';
import {MatMenuModule} from "@angular/material/menu";
import {CommonModule} from "@angular/common";
import {ResourceDeclarationModule} from "./resourceDeclarationEditor";
import {SearchAddBarModule} from "./searchAddBar";
import {MatButtonModule} from '@angular/material/button';
import {MatDividerModule} from "@angular/material/divider";
import {cloneDeep, isObject, values} from 'lodash-bound';
import {MatSnackBar, MatSnackBarConfig} from '@angular/material/snack-bar';
import {MatDialog} from "@angular/material/dialog";
import {MatListModule} from '@angular/material/list';
import {ResourceListViewModule, ListNode} from "./resourceListView";
import {ICON, LyphTreeNode, LyphTreeViewModule} from "./lyphTreeView";
import {DiffDialog} from "./diffDialog";

import {SearchOptions} from "../utils/searchOptions";
import {ResourceMaps} from "../utils/resourceMaps";
import {$Field, $SchemaClass} from "../../model";
import {LinkedResourceModule} from "./linkedResource";
import {ResourceEditor} from "./resourceEditor";

@Component({
    selector: 'coalescenceEditor',
    template: `
        <section #coalescenceEditor id="coalescenceEditor" class="w3-row">
            <section #coalescenceView id="coalescenceView" [class.w3-threequarter]="showPanel">
                <section class="w3-col">
                    <resourceListView
                            title="Coalescences"
                            expectedClass="Coalescence"
                            [listData]="coalescenceList"
                            [selectedNode]="selectedNode"
                            (onNodeClick)="selectCoalescence($event)"
                            (onChange)="processCoalescenceChange($event)"
                    >
                    </resourceListView>
                </section>
                <section class="w3-col">
                    <resourceListView *ngIf="selectedCoalescence"
                                      title="Lyphs"
                                      ordered=true
                                      expectedClass="Lyph"
                                      [listData]="coalescenceLyphs"
                                      (onNodeClick)="selectLyph($event)"
                                      (onChange)="processLyphChange($event)"
                    >
                    </resourceListView>
                </section> 
                <section class="w3-padding-right" style="position:relative;">
                    <section class="w3-bar-block w3-right vertical-toolbar" style="position:absolute; right:0">
                        <button class="w3-bar-item w3-hover-light-grey"
                                (click)="createCoalescence()" title="New coalescence">
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
                        (addSelectedItem)="addCoalescenceLyph($event)"
                >
                </searchAddBar>
                <resourceDeclaration
                        [resource]="selectedCoalescence"
                        (onValueChange)="updateProperty($event)"
                >
                </resourceDeclaration>
                <lyphTreeView *ngIf="selectedLyph"
                              title="Layers"
                              ordered=true
                              [showMenu]=false
                              [treeData]="layerTree"
                              (onNodeClick)="switchEditor($event)"
                >
                </lyphTreeView>
            </section>
        </section>
    `,
    styles: [`
        #coalescenceView {
            display: flex;
            justify-content: space-between;
        }
                
        .settings-panel{33
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
export class CoalescenceEditorComponent extends ResourceEditor {
    constructor(snackBar: MatSnackBar, dialog: MatDialog) {
        super(snackBar, dialog);
    }

    @Input('model') set model(newModel) {
        this._model = newModel::cloneDeep();
        this._modelText = JSON.stringify(this._model, null, 4);
        this.steps = [];
        this.currentStep = 0;
        this.entitiesByID = {};
        this.prepareCoalescenceList();
        ResourceMaps.materialsAndLyphs(this._model, this.entitiesByID);
        // Prepare lyphs from imported models
        (this._model.groups||[]).forEach(g => {
            if (g.imported && g.namespace !== this._model.namespace){
                ResourceMaps.importedMaterialsAndLyphs(g, this.entitiesByID);
            }
        });
        this.updateLyphOptions();
        this.updateView((this._model?.coalescences || [])[0]);
        this.saveStep('Initial model');
    };

    @Input('selectedNode') set selectedNode(value) {
        if (value && this._selectedNode !== value) {
            this._selectedNode = value;
            this.selectCoalescence(value);
        }
    }

    get selectedNode() {
        return this._selectedNode;
    }

    /**
     * Prepare nodes for the editable coalescence list
     */
    prepareCoalescenceList() {
        this.coalescenceList = [];
        (this._model.coalescences || []).forEach((cl, idx) => {
            if (cl::isObject()) {
                if (!cl.id) {
                    let counter = 1;
                    let newID = "tmpCoalescenceID" + counter;
                    while (this.entitiesByID[newID]) {
                        newID = "tmpCoalescenceID" + ++counter;
                    }
                    cl._id = true;
                    cl.id = newID;
                }
                cl._class = $SchemaClass.Coalescence;
                this.entitiesByID[cl.id] = cl;
                let node = ListNode.createInstance(cl, idx, this._model.coalescences.length);
                this.coalescenceList.push(node);
            }
        });
    }

    /**
     * Select coalescence
     * @param node
     */
    selectCoalescence(node) {
        if (node) {
            let nodeID = node::isObject() ? node.id : node;
            this.selectedCoalescence = this.entitiesByID[nodeID];
            this.prepareCoalescenceLyphs();
        }
    }

    selectLyph(node) {
        let nodeID = node::isObject() ? node.id : node;
        this.selectedLyph = this.entitiesByID[nodeID];
        this.prepareLayerTree();
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

    moveLyphUp(node, index) {
        if (this.selectedCoalescence) {
            let tmp = this.selectedCoalescence.lyphs[index - 1];
            this.selectedCoalescence.lyphs[index - 1] = this.selectedCoalescence.lyphs[index];
            this.selectedCoalescence.lyphs[index] = tmp;
            this.prepareCoalescenceLyphs();
            this.saveStep("Move up lyph " + index + " of coalescence " + this.selectedCoalescence.id);
        }
    }

    moveLyphDown(node, index) {
        if (this.selectedCoalescence) {
            let tmp = this.selectedCoalescence.lyphs[index + 1];
            this.selectedCoalescence.lyphs[index + 1] = this.selectedCoalescence.lyphs[index];
            this.selectedCoalescence.lyphs[index] = tmp;
            this.prepareCoalescenceLyphs();
            this.saveStep("Move down lyph " + index + " of coalescence " + this.selectedCoalescence.id);
        }
    }

    /**
     * Prepare list of lyph nodes used to define a selected coalescence
     * @returns {[]|*[]}
     */
    prepareCoalescenceLyphs() {
        let res = [];
        (this.selectedCoalescence?.lyphs || []).forEach((lyphID, idx) => {
            let lyph = this.entitiesByID[lyphID];
            let node = ListNode.createInstance(lyph || lyphID, idx, this.selectedCoalescence.lyphs.length);
            if (lyph?.layers) {
                node.icons.push(ICON.LAYERS);
            }
            res.push(node);
        });
        this.coalescenceLyphs = res;
    }

    /**
     * Prepare a list of lyph id-name pairs for search box
     */
    updateLyphOptions() {
        this.searchOptions = SearchOptions.lyphs(this._model);
    }

    updateWireOptions() {
        this.wireOptions = [];
        (this._model?.scaffolds || []).forEach(scaffold => {
            let nm = scaffold.namespace ? scaffold.namespace + ":" : "";
            (scaffold.wires || []).forEach(e => {
                this.wireOptions.push({
                    id: nm + e.id,
                    label: (e.name || '?') + ' (' + nm + e.id + ')',
                    type: $SchemaClass.Wire
                });
            })
        });
    }

    /**
     * Select lyph to connect via search menu
     * @param nodeLabel
     */
    selectLyphToLink(nodeLabel) {
        this.lyphToLink = this.selectBySearch(nodeLabel);
    }

    processCoalescenceChange({operation, node, index}) {
        switch (operation) {
            case 'insert':
                this.addCoalescence(node, index);
                break;
            case 'delete':
                this.deleteCoalescence(node);
                break;
        }
    }

    /**
     * Create a new chain definition
     * @returns {{[p: string]: *, _class: *}}
     */
    defineNewCoalescence() {
        let newCounter = 1;
        let newID = "_newCoalescence" + newCounter;
        while (this.entitiesByID[newID]) {
            newID = "_newCoalescence" + ++newCounter;
        }
        let newCoalescence = {
            [$Field.id]: newID,
            [$Field.name]: "New coalescence " + newCounter,
            "_class": $SchemaClass.Coalescence
        }
        this._model.coalescences = this._model.coalescences || [];
        this._model.coalescences.push(newCoalescence);
        this.entitiesByID[newCoalescence.id] = newCoalescence;
        return newCoalescence;
    }

    /**
     * Create a new chain
     */
    createCoalescence() {
        let chain = this.defineNewCoalescence();
        let node = ListNode.createInstance(chain);
        this.coalescenceList = [node, ...this.coalescenceList];
        this.saveStep("Create new chain " + chain.id);
    }

    /**
     * Add chain
     * @param node
     * @param index
     */
    addCoalescence(node, index) {
        this.createCoalescence();
    }

    deleteCoalescence(node) {
        let coalescence = this.entitiesByID[node.id];
        let cls = coalescence._class?.toLowerCase() || $SchemaClass.Coalescence;
        if (coalescence) {
            let idx = (this._model.coalescences || []).findIndex(e => e.id === node.id);
            if (idx > -1) {
                this._model.coalescences.splice(idx, 1);
                this.prepareCoalescenceList();
                this.updateView(this._model.coalescences[0]);
            }
        }
        this.saveStep("Delete " + cls + " " + node.id);
    }

    updateView(coalescence) {
        this.selectedCoalescence = coalescence;
        this.prepareCoalescenceLyphs();
        if (this.selectedNode?.id !== this.selectedCoalescence?.id) {
            this.selectedNode = this.selectedCoalescence.id;
        }
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
                this.addCoalescenceLyph(node, index);
                break;
            case 'delete':
                this.deleteCoalescenceLyph(node, index);
                break;
            case 'up':
                this.moveLyphUp(node, index);
                break;
            case 'down':
                this.moveLyphDown(node, index);
                break;
            case 'defineAsLyph':
                this.defineAsLyph(node, index);
                break;
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

    /**
     * Add lyph definition
     * @param node
     */
    defineAsLyph(node) {
        this._addDefinition($Field.lyphs, node.id);
        node.class = $SchemaClass.Lyph;
        this.saveStep("Define as lyph " + node.id);
        this.updateLyphOptions();
    }

    _isValidCoalescenceLyph(lyph) {
        if (lyph.isTemplate) {
            this.showMessage("Cannot add a lyph template to coalescence");
            return false;
        }
        return true;
    }

    /**
     * Add layer to the lyph
     * @param node
     * @param index
     */
    addCoalescenceLyph(node, index) {
        if (this.selectedCoalescence) {
            if (!this.lyphToLink) {
                this.showMessage("Lyph is not selected!");
            } else {
                if (this._isValidCoalescenceLyph(this.lyphToLink)) {
                    this.selectedCoalescence.lyphs = this.selectedCoalescence.lyphs || [];
                    this.selectedCoalescence.lyphs.push(this.lyphToLink.id);
                    this.prepareCoalescenceLyphs();
                    this.saveStep(`Add lyph ${this.lyphToLink.id} to coalescence ${this.selectedCoalescence.id}`);
                }
            }
        } else {
            this.showMessage("Cannot add lyph: no coalescence is selected!");
        }
    }

    /**
     * Delete layer from the lyph
     * @param node
     * @param index
     */
    deleteCoalescenceLyph(node, index) {
        if (!this.selectedCoalescence) {
            this.showMessage("Cannot delete the lyph: coalescence is not selected!");
        } else {
            if (index > -1 && this.selectedCoalescence.lyphs?.length > index) {
                this.selectedCoalescence.lyphs.splice(index, 1);
                let lyph = this.entitiesByID[node.id];
                if (lyph) {
                    delete lyph.levelIn;
                }
                this.saveStep("Remove lyph " + node.id + " from " + parent.id);
            }
            this.prepareCoalescenceLyphs();
        }
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
        if (this.selectedCoalescence) {
            if (prop === $Field.id) {
                this.entitiesByID[value] = this.entitiesByID[oldValue];
                delete this.entitiesByID[oldValue];
                if (this.selectedCoalescence._id) {
                    delete this.selectedCoalescence._id;
                }
            }
            if (prop === $Field.id) {
                this.prepareCoalescenceList();
            } else {
                this.selectedCoalescence[prop] = value;
            }
            this.saveStep(`Update property ${prop} of coalescence ` + this.selectedCoalescence.id);
        }
    }

    getCurrentState(action){
        let snapshot = this._model::cloneDeep();
        return {action: action, snapshot: snapshot, selected: this.selectedCoalescence?.id};
    }

    /**
     * Restore history state
     */
    restoreState() {
        this.prepareCoalescenceList();
        let newSelected = this.entitiesByID[this.steps[this.currentStep].selected];
        this.updateView(newSelected);
    }

    /**
     * Undo the operation
     */
    get canUndo() {
        return this.currentStep > 0;
    }

    get canRedo() {
        return this.currentStep < this.steps.length - 1;
    }

    get undoTitle() {
        return `Undo ${(this.canUndo ? '"' + this.steps[this.currentStep].action + '"' : "")}`;
    }

    get redoTitle() {
        return `Redo ${(this.canRedo ? '"' + this.steps[this.currentStep + 1].action + '"' : "")}`;
    }

    /**
     * Undo the operation
     */
    undo() {
        if (this.currentStep > 0 && this.currentStep < this.steps.length) {
            this.currentStep -= 1;
            this.restoreState();
        }
    }

    /**
     * Redo the operation
     */
    redo() {
        if (this.currentStep >= 0 && this.currentStep < this.steps.length - 1) {
            this.currentStep += 1;
            this.restoreState();
        }
    }
}

@NgModule({
    imports: [CommonModule, MatMenuModule, ResourceDeclarationModule, SearchAddBarModule, MatButtonModule,
        MatDividerModule, ResourceListViewModule, MatListModule, LinkedResourceModule,
        LyphTreeViewModule],
    declarations: [CoalescenceEditorComponent],
    exports: [CoalescenceEditorComponent]
})
export class CoalescenceEditorModule {
}

