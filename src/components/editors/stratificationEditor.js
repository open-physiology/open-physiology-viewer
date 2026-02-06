import {NgModule, Component, Input, Output, EventEmitter} from '@angular/core';
import {MatMenuModule} from "@angular/material/menu";
import {CommonModule} from "@angular/common";
import {ResourceDeclarationModule} from "./resourceDeclarationEditor";
import {SearchAddBarModule} from "../gui/searchAddBar";
import {MatButtonModule} from '@angular/material/button';
import {MatDividerModule} from "@angular/material/divider";
import {cloneDeep, isObject, values} from 'lodash-bound';
import {MatSnackBar, MatSnackBarConfig} from '@angular/material/snack-bar';
import {MatDialog} from "@angular/material/dialog";
import {MatListModule} from '@angular/material/list';
import {ResourceListViewModule} from "./resourceListView";
import {ListNode} from "../structs/listNode";
import {ICON, LyphTreeNode, LyphTreeViewModule} from "./lyphTreeView";
import {DiffDialog} from "../dialogs/diffDialog";

import {SearchOptions} from "../utils/searchOptions";
import {ResourceMaps} from "../utils/resourceMaps";
import {$Field, $SchemaClass, getGenName} from "../../model";
import {LinkedResourceModule} from "../gui/linkedResource";
import {ResourceEditor} from "./resourceEditor";
import {defineNewResource} from "../../model/utils";

