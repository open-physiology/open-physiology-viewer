import {cloneDeep, values} from "lodash-bound";
import {MatSnackBar, MatSnackBarConfig} from "@angular/material/snack-bar";
import {MatDialog} from "@angular/material/dialog";
import {EventEmitter, Output} from "@angular/core";
import {DiffDialog} from "../dialogs/diffDialog";
import {$SchemaClass} from "../../model";

export class ResourceEditor {
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
