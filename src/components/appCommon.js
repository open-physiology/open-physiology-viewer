import {
    $Field,
    $SchemaClass,
    generateFromJSON,
    getGenID,
    getGenName,
    isScaffold, isSnapshot, isGraph,
    joinModels,
    jsonToExcel,
    loadModel, processImports,
    schema
} from "../model";
import {removeDisconnectedObjects} from "../view/render/autoLayout";
import {MatDialog} from "@angular/material/dialog";
import {MatSnackBar, MatSnackBarConfig} from "@angular/material/snack-bar";
import {HttpClient} from "@angular/common/http";
import {layouts} from "../layouts/layouts";
import {findResourceByID, mergeResources} from "../model/utils";
import {clone, cloneDeep, keys, merge, pick, isArray, omit} from "lodash-bound";
import {$LogMsg, logger} from "../model/logger";
import {addJSONLDTypeDef, getJSONLDContext} from "../model/utilsJSONLD";
import {environment} from "../version/environment";
import {ElementRef, ViewChild} from "@angular/core";
import {modelClasses,} from '../model/index';
import FileSaver from 'file-saver';
import {ImportDialog} from "./dialogs/importDialog";
import {CommitManager} from "../api/commitManager";

const fileExtensionRe = /(?:\.([^.]+))?$/;

export class AppCommon {
    modelClasses = modelClasses;
    showRepoPanel = false;
    _graphData;
    /**
     * @property layout
     * @property showLabels
     * @property labels
     * @type {{}}
     * @private
     */
    _config = {};
    _model = {};
    _modelName;
    _dialog;
    _editor;
    _flattenGroups;
    _counter = 1;
    _scaffoldUpdated = false;
    _selectedResources = {};

    _snapshot;
    _snapshotCounter = 1;
    _unsavedState;

    _snackBar;
    _snackBarConfig = new MatSnackBarConfig();
    _commitManager;

    version = environment.version;
    @ViewChild('webGLScene') _webGLScene: ElementRef;

    constructor(dialog: MatDialog, snackBar: MatSnackBar, http: HttpClient) {
        this._dialog = dialog;
        this._flattenGroups = false;

        this._snackBar = snackBar;
        this._snackBarConfig = {
            panelClass: ['w3-panel', 'w3-green'],
            duration: 2000
        };
        this.http = http;
        this._commitManager = new CommitManager(this);
    }

    join(newModel) {
        if (this._model.id === newModel.id) {
            throw new Error("Cannot join models with the same identifiers: " + this._model.id);
        }
        if (isScaffold(this._model) !== isScaffold(newModel)) {
            this.model = removeDisconnectedObjects(this._model, newModel);
            this.applyScaffold(this._model, newModel);
        } else {
            let jointModel = joinModels(this._model, newModel, this._flattenGroups);
            //NK config property is deprecated, merging with it was a bug caused by Master+Metacell conflict resolution mistake
            jointModel::merge({[$Field.created]: this.currentDate, [$Field.lastUpdated]: this.currentDate});
            this.model = jointModel;
            this._flattenGroups = true;
        }
    }

    applyScaffold(modelA, modelB) {
        const applyScaffold = (model, scaffold) => {
            model.scaffolds = model.scaffolds || [];
            if (!model.scaffolds.find(s => s.id === scaffold.id)) {
                model.scaffolds.push(scaffold);
            } else {
                throw new Error("Scaffold with such identifier is already attached to the model!");
            }
            this.model = model;
        };

        if (isScaffold(modelA)) {
            applyScaffold(modelB, modelA);
        } else {
            applyScaffold(modelA, modelB);
        }
    }

    merge(newModel) {
        if (isScaffold(this._model) !== isScaffold(newModel)) {
            this.applyScaffold(this._model, newModel);
        } else {
            this.model = {
                [$Field.created]: this.currentDate,
                [$Field.lastUpdated]: this.currentDate
            }::merge(this._model::mergeWith(newModel, mergeResources));
        }
    }