@Component({
    selector: 'stratificationEditor',
    template: `
        <section #stratificationEditor id="stratificationEditor" class="w3-row">
            <section #stratificationView id="stratificationView" [class.w3-threequarter]="showPanel">
                <section class="w3-col">
                    <resourceListView
                            listTitle="Stratifications"
                            expectedClass="Stratification"
                            [listData]="stratificationList"
                            [selectedNode]="selectedNode"
                            (onNodeClick)="selectStratification($event)"
                            (onChange)="processStratificationChange($event)"
                    >
                    </resourceListView>
                </section>
                <section class="w3-col">
                    <resourceListView *ngIf="selectedStratification"
                                      listTitle="Strata"
                                      ordered=true
                                      expectedClass="Material"
                                      [listData]="stratificationMaterials"
                                      (onNodeClick)="selectMaterial($event)"
                                      (onChange)="processMaterialChange($event)"
                    >
                    </resourceListView>
                </section>
                <section class="w3-col">
                    <resourceListView *ngIf="selectedStratification"
                                      listTitle="Wires"
                                      ordered=true
                                      expectedClass="Wire"
                                      [listData]="stratificationWires"
                                      (onNodeClick)="selectWire($event)"
                                      (onChange)="processWireChange($event)"
                    >
                    </resourceListView>
                </section>
                <section class="w3-padding-right" style="position:relative;">
                    <section class="w3-bar-block w3-right vertical-toolbar" style="position:absolute; right:0">
                        <button class="w3-bar-item w3-hover-light-grey"
                                (click)="createStratification()" title="New stratification">
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
                        [resource]="selectedStratification"
                        [color]="COLORS.selectedBorder"
                        [highlightColor]="COLORS.selected"
                >
                </linkedResource>
                <linkedResource
                        [resource]="materialToLink">
                </linkedResource>
                <searchAddBar
                        [searchOptions]="searchOptions"
                        [selected]="materialToLink?.id"
                        (selectedItemChange)="selectMaterialToLink($event)"
                        (addSelectedItem)="addStratificationMaterial($event)"
                >
                </searchAddBar>
                <resourceDeclaration
                        [resource]="selectedStratification"
                        (onValueChange)="updateProperty($event)"
                >
                </resourceDeclaration>
                <lyphTreeView *ngIf="selectedMaterial && selectedMaterial.layers"
                              listTitle="Layers"
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
        #stratificationView {
            display: flex;
            justify-content: space-between;
        }

        .settings-panel {
            33 height: 100vh;
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
export class StratificationEditorComponent extends ResourceEditor {
    stratificationList;
    stratificationMaterials;
    stratificationWires;
    selectedStratification;
    selectedMaterial;
    selectedWire;
    materialToLink;
    layerTree;

    constructor(snackBar: MatSnackBar, dialog: MatDialog) {
        super(snackBar, dialog);
    }

    @Input('model') set model(newModel) {
        this._model = newModel::cloneDeep();
        this.clearHelpers(this._model);
        this._modelText = JSON.stringify(this._model, null, 4);
        this.steps = [];
        this.currentStep = 0;
        this.entitiesByID = {};
        this.prepareStratificationList();
        ResourceMaps.materialsAndLyphs(this._model, this.entitiesByID);
        // Prepare resources from imported models
        (this._model.groups || []).forEach(g => {
            if (g.imported && g.namespace !== this._model.namespace) {
                ResourceMaps.importedMaterialsAndLyphs(g, this.entitiesByID);
            }
        });
        this.updateSearchOptions();
        this.updateView((this._model?.stratifications || [])[0]);
        this.saveStep('Initial model');
    };

    @Input('selectedNode') set selectedNode(value) {
        if (value && this._selectedNode !== value) {
            this._selectedNode = value;
            this.selectStratification(value);
        }
    }

    get selectedNode() {
        return this._selectedNode;
    }

    /**
     * Prepare nodes for the editable stratification list
     */
    prepareStratificationList() {
        this.stratificationList = [];
        (this._model?.stratifications || []).forEach((st, idx) => {
            if (st::isObject()) {
                if (!st.id) {
                    let counter = 1;
                    let newID = "tmpStratificationID" + counter;
                    while (this.entitiesByID[newID]) {
                        newID = "tmpStratificationID" + ++counter;
                    }
                    st._id = true;
                    st.id = newID;
                }
                st._class = $SchemaClass.Stratification;
                this.entitiesByID[st.id] = st;
                let node = ListNode.createInstance(st, idx, this._model.stratifications.length);
                this.stratificationList.push(node);
            }
        });
    }

    /**
     * Select stratification
     * @param node
     */
    selectStratification(node) {
        if (node) {
            let nodeID = node::isObject() ? node.id : node;
            this.selectedStratification = this.entitiesByID[nodeID];
            this.prepareStratificationMaterials();
            this.prepareStratificationWires();
        }
    }

    selectMaterial(node) {
        let nodeID = node::isObject() ? node.id : node;
        this.selectedMaterial = this.entitiesByID[nodeID];
        if (this.selectedMaterial?.layers) {
            this.prepareLayerTree();
        }
    }

    selectWire(node) {
        let nodeID = node::isObject() ? node.id : node;
        this.selectedWire = this.entitiesByID[nodeID];
    }

    /**
     * Prepare a hierarchy of inherited and own layers
     */
    prepareLayerTree() {
        let loops = [];
        [this.layerTree, loops] = LyphTreeNode.preparePropertyTree(this.selectedMaterial, this.entitiesByID, $Field.layers, true);
        if (loops.length > 0) {
            this.showWarning("Loop is detected in the layer hierarchy of the following lyphs: " + loops.join(", "));
        }
    }

    moveMaterialUp(node, index) {
        if (this.selectedStratification) {
            let tmp = this.selectedStratification.strata[index - 1];
            this.selectedStratification.strata[index - 1] = this.selectedStratification.strata[index];
            this.selectedStratification.strata[index] = tmp;
            this.prepareStratificationMaterials();
            this.saveStep("Move up stratum " + index + " of stratification " + this.selectedStratification.id);
        }
    }

    moveMaterialDown(node, index) {
        if (this.selectedStratification) {
            let tmp = this.selectedStratification.strata[index + 1];
            this.selectedStratification.strata[index + 1] = this.selectedStratification.strata[index];
            this.selectedStratification.strata[index] = tmp;
            this.prepareStratificationMaterials();
            this.saveStep("Move down stratum " + index + " of stratification " + this.selectedStratification.id);
        }
    }

    moveWireUp(node, index) {
        if (this.selectedStratification) {
            let tmp = this.selectedStratification.axisWires[index - 1];
            this.selectedStratification.axisWires[index - 1] = this.selectedStratification.axisWires[index];
            this.selectedStratification.axisWires[index] = tmp;
            this.prepareStratificationWires();
            this.saveStep("Move up axis wire " + index + " of stratification " + this.selectedStratification.id);
        }
    }

    moveWireDown(node, index) {
        if (this.selectedStratification) {
            let tmp = this.selectedStratification.axisWires[index + 1];
            this.selectedStratification.axisWires[index + 1] = this.selectedStratification.axisWires[index];
            this.selectedStratification.axisWires[index] = tmp;
            this.prepareStratificationWires();
            this.saveStep("Move down axis wire " + index + " of stratification " + this.selectedStratification.id);
        }
    }

    /**
     * Prepare list of material nodes used to define a selected stratification
     * @returns {[]|*[]}
     */
    prepareStratificationMaterials() {
        let res = [];
        (this.selectedStratification?.strata || []).forEach((materialID, idx) => {
            let material = this.entitiesByID[materialID];
            let node = ListNode.createInstance(material || materialID, idx, this.selectedStratification.strata.length);
            if (material?.layers) {
                node.icons.push(ICON.LAYERS);
            }
            res.push(node);
        });
        this.stratificationMaterials = res;
    }

    /**
     * Prepare list of wire nodes used to define a selected stratification
     * @returns {[]|*[]}
     */
    prepareStratificationWires() {
        let res = [];
        (this.selectedStratification?.axisWires || []).forEach((wireID, idx) => {
            let wire = this.entitiesByID[wireID];
            let node = ListNode.createInstance(wire || wireID, idx, this.selectedStratification.axisWires.length);
            res.push(node);
        });
        this.stratificationWires = res;
    }

    /**
     * Prepare a list of material/lyph id-name pairs for search box
     */
    updateSearchOptions() {
        this.searchOptions = SearchOptions.materialsAndLyphs(this._model);
    }

    /**
     * Select material to connect via search menu
     * @param nodeLabel
     */
    selectMaterialToLink(nodeLabel) {
        this.materialToLink = this.selectBySearch(nodeLabel);
    }

    processStratificationChange({operation, node, index}) {
        switch (operation) {
            case 'insert':
                this.addStratification(node, index);
                break;
            case 'delete':
                this.deleteStratification(node);
                break;
            case 'select':
                this.selectStratification(node);
                break;
        }
    }

    /**
     * Create a new stratification definition
     * @returns {{[p: string]: *, _class: *}}
     */
    defineNewStratification(def) {
        let newStratification;
        if (def && typeof def === 'object') {
            // Ensure unique id
            let baseId = def.id || '_newStratification';
            let candidate = baseId;
            let idx = 1;
            while (this.entitiesByID[candidate]) {
                const m = (baseId.match(/^(.*?)(\d+)$/) || []);
                if (m.length) {
                    candidate = `${m[1]}${parseInt(m[2],10)+1}`;
                } else {
                    idx += 1;
                    candidate = `_newStratification${idx}`;
                }
            }
            def.id = candidate;
            def._class = def._class || $SchemaClass.Stratification;
            newStratification = def;
        } else {
            newStratification = defineNewResource({
                [$Field.id]: "_newStratification",
                [$Field.name]: "New stratification",
                "_class": $SchemaClass.Stratification
            }, this.entitiesByID);
        }
        this._model.stratifications = this._model.stratifications || [];
        this._model.stratifications.push(newStratification);
        this.entitiesByID[newStratification.id] = newStratification;
        return newStratification;
    }

    /**
     * Create a new stratification
     */
    createStratification(def) {
        let stratification = this.defineNewStratification(def);
        let node = ListNode.createInstance(stratification);
        this.stratificationList = [node, ...this.stratificationList];
        this.saveStep("Create new stratification " + stratification.id);
    }

    /**
     * Add stratification
     * @param node
     * @param index
     */
    addStratification(node, index) {
        this.createStratification();
    }

    deleteStratification(node) {
        let stratification = this.entitiesByID[node.id];
        let cls = stratification._class?.toLowerCase() || $SchemaClass.Stratification;
        if (stratification) {
            let idx = (this._model.stratifications || []).findIndex(e => e.id === node.id);
            if (idx > -1) {
                this._model.stratifications.splice(idx, 1);
                this.prepareStratificationList();
                this.updateView(this._model.stratifications[0]);
            }
        }
        this.saveStep("Delete " + cls + " " + node.id);
    }

    updateView(stratification) {
        this.selectedStratification = stratification;
        this.prepareStratificationMaterials();
        this.prepareStratificationWires();
        if (this.selectedNode?.id !== this.selectedStratification?.id) {
            this.selectedNode = this.selectedStratification?.id;
        }
    }

    /**
     * Process menu operation in the strata view
     * @param operation - chosen operation
     * @param node - material subject
     * @param index - material index
     */
    processMaterialChange({operation, node, index}) {
        switch (operation) {
            case 'insert':
                this.addStratificationMaterial(node, index);
                break;
            case 'delete':
                this.deleteStratificationMaterial(node, index);
                break;
            case 'select':
                this.materialToLink = this.entitiesByID[node.id];
                this.selectMaterial(node);
                break;
            case 'up':
                this.moveMaterialUp(node, index);
                break;
            case 'down':
                this.moveMaterialDown(node, index);
                break;
        }
    }

    /**
     * Process menu operation in the wires view
     * @param operation - chosen operation
     * @param node - wire subject
     * @param index - wire index
     */
    processWireChange({operation, node, index}) {
        switch (operation) {
            case 'delete':
                this.deleteStratificationWire(node, index);
                break;
            case 'select':
                this.selectWire(node);
                break;
            case 'up':
                this.moveWireUp(node, index);
                break;
            case 'down':
                this.moveWireDown(node, index);
                break;
        }
    }

    /**
     * Add material to the stratification
     * @param node
     * @param index
     */
    addStratificationMaterial(node, index) {
        if (this.selectedStratification) {
            if (!this.materialToLink) {
                this.showWarning("Material is not selected!");
            } else {
                this.selectedStratification.strata = this.selectedStratification.strata || [];
                this.selectedStratification.strata.push(this.materialToLink.id);
                this.prepareStratificationMaterials();
                this.saveStep(`Add material ${this.materialToLink.id} to stratification ${this.selectedStratification.id}`);
            }
        } else {
            this.showWarning("Cannot add material: no stratification is selected!");
        }
    }

    /**
     * Delete material from the stratification
     * @param node
     * @param index
     */
    deleteStratificationMaterial(node, index) {
        if (!this.selectedStratification) {
            this.showWarning("Cannot delete the material: stratification is not selected!");
        } else {
            if (index > -1 && this.selectedStratification.strata?.length > index) {
                this.selectedStratification.strata.splice(index, 1);
                this.saveStep("Remove material " + node.id + " from stratification " + this.selectedStratification.id);
            }
            this.prepareStratificationMaterials();
        }
    }

    /**
     * Delete wire from the stratification
     * @param node
     * @param index
     */
    deleteStratificationWire(node, index) {
        if (!this.selectedStratification) {
            this.showWarning("Cannot delete the wire: stratification is not selected!");
        } else {
            if (index > -1 && this.selectedStratification.axisWires?.length > index) {
                this.selectedStratification.axisWires.splice(index, 1);
                this.saveStep("Remove wire " + node.id + " from stratification " + this.selectedStratification.id);
            }
            this.prepareStratificationWires();
        }
    }

    /**
     * Update selected stratification property
     * @param prop
     * @param value
     * @param oldValue
     */
    updateProperty({prop, value, oldValue}) {
        if (!$Field[prop]) {
            this.showWarning("Cannot update unknown property!");
        }
        if (this.selectedStratification) {
            if (prop === $Field.id) {
                this.entitiesByID[value] = this.entitiesByID[oldValue];
                delete this.entitiesByID[oldValue];
                if (this.selectedStratification._id) {
                    delete this.selectedStratification._id;
                }
            }
            if (prop === $Field.id) {
                this.prepareStratificationList();
            } else {
                this.selectedStratification[prop] = value;
            }
            this.saveStep(`Update property ${prop} of stratification ` + this.selectedStratification.id);
        }
    }

    getCurrentState(action) {
        let snapshot = this._model::cloneDeep();
        return {action: action, snapshot: snapshot, selected: this.selectedStratification?.id};
    }

    /**
     * Restore history state
     */
    restoreState() {
        this.prepareStratificationList();
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
    declarations: [StratificationEditorComponent],
    exports: [StratificationEditorComponent]
})
export class StratificationEditorModule {
}
