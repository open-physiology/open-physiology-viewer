import {NgModule, Component, Input, Output, EventEmitter, ViewChild, ElementRef} from '@angular/core';
import {MatMenuModule, MatMenuTrigger} from "@angular/material/menu";
import {CommonModule} from "@angular/common";
import {ResourceDeclarationModule} from "./gui/resourceDeclarationEditor";
import {SearchAddBarModule} from "./gui/searchAddBar";
import {MatButtonModule} from '@angular/material/button';
import {MatDividerModule} from "@angular/material/divider";
import {LyphTreeViewModule} from "./gui/lyphTreeView";
import {cloneDeep, omit, sortBy, values} from 'lodash-bound';
import {$Field, $SchemaClass} from "../model";
import {LyphDeclarationModule} from "./gui/lyphDeclarationEditor";
import FileSaver from 'file-saver';
import {MatSnackBar, MatSnackBarConfig} from '@angular/material/snack-bar';

/**
 * @class
 * @classdesc This is a lyph, material, or reference to undefined lyph to display in lyph tree viewer
 * @property id
 * @property label
 * @property type
 * @property parent
 * @property length
 * @property children
 * @property isTemplate
 * @property index
 * @property resource
 * @property icons
 * @property layerIndex
 * @property maxLayerIndex
 * @property inherited
 */
export class Node {
    constructor(id, label, type, parent, length, children, isTemplate, index, resource) {
        this.id = id;
        this.label = label;
        this.parent = parent;
        this.length = length;
        this.children = children;
        this.isTemplate = isTemplate;
        this.type = type;
        this.index = index;
        this.resource = resource;
        this.icons = [];
        this.canMoveUp = index > 0 && this.length > 1;
        this.canMoveDown = index < this.length - 1;
        if (this.resource?.hasOwnProperty($Field.internalInLayer)){
            this.layerIndex = this.resource.internalInLayer;
        }
        if (this.parent?.internalLyphs && this.parent?.internalLyphsInLayers){
            if (this.index < this.parent?.internalLyphsInLayers.length) {
                this.layerIndex = this.parent.internalLyphsInLayers[this.index];
            }
        }
    }
}

@Component({
    selector: 'lyphEditor',
    template: `
         <section #lyphEditorD3 id="lyphEditorD3" class="w3-row">
             <section #lyphView id="lyphView" [class.w3-threequarter]="showPanel">
                    <section class="w3-col">
                        <lyphTreeView
                            title="Lyphs"
                            [treeData]="lyphTree"
                            (onNodeClick)="selectLyph($event)"
                            (onChange)="processChange($event)"
                        >                
                        </lyphTreeView>
                    </section>
                    <section class="w3-col">
                        <lyphTreeView *ngIf="selectedLyph"
                            title="Layers"                              
                            ordered="true"          
                            active="activeTree === selectedLyphLayers"           
                            [treeData]="selectedLyphLayers"
                            (onNodeClick)="selectLayerToEdit($event)"   
                            (onChange)="processLayerChange($event)"
                         >                
                        </lyphTreeView> 
                    </section>
                    <section class="w3-col">
                        <lyphTreeView *ngIf="selectedLyph" 
                            title="Internal lyphs"
                            active="activeTree === selectedLyphInternalLyphs"           
                            [treeData]="selectedLyphInternalLyphs"
                            [showLayerIndex]="true"
                            (onNodeClick)="selectInternalToEdit($event)"       
                            (onChange)="processInternalChange($event)"
                         >                
                        </lyphTreeView>
                    </section>
                <section class="w3-padding-right" style="position:relative;">
                    <section class="w3-bar-block w3-right vertical-toolbar" style="position:absolute; right:0">
                        <button class="w3-bar-item w3-hover-light-grey"
                                (click)="createLyph()" title="New material">
                            <i class="fa fa-file-pen"> </i>
                        </button>
                        <button class="w3-bar-item w3-hover-light-grey"
                                (click)="preview()" title="Preview">
                            <i class="fa fa-magnifying-glass"> </i>
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
                            <i class="fa fa-check"> </i>
                        </button>
                    </section>
                </section>
             </section>                
             <section *ngIf="showPanel" class="w3-quarter">    
                <searchAddBar 
                        [searchOptions]="_searchOptions"
                        [selected]="lyphToLink"
                        (selectedItemChange)="selectBySearch($event)"
                        (addSelectedItem)="addLyph($event)"
                >
                </searchAddBar>                          
                <lyphDeclaration
                    [lyph]="selectedLyphToEdit"   
                    [regionNames]="regionNames"
                    (onValueChange)="updateProperty($event)"
                >                
                </lyphDeclaration>
             </section>
         </section>
    `,
    styles: [`
        #lyphView {
          display: flex;
          justify-content: space-between;
        }
   `]
})
/**
 * @class
 * @property entitiesByID
 */