    importExternal() {
        if (this._model.imports && this._model.imports.length > 0) {
            //Model contains external inputs
            const dialogRef = this._dialog.open(ImportDialog, {
                width: '75%', data: {
                    imports: this._model.imports || []
                }
            });
            dialogRef.afterClosed().subscribe(result => {
                if (result !== undefined && result::isArray()) {
                    let scaffolds = result.filter(m => isScaffold(m));
                    let groups = result.filter(m => isGraph(m));
                    let snapshots = result.filter(m => isSnapshot(m));
                    logger.clear();
                    this._model = this._model::clone();
                    processImports(this._model, result);
                    if (groups.length > 0 || scaffolds.length > 0) {
                        this.model = this._model;
                    }
                    if (snapshots.length > 0) {
                        this.loadSnapshot(snapshots[0]);
                        if (snapshots.length > 1) {
                            logger.warn($LogMsg.SNAPSHOT_IMPORT_MULTI);
                        }
                    }
                }
            });
        }
    }

    save(format) {
        switch (format) {
            case "excel":
                jsonToExcel(this._model);
                break;

            case "json":
                if (this._scaffoldUpdated) {
                    this.saveScaffoldUpdates();
                    this._scaffoldUpdated = false;
                }
                const result = JSON.stringify(this._model, null, 4);
                const blob = new Blob([result], {type: "text/plain"});
                FileSaver.saveAs(blob, `${this._model.id}-model.json`);
                break;

            case "json-ld":

                const baseURL = "https://apinatomy.org/uris/";
                const baseURLModels = baseURL + "models/";
                const defBaseURL = baseURL + "defs/";
                let jsonLDModel = getJSONLDContext(this._model, baseURLModels);

                (this._model.materials || []).forEach(obj => jsonLDModel["@graph"].push(addJSONLDTypeDef(obj, $SchemaClass.Material, this._model, baseURLModels)));
                (this._model.lyphs || []).forEach(obj => jsonLDModel["@graph"].push(addJSONLDTypeDef(obj, $SchemaClass.Lyph, this._model, baseURLModels)));
                (this._model.ontologyTerms || []).forEach(obj => jsonLDModel["@graph"].push(addJSONLDTypeDef(obj, $SchemaClass.OntologyTerm, this._model, baseURLModels)));

                let result2 = JSON.stringify(jsonLDModel, null, 2);
                //replace
                result2 = result2.replaceAll(baseURL, defBaseURL);
                const blob2 = new Blob([result2], {type: 'application/ld+json'});
                FileSaver.saveAs(blob2, `${this._model.id}-model-ld.jsonld`);
                break;

            default:
                this.showErrorMessage("Unknown export format!");
                break;
        }
    }


    commit() {
        this._commitManager.commit();
    }

    showDiffAndCommit(client, oldContentText, fileSHA, buildModelForCommit, newContentInitial, filePath, defaultMessage) {
        this._commitManager.showDiffAndCommit(client, oldContentText, fileSHA, buildModelForCommit, newContentInitial, filePath, defaultMessage);
    }

    showMessage(message) {
        this._snackBar.open(message, "OK", this._snackBarConfig);
    }

    showErrorMessage(message) {
        this._snackBar.open(message, "Error", {
            panelClass: ['w3-panel', 'w3-red'],
            duration: 5000
        });
    }

    showWarningMessage(message) {
        this._snackBar.open(message, "Warning", {
            panelClass: ['w3-panel', 'w3-orange'],
            duration: 2000
        });
    }

    loadFromRepo({fileName, fileContent}) {
        let [name, extension] = fileExtensionRe.exec(fileName);
        extension = extension.toLowerCase();
        this.model = loadModel(fileContent, name, extension);
        this.showRepoPanel = false;
    }

    applyChanges() {
        logger.clear();
        this._unsavedState = this.getCurrentState();
        //This is to reset model to triger update
        this._graphData = generateFromJSON({"id": "Empty"});
        // if (isScaffold(this._model)) {
        //     this._model.scaleFactor = 1; // Do not scale scaffolds after editing
        // }
        this.model = this._model::merge({[$Field.lastUpdated]: this.currentDate});
    }

