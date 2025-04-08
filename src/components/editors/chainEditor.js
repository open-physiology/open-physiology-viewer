import {NgModule, Component, Input, Output, EventEmitter} from '@angular/core';
import {MatDialog} from "@angular/material/dialog";
import {MatListModule} from '@angular/material/list';
import {MatMenuModule} from "@angular/material/menu";
import {CommonModule} from "@angular/common";
import {ResourceDeclarationModule} from "./resourceDeclarationEditor";
import {SearchAddBarModule} from "./searchAddBar";
import {CheckboxFilterModule} from "./checkboxFilter";
import {MatButtonModule} from '@angular/material/button';
import {MatDividerModule} from "@angular/material/divider";
import {cloneDeep, isObject, values} from 'lodash-bound';
import {ChainDeclarationModule} from "./chainDeclarationEditor";
import {MatSnackBar, MatSnackBarConfig} from '@angular/material/snack-bar';
import {DiffDialog} from "./diffDialog";
import {ICON, LyphTreeNode, LyphTreeViewModule} from "./lyphTreeView";
import {ResourceListViewModule, ListNode} from "./resourceListView";

import {prepareMaterialLyphMap, prepareLyphSearchOptions, prepareImportedMaterialLyphMap} from "../gui/utils";
import {$Field, $SchemaClass} from "../../model";

@Component({
    selector: 'chainEditor',
    template: `
        <section #chainEditor id="chainEditor" class="w3-row">
            <section #chainView id="chainView" [class.w3-threequarter]="showPanel">
                <section class="w3-col">
                    <resourceListView
                            title="Chains"
                            expectedClass="Chain"
                            [listData]="chainList"
                            [selectedNode]="selectedNode"
                            (onNodeClick)="selectChain($event)"
                            (onChange)="processChainChange($event)"
                    >
                    </resourceListView>
                </section>
                <section class="w3-col">
                    <resourceListView *ngIf="selectedChain"
                                      title="Lyphs"
                                      ordered=true
                                      expectedClass="Lyph"
                                      splitable=true
                                      [listData]="chainLyphs"
                                      (onNodeClick)="selectLyph($event)"
                                      (onChange)="processLyphChange($event)"
                    >
                    </resourceListView>
                </section>
                <section *ngIf="selectedChain?.levels" class="w3-col">
                    <resourceListView 
                                      title="Levels"
                                      [showMenu]="false"
                                      ordered=true
                                      expectedClass="Link"
                                      [listData]="chainLevels"
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
                    </section>
                </section>
            </section>
            <section *ngIf="showPanel" class="w3-quarter w3-white settings-panel">
                <searchAddBar
                        [searchOptions]="searchOptions"
                        [selected]="lyphToLink?.id"
                        (selectedItemChange)="selectBySearch($event)"
                        (addSelectedItem)="addChainLyph($event)"
                >
                </searchAddBar>
                <chainDeclaration
                        [lyph]="selectedChain"
                        [wireOptions]="wireOptions"
                        (onValueChange)="updateProperty($event)"
                        (onCreateLateral)="createLateral($event)"
                >
                </chainDeclaration>
                <lyphTreeView *ngIf="selectedLyph"
                              title="Layers"
                              [ordered]=true
                              [showMenu]=false
                              [treeData]="layerTree"
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
            height: 100vh;
            overflow-y: auto;
            overflow-x: auto;
        }
    `]
})
/**
 * @class
 * @property entitiesByID
 */
export class ChainEditorComponent {
    _model;
    _snackBar;
    _snackBarConfig = new MatSnackBarConfig();
    _selectedNode;

    chainList;
    searchOptions;
    steps = [];
    currentStep = 0;

    showPanel = true;
    entitiesByID = {};

    @Input('model') set model(newModel) {
        this._model = newModel::cloneDeep();
        this._modelText = JSON.stringify(this._model, null, 4);
        this.steps = [];
        this.currentStep = 0;
        this.entitiesByID = {};
        this.prepareChainList();
        prepareMaterialLyphMap(this._model, this.entitiesByID);
        (this._model.groups || []).forEach(g => {
            if (g.imported && g.namespace !== this._model.namespace) {
                prepareImportedMaterialLyphMap(g, this.entitiesByID);
            }
        });
        // Need links and nodes for level editing
        (this._model.links || []).forEach(obj => {
            obj._class = $SchemaClass.Link;
            this.entitiesByID[obj.id] = obj;
        });
        (this._model.nodes || []).forEach(obj => {
            obj._class = $SchemaClass.Node;
            this.entitiesByID[obj.id] = obj;
        });

        this.updateLyphOptions();
        this.updateWireOptions();
        this.updateView((this._model?.chains || [])[0]);
        this.saveStep('Initial model');
    };