export class LyphEditorComponent {
    _model;
    _searchOptions;
    _snackBar;
    _snackBarConfig = new MatSnackBarConfig();
    steps = [];

    showPanel = true;
    entitiesByID = {};
    lyphTree = [];
    selectedLyphInternalLyphs = [];
    selectedLyphLayers = [];

    constructor(snackBar: MatSnackBar) {
        this._snackBar = snackBar;
        this._snackBarConfig.panelClass = ['w3-panel', 'w3-orange'];
    }

    @Output() onChangesSave = new EventEmitter();

    @Input('model') set value(newModel){
        this._model = newModel::cloneDeep();
        this.steps = [];
        this.lyphTree = this.prepareLyphTree();
        this.updateSearchOptions();
        this.updateRegionOptions();
    };

    selectBySearch(nodeLabel) {
        let nodeID = nodeLabel.substring(
            nodeLabel.indexOf("(") + 1,
            nodeLabel.lastIndexOf(")")
        );
        if (this.entitiesByID[nodeID]) {
            this.lyphToLink = nodeID;
        }
    }

    defineNewLyph() {
        let newLyphCounter = 1;
        let newLyphID = "newLyph" + newLyphCounter;
        while (this.entitiesByID[newLyphID]) {
            newLyphID = "newLyph" + ++newLyphCounter;
        }
        let newMat = {
            [$Field.id]: newLyphID,
            [$Field.name]: "New lyph " + newLyphCounter,
            "_class": $SchemaClass.Lyph
        }
        this._model.lyphs.push(newMat);
        this.entitiesByID[newMat.id] = newMat;
        return newMat;
    }

    /**
     * Create a new lyph
      */
    createLyph(){
        this.selectedNode = this.defineNewLyph();
        this.updateSearchOptions();
        this.saveStep("Create new lyph " + this.selectedNode.id);
    }

    /**
     * Add selected lyph as layer or internal lyph
     * @param lyphID
     */
    addLyph(lyphID) {
        let lyph = this.entitiesByID[lyphID];
        if (lyph) {
            if (this.selectedLyphToEdit) {
                if (this.activeTree === this.selectedLyphLayers) {
                    if (this.selectedLyphToEdit._supertype) {
                        let message = "Cannot add layer to an inherited lyph: remove `supertype` property first!";
                        this._snackBar.open(message, "OK", this._snackBarConfig);
                    } else {
                        this.selectedLyphToEdit.layers = this.selectedLyphToEdit.layers || [];
                        this.selectedLyphToEdit.layers.push(lyph);
                        this.prepareSelectedLyphLayers();
                    }
                } else {
                    if (this.activeTree === this.selectedLyphInternalLyphs) {
                        if (!this.selectedLyphInternalLyphs.internalLyphs.find(e => e.id === lyphID)) {
                            this.selectedLyphToEdit.internalLyphs.push(lyph);
                            this.prepareSelectedLyphInternalLyphs();
                        }
                    }
                }
            } else {
                let message = "Cannot add lyph: the parent lyph is not selected!";
                this._snackBar.open(message, "OK", this._snackBarConfig);
            }
        } else {
            let message = "Unknown lyph!";
            this._snackBar.open(message, "OK", this._snackBarConfig);
        }
    }

    /**
     * Create a hierarchy of defined lyphs
     * @returns {({}|Node)[]}
     */
    prepareLyphTree(){
        this.entitiesByID = {};
        (this._model.lyphs||[]).forEach(lyph => {
            if (lyph.id){
                lyph._subtypes = [];
                lyph._class = $SchemaClass.Lyph;
                this.entitiesByID[lyph.id] = lyph;
            }
        });
        (this._model.materials||[]).forEach(material => {
            if (material.id){
                material._class = $SchemaClass.Material;
                this.entitiesByID[material.id] = material;
            }
        });

        (this._model.lyphs||[]).forEach(lyph => {
            if (lyph.supertype && this.entitiesByID[lyph.supertype]){
                this.entitiesByID[lyph.supertype]._subtypes.push(lyph);
                lyph._supertype = lyph.supertype;
            }
            (lyph.subtypes||[]).forEach(subtype => {
                lyph._subtypes.push(this.entitiesByID[subtype]);
                this.entitiesByID[subtype]._supertype = lyph;
            });
        });

        const mapToNodes = (lyphOrID, parent, idx) => {
            if (!lyphOrID) return {};
            let lyph = lyphOrID.id? lyphOrID: this.entitiesByID[lyphOrID];
            let length = (parent?._subtypes||[]).length || 0;
            let res = new Node(lyph.id, lyph.name,"Lyph", parent, length, [], lyph.isTemplate, idx, lyph);
            if (lyph._subtypes) {
                res.children = lyph._subtypes.map((x, i) => mapToNodes(x, lyph, i));
            }
            //Icons
            if (res.resource?.layers && !res.icons.includes("fa fa-bars")){
                res.icons.push("fa fa-bars");
            }
            if (res.resource?.internalLyphs && !res.icons.includes("fa fa-building-o")){
                res.icons.push("fa fa-building-o");
            }
            return res;
        };
        let treeData = (this._model.lyphs||[]).map(e => mapToNodes(e));
        treeData = treeData::sortBy([$Field.isTemplate, $Field.id]);
        return treeData;
    }