    assignStratification({wire, stratification, reversed, callback}){
        // Find definitions in the input model
        const inputStratification = (this._model.stratifications||[]).find(e => e.id === stratification.id);
        const inputWire = (this._model.wires||[]).find(e => e.id === wire.id);
        if (inputWire) {
            inputWire.reversed = reversed;
        }

        // Revise input model
        const inputStratifiedRegion = this.modelClasses.Stratification.createStratifiedRegion(
            this._model, inputStratification, inputWire);

        // Generate class instance for the generated model
        const stratifiedRegion = this.modelClasses.StratifiedRegion.fromJSON(
            inputStratifiedRegion, this.modelClasses, this._graphData.entitiesByID, this._graphData.namespace
        );
        // Create visual objects for the new stratified region
        callback(stratifiedRegion);

        // Save assignment for the current model
        inputWire.stratification = stratification.id;

        wire.stratification = stratification;
        wire.stratifiedRegion = stratifiedRegion;

        this._graphData.stratifiedRegions = this._graphData.stratifiedRegions || [];
        this._graphData.stratifiedRegions.push(stratifiedRegion);

        if (this._editor) {
            this._editor.set(this._model);
        }
    }

    deleteStratifiedRegion(stratifiedRegion){
        if (!stratifiedRegion) return;
        const wire = stratifiedRegion.axisWire;
        const inputWire = (this._model.wires||[]).find(e => e.id === (wire?.id || wire));
        if (inputWire) {
            delete inputWire.stratification;
            delete inputWire.stratifiedRegion;
        }

        const stratification = stratifiedRegion.supertype;
        if (stratification) {
            const wireID = (wire?.id || wire);
            const inputStratification = (this._model.stratifications || []).find(e => e.id === (stratification.id || stratification));
            if (inputStratification && inputStratification.axisWires) {
                inputStratification.axisWires = inputStratification.axisWires.filter(id => id !== wireID);
            }
            if (stratification.axisWires) {
                stratification.axisWires = stratification.axisWires.filter(id => id !== wireID);
                if (stratification.axisWires.length === 0) {
                    delete stratification.axisWires;
                }
            }
        }

        if (this._model.stratifiedRegions) {
            this._model.stratifiedRegions = this._model.stratifiedRegions.filter(e => e.id !== stratifiedRegion.id);
        }

        if (wire) {
            delete wire.stratification;
            delete wire.stratifiedRegion;
        }
        if (this._graphData.stratifiedRegions) {
            this._graphData.stratifiedRegions = this._graphData.stratifiedRegions.filter(e => e.id !== stratifiedRegion.id);
        }

        if (this._editor) {
            this._editor.set(this._model);
        }
    }

    deleteStratification(stratification) {
        if (!stratification) return;
        const inputStratification = (this._model.stratifications || []).find(e => e.id === (stratification.id || stratification));
        if (inputStratification) {
            this._model.stratifications = this._model.stratifications.filter(e => e.id !== (stratification.id || stratification));
        }
        if (this._graphData.stratifications) {
            this._graphData.stratifications = this._graphData.stratifications.filter(e => e.id !== (stratification.id || stratification));
        }
        (this._graphData.stratifiedRegions || []).filter(sr => sr.stratification === (stratification.id || stratification)).forEach(sr => this.deleteStratifiedRegion(sr));

        if (this._editor) {
            this._editor.set(this._model);
        }
    }

    onSelectedItemChange(item) {
    }

    onHighlightedItemChange(item) {
    }

