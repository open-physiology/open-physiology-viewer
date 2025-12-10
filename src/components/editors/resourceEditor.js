import {cloneDeep, values} from "lodash-bound";
import {MatSnackBar, MatSnackBarConfig} from "@angular/material/snack-bar";
import {MatDialog} from "@angular/material/dialog";
import {EventEmitter, Output} from "@angular/core";
import {DiffDialog} from "../dialogs/diffDialog";
import {$Field, $SchemaClass} from "../../model";
import {defineNewResource} from "../../model/utils";
import {COLORS} from '../utils/colors.js'

export class ResourceEditor {
    COLORS = COLORS;
    _helperFields = ['_class', '_generated', '_subtypes', '_supertype', '_node', '_id'];
    _model;
    _snackBar;
    _snackBarWarningConfig = new MatSnackBarConfig();
    _selectedNode;
    _modelText;

    searchOptions;
    steps = [];
    currentStep = 0;
    showPanel = true;
    entitiesByID = {};

    @Output() onChangesSave = new EventEmitter();
    @Output() onSwitchEditor = new EventEmitter();

    constructor(snackBar: MatSnackBar, dialog: MatDialog) {
        this.dialog = dialog;
        this._snackBar = snackBar;
        this._snackBarWarningConfig = {
            panelClass: ['w3-panel', 'w3-orange'],
            duration: 2000
        };
    }

    collectMaterials(){
        let created = [];
        [$Field.materials, $Field.lyphs].forEach(prop => {
            (this._model[prop] || []).forEach(m => {
                if (m.id) {
                    m._inMaterials = [];
                    this.entitiesByID[m.id] = this.entitiesByID[m.id] || m;
                }
            });
        });
        [$Field.materials, $Field.lyphs].forEach(prop => {
            (this._model[prop] || []).forEach(m => {
                (m.materials || []).forEach(childID => {
                    if (!this.entitiesByID[childID]) {
                        this.entitiesByID[childID] = {
                            [$Field.id]: childID,
                            "_generated": true,
                            "_inMaterials": [],
                        };
                        created.push(this.entitiesByID[childID]);
                    }
                });
                (m.materials || []).forEach(childID => {
                    if (!this.entitiesByID[childID]._inMaterials.find(x => x.id === m.id)) {
                        this.entitiesByID[childID]._inMaterials.push(m);
                    }
                });
            });
        });
        return created;
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
        return missing;
    }

    /**
     * Create a new lyph definition
     * @returns {{[p: string]: *, _class: *}}
     */
    defineNewLyph(lyphDef) {
        let newLyph = lyphDef || defineNewResource({
            [$Field.id]: "_newLyph",
            [$Field.name]: "New lyph",
            "_class":  $SchemaClass.Lyph
        }, this.entitiesByID);
        this._model.lyphs = this._model.lyphs || [];
        this._model.lyphs.push(newLyph);
        this.entitiesByID[newLyph.id] = newLyph;
        return newLyph;
    }

    showWarning(message) {
        this._snackBar.open(message, "OK", this._snackBarWarningConfig);
    }

    selectBySearch(nodeLabel) {
        if (!nodeLabel) {
            return null;
        } else {
            let nodeID = nodeLabel.substring(
                nodeLabel.lastIndexOf("(") + 1,
                nodeLabel.lastIndexOf(")")
            );
            return this.entitiesByID[nodeID];
        }
    }

    clearHelpers() {
        this.entitiesByID::values().forEach(obj => {
            //Clean up all helper mods
            this._helperFields.forEach(prop => {
                delete obj[prop];
            });
        });
    }

    get currentText() {
        if (this.currentStep > 0 && this.currentStep < this.steps.length) {
            let currentModel = this._model::cloneDeep();
            return JSON.stringify(currentModel,
                (key, val) => {
                    if (!this._helperFields.includes(key)) {
                        return val;
                    }
                },
                4);
        }
        return this._modelText;
    }

    showDiff() {
        const dialogRef = this.dialog.open(DiffDialog, {
            width: '90%',
            data: {'oldContent': this._modelText, 'newContent': this.currentText}
        });
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
            this._model = this.steps[this.currentStep].snapshot;
            this.restoreState();
        }
    }

    /**
     * Redo the operation
     */
    redo() {
        if (this.currentStep >= 0 && this.currentStep < this.steps.length - 1) {
            this.currentStep += 1;
            this._model = this.steps[this.currentStep].snapshot;
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
        this.steps.push(this.getCurrentState(action));
        this.currentStep = this.steps.length - 1;
    }

    getCurrentState(action) {
        let snapshot = this._model::cloneDeep();
        return {action: action, snapshot: snapshot};
    }

    restoreState() {
    }

    saveChanges() {
        this.clearHelpers();
        this.onChangesSave.emit({model: this._model, selected: this._selectedNode});
    }

    switchEditor(node) {
        if (!node) return;
        switch (node.class) {
            case $SchemaClass.Material:
                this.onSwitchEditor.emit({editor: 'material', node: node.id});
                break;
            case $SchemaClass.Lyph:
                this.onSwitchEditor.emit({editor: 'lyph', node: node.id});
                break;
            case "Template":
                this.onSwitchEditor.emit({editor: 'lyph', node: node.id});
                break;
            case $SchemaClass.Chain:
                this.onSwitchEditor.emit({editor: 'chain', node: node.id});
                break;
            case $SchemaClass.Coalescence:
                this.onSwitchEditor.emit({editor: 'coalescence', node: node.id});
                break;
        }
    }
}