    /**
     * Prepare a list of lyph id-name pairs for search box
     */
    updateSearchOptions() {
        this._searchOptions = (this._model.materials || []).map(e => e.name + ' (' + e.id + ')');
        this._searchOptions = this._searchOptions.concat((this._model.lyphs || []).map(e => e.name + ' (' + e.id + ')'));
        this._searchOptions.sort();
    }

    /**
     * Prepare a list of scaffold region id-name pairs for search box
     */
    updateRegionOptions(){
        this.regionNames = [];
        (this._model?.scaffolds||[]).forEach(scaffold => {
            (scaffold.regions||[]).forEach(r => {
                this.regionNames.push( (r.name || '?' ) + ' (' + r.id + ')');
            });
        });
    }

    /**
     * Select an active lyph to see and edit
     * @param node
     */
    selectLyph(node){
        this.selectedLyph = this.entitiesByID[node.id];
        this.prepareSelectedLyphLayers();
        this.prepareSelectedLyphInternalLyphs()
    }

    /**
     * Select a layer of the active lyph
     * @param node
     */
    selectLayerToEdit(node){
        if (node?.id) {
            this.selectedLyphToEdit = this.entitiesByID[node.id];
            this.activeTree = this.selectedLyphLayers;
        }
    }

    /**
     * Select an internal lyph of the active lyph
     * @param node
     */
    selectInternalToEdit(node){
        if (node?.id) {
            this.selectedLyphToEdit = this.entitiesByID[node.id];
            this.activeTree = this.selectedLyphInternalLyphs;
        }
    }

    /**
     * A helper method to prepare a tree hierarchy
     * @param prop - hierarchical relationship, i.e., 'layers' or 'internalLyphs'
     * @param includeInherited - a flag indicating whether to include resources inherited from the supertype
     * @returns {({}|*)[]}
     * @private
     */
    _prepareSelectedLyphTree(prop, includeInherited= false){
        const mapToNodes = (lyphOrID, parent, idx) => {
            if (!lyphOrID) return {};
            let res;
            let lyph = lyphOrID.id? lyphOrID: this.entitiesByID[lyphOrID];
            if (lyph) {
                let length = parent? (parent[prop]||[]).length: 1
                res = new Node(lyph.id, lyph.name, lyph._class, parent, length, [], lyph.isTemplate, idx, lyph);
                if (lyph[prop]) {
                    res.children = lyph[prop].map((e, i) => mapToNodes(e, lyph, i));
                }
                if (includeInherited && lyph.supertype){
                    let supertype = mapToNodes(lyph.supertype);
                    supertype.children.forEach(c => {
                        c.inherited = true;
                        if (!c.icons.includes("fa fa-lock")) {
                            c.icons.push("fa fa-lock");
                        }
                    });
                    if (supertype.children) {
                        res.children = res.children.concat(supertype.children);
                    }
                }
            } else {
                res = new Node(lyphOrID, "Generated " + lyphOrID, "Undefined", undefined, 0, [], false, idx,undefined);
            }
            return res;
        };
        return [mapToNodes(this.selectedLyph)];
    }

    /** A helper method to cap the layer index for internal lyph assignment */
     _setMaxLayerIndex(){
        if (this.selectedLyphInternalLyphs?.length > 0 && this.selectedLyphLayers?.length > 0) {
            (this.selectedLyphInternalLyphs[0].children || []).forEach(c => {
                c.maxLayerIndex = this.selectedLyphLayers[0].children.length - 1;
            });
        }
    }

     /* *
     * Prepare a hierarchy of inherited and own layers
     */
    prepareSelectedLyphLayers(){
        this.selectedLyphLayers = this._prepareSelectedLyphTree($Field.layers, true);
    }