    set model(model) {
        this.loading = true;
        setTimeout(() => {
            this._model = model;
            //Call dynamic layout
            this._modelName = this._model.name || this._model.id || "?";
            const scaffold = (this._model.scaffolds?.length > 0) ? this._model.scaffolds[0] : null;
            if (scaffold?.id in layouts) {
                this._graphData = layouts[scaffold.id](this._model, this.modelClasses, this._config);
            } else {
                this._graphData = generateFromJSON(this._model);
            }
            this._snapshot = undefined;
            if (this._model.snapshots?.length > 0) {
                this.loadSnapshot(model.snapshots[0]);
            }
            if (this._editor) {
                this._editor.set(this._model);
            }
            this.loading = false;
            if (this._unsavedState){
                this.loadState(this._unsavedState);
            }
        }, 0);
    }

    get graphData() {
        return this._graphData;
    }

    onScaffoldUpdated() {
        this._scaffoldUpdated = true;
    }

    saveScaffoldUpdates() {
        if (this._model && this._graphData) {
            if (isScaffold(this._model)) {
                this._graphData.update(this._model);
            } else {
                (this._graphData.scaffolds || []).forEach(scaffold => {
                    const srcScaffold = findResourceByID(this._model.scaffolds, scaffold.id);
                    if (!srcScaffold) {
                        throw new Error("Failed to find scaffold definition in input model: " + scaffold.id);
                    }
                    scaffold.update(srcScaffold);
                })
            }
        }
    }

    saveState() {
        if (!this._snapshot) {
            this.createSnapshot();
        }
        this._snapshot.addState(this.getCurrentState());
        this._unsavedState = null;
    }

    homeState() {
        if (this._unsavedState) {
            this.loadState(this._unsavedState);
            if (this._snapshot) {
                this._snapshot.activeIndex = -1;
            }
        }
    }

    getCurrentState() {
        const model_state = this._graphData.getCurrentState();
        let state_json = {
            [$Field.id]: getGenID(this._snapshot?.id, "state", (this._snapshot?.states || []).length),
            [$Field.camera]: {
                position: this._webGLScene.camera.position::pick(["x", "y", "z"]),
                up: this._webGLScene.camera.up::pick(["x", "y", "z"]),
                target: (this._webGLScene.controls && this._webGLScene.controls.target)
                    ? this._webGLScene.controls.target::pick(["x", "y", "z"]) : undefined
            },
            [$Field.layout]: this._config.layout::cloneDeep(),
            [$Field.showLabels]: this._config.showLabels::cloneDeep(),
            [$Field.labelContent]: this._config.labels::cloneDeep()
        }::merge(model_state);
        // Include open coalescence dialog node id if any
        if (this._webGLScene && this._webGLScene.openCoalescenceNodeId) {
            state_json.openCoalescenceNodeId = this._webGLScene.openCoalescenceNodeId;
        }
        // Include open material tree dialog lyph id if any
        if (this._webGLScene && this._webGLScene.openMaterialTreeLyphId) {
            state_json.openMaterialTreeLyphId = this._webGLScene.openMaterialTreeLyphId;
        }
        return this.modelClasses.State.fromJSON(state_json, this.modelClasses, this._graphData.entitiesByID);
    }

    restoreState() {
        this._unsavedState = this.getCurrentState();
        this.loadState(this._snapshot.active);
    }