    @Input('selectedNode') set selectedNode(value) {
        if (value && this._selectedNode !== value) {
            this._selectedNode = value;
            this.selectChain(value);
        }
    }

    get selectedNode() {
        return this._selectedNode;
    }

    @Output() onChangesSave = new EventEmitter();

    constructor(snackBar: MatSnackBar, dialog: MatDialog) {
        this.dialog = dialog;
        this._snackBar = snackBar;
        this._snackBarConfig.panelClass = ['w3-panel', 'w3-orange'];
    }

    /**
     * Prepare nodes for the editable chain list
     */
    prepareChainList() {
        this.chainList = [];
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
                let node = ListNode.createInstance(chain, idx, this._model.chains.length);
                this.chainList.push(node);
            }
        });
    }

    /**
     * Select chain
     * @param node
     */
    selectChain(node) {
        let nodeID = node::isObject() ? node.id : node;
        this.selectedChain = this.entitiesByID[nodeID];
        this.prepareChainLyphs();
    }

    selectLyph(node) {
        let nodeID = node::isObject() ? node.id : node;
        this.selectedLyph = this.entitiesByID[nodeID];
        this.prepareLayerTree();
    }

    selectLevel(node) {
        let nodeID = node::isObject() ? node.id : node;
        this.selectedLink = this.entitiesByID[nodeID];
        if (this.selectedLink.conveyingLyph) {
            this.selectedLyph = this.entitiesByID[this.selectedLink.conveyingLyph];
            if (this.selectedLyph) {
                this.prepareLayerTree();
            }
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

    split(node, index){
        if (this.selectedChain) {
            let headLyphs = this.selectedChain.lyphs.slice(0, index);
            let tailLyphs = this.selectedChain.lyphs.slice(index + 1);
            if (headLyphs.length === 0 || tailLyphs.length === 0){
                this.showMessage("Splitting cannot lead to a chain with no lyphs. Create a new chain instead!");
                return;
            }
            let nodeID = "n-split_" + node.id.replace("lyph_", "").replace("lyph-", "");
            // The main chain gets shorter
            this.selectedChain.left = nodeID;
            this.selectedChain.lyphs = headLyphs;
            this.selectedChain.leaf = nodeID;

            let tailChain = {
                "id": this.selectedChain.id + "-tail",
                "root": nodeID,
                "name": this.selectedChain.name + " tail",
                "lyphs": tailLyphs,
            }
            if (this.selectedChain.name?.includes("->")) {
                const [root, leaf] = this.selectedChain.name.split(/\s*->\s*/);
                if (node.label?.includes("->")) {
                    const [start, end] = node.label.split(/\s*->\s*/);
                    this.selectedChain.name = this.selectedChain.name.replace(leaf, end);
                    tailChain.name = end + " -> " + leaf;
                }
            }
            tailChain = this.createChain(tailChain);
            tailChain.lyphs = tailLyphs;

            this.prepareChainLyphs();
            this.saveStep("Split chain " + this.selectedChain.id + " at level " + index);
        }
    }

    moveLevelUp(node, index) {
        if (this.selectedChain) {
            let tmp = this.selectedChain.lyphs[index - 1];
            this.selectedChain.lyphs[index - 1] = this.selectedChain.lyphs[index];
            this.selectedChain.lyphs[index] = tmp;
            this.prepareChainLyphs();
            this.saveStep("Move up lyph " + index + " of chain " + this.selectedChain.id);
        }
    }

    moveLevelDown(node, index) {
        if (this.selectedChain) {
            let tmp = this.selectedChain.lyphs[index + 1];
            this.selectedChain.lyphs[index + 1] = this.selectedChain.lyphs[index];
            this.selectedChain.lyphs[index] = tmp;
            this.prepareChainLyphs();
            this.saveStep("Move down lyph " + index + " of chain " + this.selectedChain.id);
        }
    }

    /**
     * Prepare list of lyph nodes used to define a selected chain
     * @returns {[]|*[]}
     */
    prepareChainLyphs() {
        let res = [];
        (this.selectedChain?.lyphs || []).forEach((lyphID, idx) => {
            let lyph = this.entitiesByID[lyphID];
            let node = ListNode.createInstance(lyph || lyphID, idx, this.selectedChain.lyphs.length);
            if (lyph?.layers) {
                node.icons.push(ICON.LAYERS);
            }
            res.push(node);
        });
        this.chainLyphs = res;
        if (this.selectedChain?.levels){
            this.prepareChainLevels();
        }
    }

    prepareChainLevels() {
        let res = [];
        (this.selectedChain?.levels || []).forEach((linkID, idx) => {
            let link = this.entitiesByID[linkID];
            let node = ListNode.createInstance(link || linkID, idx, this.selectedChain.levels.length);
            res.push(node);
        });
        this.chainLevels = res;
    }

    /**
     * Prepare a list of lyph id-name pairs for search box
     */
    updateLyphOptions() {
        this.searchOptions = prepareLyphSearchOptions(this._model);
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
    selectBySearch(nodeLabel) {
        if (!nodeLabel && this.lyphToLink) {
            this.lyphToLink = null;
        } else {
            let nodeID = nodeLabel.substring(
                nodeLabel.indexOf("(") + 1,
                nodeLabel.lastIndexOf(")")
            );
            this.lyphToLink = this.entitiesByID[nodeID];
        }
    }

    processChainChange({operation, node, index}) {
        switch (operation) {
            case 'insert':
                this.addChain(node, index);
                break;
            case 'delete':
                this.deleteChain(node);
                break;
        }
    }

    /**
     * Create a new chain
     */
    createChain(_chain) {
        const defineNewChain = () => {
            let newCounter = 1;
            let newID = "_newChain" + newCounter;
            while (this.entitiesByID[newID]) {
                newID = "_newChain" + ++newCounter;
            }
            return {
                [$Field.id]: newID,
                [$Field.name]: "New chain " + newCounter
            }
        }
        const chain = _chain || defineNewChain();
        chain._class = $SchemaClass.Chain;
        this._model.chains = this._model.chains || [];
        this._model.chains.push(chain);
        this.entitiesByID[chain.id] = chain;
        //Add to model
        let node = ListNode.createInstance(chain);
        this.chainList = [node, ...this.chainList];
        this.selectChain(chain.id);
        this.saveStep("Create chain " + chain.id);
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

    deleteChain(node) {
        let chain = this.entitiesByID[node.id];
        let cls = chain._class?.toLowerCase() || $SchemaClass.Chain;
        if (chain) {
            let idx = (this._model.chains || []).findIndex(e => e.id === node.id);
            if (idx > -1) {
                this._model.chains.splice(idx, 1);
                this.prepareChainList();
                this.updateView(this._model.chains[0]);
            }
        }
        this.saveStep("Delete " + cls + " " + node.id);
    }

    updateView(chain) {
        this.selectedChain = chain;
        this.prepareChainLyphs();
        if (this.selectedNode?.id !== this.selectedChain?.id) {
            this.selectedNode = this.selectedChain.id;
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
                this.addChainLyph(node, index);
                break;
            case 'delete':
                this.deleteChainLyph(node, index);
                break;
            case 'up':
                this.moveLevelUp(node, index);
                break;
            case 'down':
                this.moveLevelDown(node, index);
                break;
            case 'defineAsLyph':
                this.defineAsLyph(node, index);
                break;
            case "split":
                this.split(node,index);
                break;
        }
    }

    processLevelChange(operation, node, index){
        this.showMessage("Operations on levels not supported!");
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

    _isValidChainLyph(lyph) {
        if (lyph.isTemplate) {
            this.showMessage("Cannot add a lyph template as level to the chain conveying lyphs");
            return false;
        }
        return true;
    }

    /**
     * Add layer to the lyph
     * @param node
     * @param index
     */
    addChainLyph(node, index) {
        if (this.selectedChain) {
            if (!this.lyphToLink) {
                this.showMessage("Lyph is not selected!");
            } else {
                if ((this.selectedChain.levels || []).length > 0) {
                    this.showMessage("Cannot add lyphs - the chain is defined using levels!");
                    return;
                }
                if (this._isValidChainLyph(this.lyphToLink)) {
                    this.selectedChain.lyphs = this.selectedChain.lyphs || [];
                    this.selectedChain.lyphs.push(this.lyphToLink.id);
                    this.prepareChainLyphs();
                    this.saveStep(`Add level ${this.lyphToLink.id} to chain ${this.selectedChain.id}`);
                }
            }
        } else {
            this.showMessage("Cannot add level: no chain is selected!");
        }
    }

    /**
     * Delete layer from the lyph
     * @param node
     * @param index
     */
    deleteChainLyph(node, index) {
        if (!this.selectedChain) {
            this.showMessage("Cannot delete the chain lyph: chain is not selected!");
        } else {
            if (index > -1 && this.selectedChain.lyphs?.length > index) {
                this.selectedChain.lyphs.splice(index, 1);
                let lyph = this.entitiesByID[node.id];
                if (lyph) {
                    delete lyph.levelIn;
                }
                this.saveStep("Remove level " + node.id + " from " + parent.id);
            }
            this.prepareChainLyphs();
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
        if (this.selectedChain) {
            if (prop === $Field.id) {
                //NK TODO Update references to chains??
                this.entitiesByID[value] = this.entitiesByID[oldValue];
                delete this.entitiesByID[oldValue];
                if (this.selectedChain._id) {
                    delete this.selectedChain._id;
                }
            }
            if (prop === $Field.id) {
                this.prepareChainList();
            } else {
                this.selectedChain[prop] = value;
            }
            this.saveStep(`Update property ${prop} of chain ` + this.selectedChain.id);
        }
    }

    showMessage(message) {
        this._snackBar.open(message, "OK", this._snackBarConfig);
    }

    saveChanges() {
        this.clearHelpers();
        this.onChangesSave.emit(this._model);
    }

    clearHelpers() {
        this.entitiesByID::values().forEach(obj => {
            const added = ['_class', '_generated'];
            added.forEach(prop => {
                delete obj[prop];
            });
        });
    }

    showDiff() {
        const dialogRef = this.dialog.open(DiffDialog, {
            width: '90%',
            data: {'oldContent': this._modelText, 'newContent': this.currentText}
        });
    }

    get currentText() {
        if (this.currentStep > 0 && this.currentStep < this.steps.length) {
            const added = ['_class', '_generated', '_subtypes', '_supertype', '_node', '_id'];
            let currentModel = this._model::cloneDeep();
            return JSON.stringify(currentModel,
                function (key, val) {
                    if (!added.includes(key)) {
                        return val;
                    }
                },
                4);
        }
        return this._modelText;
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

    /**
     * Save operation in history
     * @param action
     */
    saveStep(action) {
        if (this.currentStep > this.steps.length - 1) {
            this.currentStep = this.steps.length - 1;
        }
        if (this.currentStep !== this.steps.length - 1) {
            this.steps.length = this.currentStep + 1;
        }
        //NK test if nested properties are removed
        let snapshot = this._model::cloneDeep();
        this.steps.push({action: action, snapshot: snapshot, selected: this.selectedChain?.id});
        this.currentStep = this.steps.length - 1;
    }

    /**
     * Restore history state
     */
    restoreState() {
        let restoredStep = this.steps[this.currentStep];
        this._model = restoredStep.snapshot;
        this.prepareChainList();
        let newSelected = this.entitiesByID[restoredStep.selected];
        this.updateView(newSelected);
    }

    createLateral(lateralPrefix) {
        if (this.selectedChain) {
            const prefixID = lateralPrefix || "lateral";
            const prefixName = prefixID.charAt(0).toUpperCase() + prefixID.slice(1);

            function getResourceCopy(r) {
                let copy = r::cloneDeep();
                copy.id = `${prefixID}-${r.id}`;
                copy.name = `${prefixName}-${r.name}`;
                return copy;
            }

            const isLyphInstance = id => {
                if (id.includes(":")) return false;
                const lyph = this.entitiesByID[id];
                return (lyph && !lyph._cloning && lyph._class === "Lyph" && !lyph.isTemplate);
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
                    lyphCopy.layers = lyph.layers.map(id => isLyphInstance(id) ? `${prefixID}-${id}` : id);
                    lyph.layers.forEach(id => copyLyph(id));
                }
                //Internal lyphs
                if (lyph.internalLyphs) {
                    lyphCopy.internalLyphs = lyph.internalLyphs.map(id => isLyphInstance(id) ? `${prefixID}-${id}` : id);
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
                        linkCopy.conveyingLyph = `${prefixID}-${link.conveyingLyph}`;
                        copyLyph(link.conveyingLyph);
                    }
                    ["source", "target"].forEach(prop => {
                        if (link[prop]) {
                            linkCopy[prop] = `${prefixID}-${link[prop]}`;
                            copyNode(link[prop]);
                        }
                    });
                    this._model.links.push(linkCopy);
                }
            }

            const chain = getResourceCopy(this.selectedChain);
            if (this.selectedChain.lyphs) {
                chain.lyphs = this.selectedChain.lyphs.map(id => isLyphInstance(id)? `${prefixID}-${id}`: id);
                this.selectedChain.lyphs.forEach(id => copyLyph(id));

            } else {
                if (this.selectedChain.levels) {
                    // Levels are links that connect to a chain - need to clone link definitions
                    chain.levels = this.selectedChain.levels.map(id => `${prefixID}-${id}`);
                    this.selectedChain.levels.forEach(id => copyLink(id));
                }
            }
            // Make lateral chain disconnected by default
            delete chain.root;
            delete chain.leaf;

            chain.lateralOf = this.selectedChain.id;
            this.selectedChain.laterals = this.selectedChain.laterals || [];
            this.selectedChain.laterals.push(chain.id);
            this.createChain(chain);
        }
    }
}

@NgModule({
    imports: [CommonModule, MatMenuModule, ResourceDeclarationModule, SearchAddBarModule, MatButtonModule,
        MatDividerModule, ResourceListViewModule, ChainDeclarationModule, CheckboxFilterModule, MatListModule,
        LyphTreeViewModule],
    declarations: [ChainEditorComponent],
    exports: [ChainEditorComponent]
})
export class ChainEditorModule {
}

