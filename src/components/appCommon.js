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
import config from "../data/config.json";
import {layouts} from "../layouts/layouts";
import {findResourceByID, mergeResources} from "../model/utils";
import {clone, cloneDeep, keys, merge, pick, isArray} from "lodash-bound";
import {$LogMsg, logger} from "../model/logger";
import {addJSONLDTypeDef, getJSONLDContext} from "../model/utilsJSONLD";
import {environment} from "../version/environment";
import {ElementRef, ViewChild} from "@angular/core";
import {modelClasses,} from '../model/index';
import FileSaver from 'file-saver';
import {ImportDialog} from "./dialogs/importDialog";

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
    }

    join(newModel) {
        if (this._model.id === newModel.id) {
            throw new Error("Cannot join models with the same identifiers: " + this._model.id);
        }
        if (isScaffold(this._model) !== isScaffold(newModel)) {
            this.model = removeDisconnectedObjects(this._model, newModel);
            this.applyScaffold(this._model, newModel);
        } else {
            //The code below joins 2 connectivity models or 2 scaffolds, your method breaks the join
            //this.model = removeDisconnectedObjects(this._model, newModel);
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
                const baseURLModels = baseURL+"models/";
                const defBaseURL = baseURL+"defs/";
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
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        if (!GITHUB_TOKEN) {
            throw Error("Set the GITHUB_TOKEN environment variable!");
        }
        const BRANCH = "main";
        const FILE_CONTENT = JSON.stringify(this._model, null, 4);
        const COMMIT_MESSAGE = "Add/update JSON file via API";
        const BASE_URL = config.storageURL;

        // Helper function to make API requests with XMLHttpRequest
        function makeRequest(method, url, body = null, callback) {
            const xhr = new XMLHttpRequest();
            xhr.open(method, url, true);
            xhr.setRequestHeader("Authorization", `token ${GITHUB_TOKEN}`);
            xhr.setRequestHeader("Accept", "application/vnd.github.v3+json");
            xhr.setRequestHeader("Content-Type", "application/json");

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        callback(null, JSON.parse(xhr.responseText));
                    } else {
                        callback(`Error: ${xhr.status} - ${xhr.responseText}`, null);
                    }
                }
            };
            xhr.send(body ? JSON.stringify(body) : null);
        }

        const commitJsonFile = () => {
            // Step 1: Check if the file exists to retrieve its SHA
            makeRequest(
                "GET",
                `${BASE_URL}/contents/${FILE_PATH}?ref=${BRANCH}`,
                null,
                (err, fileData) => {
                    let fileSHA = null;
                    if (!err) {
                        fileSHA = fileData.sha;
                    } else if (err.includes("404")) {
                        this.showMessage("File does not exist. Creating a new one.");
                    } else {
                        console.error("❌ Error checking file existence:", err);
                        throw Error("Error checking file existence!");
                    }

                    // Step 2: Create or update the file
                    makeRequest(
                        "PUT",
                        `${BASE_URL}/contents/${FILE_PATH}`,
                        {
                            message: COMMIT_MESSAGE,
                            content: Buffer.from(FILE_CONTENT).toString("base64"), // Convert to Base64
                            branch: BRANCH,
                            sha: fileSHA,
                        },
                        (err, response) => {
                            if (err) {
                                console.error("❌ Error committing file:", err);
                                throw Error("Error committing file!");
                            }
                            this.showMessage("Model file committed successfully!")
                        }
                    );
                }
            );
        }

        const FILE_PATH = this._model.id + ".json";
        commitJsonFile(FILE_PATH);
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

    loadFromRepo({fileName, fileContent}) {
        let [name, extension] = fileExtensionRe.exec(fileName);
        extension = extension.toLowerCase();
        this.model = loadModel(fileContent, name, extension);
        this.showRepoPanel = false;
    }

    applyChanges() {
        logger.clear();
        this._graphData = generateFromJSON({"id": "Empty"});
        this.model = this._model::merge({[$Field.lastUpdated]: this.currentDate});
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
            if (this._editor) {
                this._editor.set(this._model);
            }

            this.loading = false;
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
        let state_json = {
            [$Field.id]: getGenID(this._snapshot.id, "state", (this._snapshot.states || []).length),
            [$Field.camera]: {
                position: this._webGLScene.camera.position::pick(["x", "y", "z"]),
                up: this._webGLScene.camera.up::pick(["x", "y", "z"])
            },
            [$Field.layout]: this._config.layout::cloneDeep(),
            [$Field.showLabels]: this._config.showLabels::cloneDeep(),
            [$Field.labelContent]: this._config.labels::cloneDeep()
        }::merge(this._graphData.getCurrentState());
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
        if (activeState.camera) {
            this._webGLScene.resetCamera(activeState.camera.position, activeState.camera.up);
        }
        this._config = {};
        if (activeState.layout) {
            this._config.layout = activeState.layout;
        }
        if (activeState.showLabels) {
            this._config.showLabels = activeState.showLabels;
        }
        if (activeState.labelContent) {
            this._config.labelContent = activeState.labelContent;
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
            })
        }
        this._webGLScene.updateGraph();
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
            throw new Error("Snapshot is not applicable to the model!");
        } else {
            if (match === 0) {
                throw new Error("Snapshot corresponds to a different version of the model!");
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