    loadState(activeState) {
        if (activeState.visibleGroups) {
            this._graphData.showGroups(activeState.visibleGroups);
        }
        if (activeState.visibleComponents) {
            this._graphData.showGroups(activeState.visibleComponents);
        }
        if (activeState.camera) {
            this._webGLScene.resetCamera(activeState.camera.position, activeState.camera.up, activeState.camera.target);
        }
        this._config = {};
        if (activeState.layout) {
            this._config.layout = activeState.layout;
        }
        if (activeState.showLabels) {
            this._config.showLabels = activeState.showLabels;
        }
        if (activeState.labelContent) {
            this._config.labels = activeState.labelContent;
        }
        if (isScaffold(this._model)) {
            this._graphData.loadState(activeState);
        } else {
            (activeState.scaffolds || []).forEach(scaffold => {
                const modelScaffold = (this._graphData.scaffolds || []).find(s => s.id === scaffold.id);
                if (modelScaffold) {
                    modelScaffold.loadState(scaffold);
                } else {
                    this._graphData.logger.info($LogMsg.SNAPSHOT_NO_SCAFFOLD, scaffold.id);
                }
            });
        }
        this._webGLScene.updateGraph();
        // If the snapshot state contains an open coalescence dialog id, open it now; otherwise close any open coalescence dialog
        if (activeState.openCoalescenceNodeId && this._webGLScene?.openCoalescenceByResourceId) {
            this._webGLScene.openCoalescenceByResourceId(activeState.openCoalescenceNodeId);
        } else {
            if (this._webGLScene?.closeCoalescenceDialog) {
                this._webGLScene.closeCoalescenceDialog();
            }
        }
        // If the snapshot contains an open material tree dialog lyph id, open it; otherwise, close if open
        if (activeState.openMaterialTreeLyphId && this._webGLScene?.openMaterialTreeByLyphId) {
            this._webGLScene.openMaterialTreeByLyphId(activeState.openMaterialTreeLyphId);
        } else {
            if (this._webGLScene?.closeMaterialTreeDialog) {
                this._webGLScene.closeMaterialTreeDialog();
            }
        }
    }

    previousState() {
        if (this._snapshot) {
            this._snapshot.switchToPrev();
            this.restoreState();
        }
    }

    nextState() {
        if (this._snapshot) {
            this._snapshot.switchToNext();
            this.restoreState();
        }
    }

    removeState() {
        if (this._snapshot) {
            this._snapshot.removeActive();
            this.restoreState();
        }
    }

    createSnapshot() {
        this._snapshot = this.modelClasses.Snapshot.fromJSON({
            [$Field.id]: getGenID("snapshot", this._model.id, this._snapshotCounter),
            [$Field.name]: getGenName("Snapshot for", this._modelName, this._snapshotCounter),
            [$Field.model]: this._model.id
        }, this.modelClasses, this._graphData.entitiesByID);
        this._snapshotCounter += 1;
        const annotationProperties = schema.definitions.AnnotationSchema.properties::keys();
        this._snapshot.annotation = this._model::pick(annotationProperties);
    }

    loadSnapshot(value) {
        let newSnapshot = this.modelClasses.Snapshot.fromJSON(value, this.modelClasses, this._graphData.entitiesByID);
        const match = newSnapshot.validate(this._graphData);
        if (match < 0) {
            this.showWarningMessage("Snapshot is not applicable to the main model!");
        } else {
            if (match === 0) {
                this.showWarningMessage("Snapshot corresponds to a different version of the model!");
            }
        }
        this._snapshot = newSnapshot;
    }

    saveSnapshot() {
        if (this._snapshot) {
            let result = JSON.stringify(this._snapshot.toJSON(2, {
                [$Field.states]: 4
            }), null, 2);
            const blob = new Blob([result], {type: 'application/json'});
            FileSaver.saveAs(blob, this._snapshot.id + '.json');
        }
    }

    commitSnapshot() {
        this._commitManager.commitSnapshot();
    }


    // noinspection JSMethodCanBeStatic
    get currentDate() {
        let today = new Date();
        let [yyyy, mm, dd] = [today.getFullYear(), (today.getMonth() + 1), today.getDate()];
        if (dd < 10) {
            dd = '0' + dd;
        }
        if (mm < 10) {
            mm = '0' + mm;
        }
        return [yyyy, mm, dd].join("-");
    }

    get className() {
        return isScaffold(this._model) ? $SchemaClass.Scaffold : $SchemaClass.Graph;
    }

    toggleRepoPanel() {
        this.showRepoPanel = !this.showRepoPanel;
    }

    create() {
        logger.clear();
        this.model = {
            [$Field.name]: "newModel-" + this._counter++,
            [$Field.created]: this.currentDate,
            [$Field.lastUpdated]: this.currentDate
        };
        this._flattenGroups = false;
    }

    load(newModel) {
        this.model = newModel;
        this._flattenGroups = false;
    }

}