    /**
     * Prepare a hierarchy of inherited and own internal lyphs
     */
    prepareSelectedLyphInternalLyphs(){
        this.selectedLyphInternalLyphs = this._prepareSelectedLyphTree($Field.internalLyphs, true);
        this._setMaxLayerIndex();
    }

    /**
     * Update selected lyph property
     * @param prop
     * @param value
     */
    updateProperty({prop, value}){
        if (this.selectedLyphToEdit){
            this.selectedLyphToEdit[prop] = value;
        }
    }

    /**
     * Process menu operation in the main lyph view
     * @param operation - chosen operation
     * @param node - lyph subject
     */
    processChange({operation, node}){
        switch (operation) {
            case 'insert':
                break;
            case 'delete':
                break;
        }
    }

    /**
     * Process menu operation in the internal lyphs view
     * @param operation - chosen operation
     * @param node - lyph subject
     */
    processInternalChange({operation, node}){
        switch (operation) {
            case 'insert':
                break;
            case 'delete':
                break;
        }
    }

    /**
     * Process menu operation in the layers view
     * @param operation - chosen operation
     * @param node - lyph subject
     * @param index - lyph position
     */
    processLayerChange({operation, node, index}){
        switch (operation) {
            case 'insert':
                this.insertLayer(node, index);
                break;
            case 'delete':
                this.deleteLayer(node, index);
                break;
            case 'up': this.moveLayerUp(node, index);
                break;
            case 'down': this.moveLayerDown(node, index);
                break;
        }
    }

    insertLayer(node, index){
        let lyph = this.defineNewLyph();
        if (this.selectedLyphToEdit._supertype) {
            let message = "Cannot add layer to an inherited lyph: remove `supertype` property first!";
            this._snackBar.open(message, "OK", this._snackBarConfig);
        } else {
            this.selectedLyphToEdit.layers = this.selectedLyphToEdit.layers || [];
            this.selectedLyphToEdit.layers.push(lyph);
            this.prepareSelectedLyphLayers();
        }
    }

    deleteLayer(node, index){
        //NK TODO
    }

    moveLayerUp(node, index){
        if (this.selectedLyphLayers) {
            let parent = this.entitiesByID[this.selectedLyphLayers[0].id];
            let tmp = parent.layers[index - 1];
            parent.layers[index - 1] = parent.layers[index];
            parent.layers[index] = tmp;
            this.prepareSelectedLyphLayers();
        }
    }

    moveLayerDown(node, index){
        if (this.selectedLyphLayers) {
            let parent = this.entitiesByID[this.selectedLyphLayers[0].id];
            let tmp = parent.layers[index + 1];
            parent.layers[index + 1] = parent.layers[index];
            parent.layers[index] = tmp;
            this.prepareSelectedLyphLayers();
        }
    }

    /** History **/

    cleanHelpers(){
        this.entitiesByID::values().forEach(obj => {
            //Clean up all helper mods
            delete obj._class;
            delete obj._subtypes;
            delete obj._supertype;
        });
    }

    saveChanges() {
        this.cleanHelpers();
        this.onChangesSave.emit(this._model);
    }

    preview() {
        let result = JSON.stringify(this._model, null, 4);
        const blob = new Blob([result], {type: 'text/plain'});
        FileSaver.saveAs(blob, this._model.id + '-material-editor.json');
    }

    /**
     * Save operation in history
     * @param action
     */
    saveStep(action) {
        if (this.currentStep > this.steps.length - 1){
            this.currentStep = this.steps.length - 1;
        }
        if (this.currentStep !== this.steps.length - 1){
            this.steps.length = this.currentStep + 1;
        }
        let snapshot = this._model::omit(['_supertype', '_subtypes'])::cloneDeep();
        this.steps.push({action: action, snapshot: snapshot});
        this.currentStep = this.steps.length - 1;
    }

    /**
     * Undo the operation
     */
    undo() {
        if (this.currentStep > 0 && this.currentStep < this.steps.length) {
            this.currentStep -= 1;
            this._model = this.steps[this.currentStep].snapshot;
            //TODO update
        }
    }

    /**
     * Redo the operation
     */
    redo() {
        if (this.currentStep >= 0 && this.currentStep < this.steps.length - 1) {
            this.currentStep += 1;
            this._model = this.steps[this.currentStep].snapshot;
            //TODO update
         }
    }
}

@NgModule({
    imports: [CommonModule, MatMenuModule, ResourceDeclarationModule, SearchAddBarModule, MatButtonModule,
        MatDividerModule, LyphTreeViewModule, LyphDeclarationModule],
    declarations: [LyphEditorComponent],
    exports: [LyphEditorComponent]
})
export class LyphEditorModule {
}

