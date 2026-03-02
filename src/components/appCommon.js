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
import {DiffDialog} from "./dialogs/diffDialog";
import {GitHubClient} from "../api/githubClient";

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
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        if (!GITHUB_TOKEN) {
            throw Error("Set the GITHUB_TOKEN environment variable!");
        }
        const client = new GitHubClient(GITHUB_TOKEN);

        if (isScaffold(this._model)) {
            this.commitScaffold(client);
            return;
        }

        // Build model for commit based on whether to omit collections (groups/scaffolds/snapshots)
        const props = [$Field.groups, $Field.scaffolds, $Field.snapshots];
        const buildModelForCommit = (omitCollections = true) => {
            // Start with model without the heavy collections
            let base = this._model;
            if (omitCollections) {
                base = base::omit(...props);
                props.forEach(prop => {
                    if (this._model[prop]) {
                        base[prop] = this._model[prop].filter(g => !g.imported);
                    }
                });
            }
            return base;
        };

        const initialModel = buildModelForCommit(true); // default: omit collections
        const FILE_CONTENT_OMIT = JSON.stringify(initialModel, null, 4);
        const DEFAULT_COMMIT_MESSAGE = "Add/update JSON file via API";
        const FILE_PATH = this._model.id + ".json";

        // Step 1: Get existing file (if any) to retrieve SHA and old content for diff
        client.getFile(FILE_PATH).then(fileData => {
            let fileSHA = fileData.sha;
            let oldContentText = "";
            if (fileData.content) {
                try {
                    oldContentText = client.fromBase64(fileData.content);
                } catch (e) {
                    console.warn("Could not decode existing file content", e);
                    oldContentText = "";
                }
            }

            // Open diff dialog to show differences and ask for an optional commit message
            const dialogRef = this._dialog.open(DiffDialog, {
                width: '75%',
                data: {
                    oldContent: oldContentText,
                    newContent: FILE_CONTENT_OMIT,
                    askCommitMessage: true,
                    defaultMessage: DEFAULT_COMMIT_MESSAGE
                }
            });

            dialogRef.afterClosed().subscribe(result => {
                // If dialog was closed without result or user cancelled, abort
                if (!result || result.proceed === false) {
                    this.showWarningMessage("Commit canceled.");
                    return;
                }
                const commitMessage = (result && result.message) ? result.message : DEFAULT_COMMIT_MESSAGE;
                const omitCollections = (result && typeof result.omitCollections === 'boolean') ? result.omitCollections : true;

                const modelForCommit = buildModelForCommit(omitCollections);
                const fileContent = JSON.stringify(modelForCommit, null, 4);

                // Step 2: Create or update the file
                client.putFile(FILE_PATH, client.toBase64(fileContent), commitMessage, fileSHA).then(() => {
                    this.showMessage("Model file committed successfully!");
                }).catch(commitErr => {
                    console.error("❌ Error committing file:", commitErr);
                    this.showErrorMessage("Error committing file!");
                });
            });
        }).catch(err => {
            if (err.status === 404) {
                this.showMessage("File does not exist. A new one will be created.");
                // Same logic as above but with empty oldContent
                const dialogRef = this._dialog.open(DiffDialog, {
                    width: '75%',
                    data: {
                        oldContent: "",
                        newContent: FILE_CONTENT_OMIT,
                        askCommitMessage: true,
                        defaultMessage: DEFAULT_COMMIT_MESSAGE
                    }
                });
                dialogRef.afterClosed().subscribe(result => {
                    if (!result || result.proceed === false) {
                        this.showWarningMessage("Commit canceled.");
                        return;
                    }
                    const commitMessage = (result && result.message) ? result.message : DEFAULT_COMMIT_MESSAGE;
                    const omitCollections = (result && typeof result.omitCollections === 'boolean') ? result.omitCollections : true;
                    const modelForCommit = buildModelForCommit(omitCollections);
                    const fileContent = JSON.stringify(modelForCommit, null, 4);

                    client.putFile(FILE_PATH, client.toBase64(fileContent), commitMessage).then(() => {
                        this.showMessage("Model file committed successfully!");
                    }).catch(putErr => {
                        console.error("❌ Error committing file:", putErr);
                        this.showErrorMessage("Error committing file!");
                    });
                });
            } else {
                console.error("❌ Error checking file existence:", err);
                this.showErrorMessage("Error checking file existence!");
            }
        });
    }

    commitScaffold(client) {
        const scaffold = this._model;
        const FILE_PATH_NO_IMAGES = `scaffolds/${scaffold.id}.json`;
        const FILE_PATH_WITH_IMAGES = `scaffolds/${scaffold.id}/${scaffold.id}.json`;

        const getScaffoldFile = () => {
            return client.getFile(FILE_PATH_WITH_IMAGES).catch(err => {
                if (err.status === 404) {
                    return client.getFile(FILE_PATH_NO_IMAGES);
                }
                throw err;
            });
        };

        getScaffoldFile().then(fileData => {
            let oldContentText = "";
            if (fileData.content) {
                try {
                    oldContentText = client.fromBase64(fileData.content);
                } catch (e) {
                    console.warn("Could not decode existing scaffold content", e);
                }
            }
            this.showDiffAndCommitScaffold(client, oldContentText, fileData.sha);
        }).catch(err => {
            if (err.status === 404) {
                this.showMessage("Scaffold file does not exist. A new one will be created.");
                this.showDiffAndCommitScaffold(client, "", null);
            } else {
                console.error("❌ Error checking scaffold existence:", err);
                this.showErrorMessage("Error checking scaffold existence!");
            }
        });
    }

    showDiffAndCommitScaffold(client, oldContentText, fileSHA) {
        const scaffold = this._model;
        const DEFAULT_COMMIT_MESSAGE = `Update scaffold ${scaffold.id}`;
        const BRANCH = client.branch;
        const scaffoldJSON = JSON.stringify(scaffold, null, 2);

        const dialogRef = this._dialog.open(DiffDialog, {
            width: '75%',
            data: {
                oldContent: oldContentText,
                newContent: scaffoldJSON,
                askCommitMessage: true,
                defaultMessage: DEFAULT_COMMIT_MESSAGE,
                showIncludeImages: true
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (!result || result.proceed === false) {
                this.showWarningMessage("Scaffold commit canceled.");
                return;
            }
            const commitMessage = (result && result.message) ? result.message : DEFAULT_COMMIT_MESSAGE;
            const includeImages = !!result.includeImages;

            const imagesToCommit = {}; // name -> dataURL
            let totalImagesSize = 0;
            const backgroundsMap = this._webGLScene?._backgroundsMap || {};

            if (includeImages) {
                const collectImages = (component) => {
                    if (component.background) {
                        const bg = component.background;
                        const path = bg.path || bg.uri;
                        if (path && backgroundsMap[path]) {
                            imagesToCommit[path] = backgroundsMap[path];
                            // Estimate size: base64 string length * 0.75 is approx byte size
                            const base64Data = backgroundsMap[path].split(',')[1] || "";
                            totalImagesSize += base64Data.length * 0.75;
                        }
                    }
                    (component.components || []).forEach(collectImages);
                };
                collectImages(scaffold);

                if (totalImagesSize > 1024 * 1024) {
                    this.showErrorMessage("Cannot commit background images - too large!");
                    return;
                }
            }

            const hasImages = Object.keys(imagesToCommit).length > 0;
            const FILE_PATH = hasImages
                ? `scaffolds/${scaffold.id}/${scaffold.id}.json`
                : `scaffolds/${scaffold.id}.json`;

            let modelForCommit = cloneDeep(scaffold);
            if (hasImages) {
                const updateImagePaths = (component) => {
                    if (component.background) {
                        const bg = component.background;
                        const path = bg.path || bg.uri;
                        if (path && imagesToCommit[path]) {
                            if (bg.path) { bg.path = `backgrounds/${path}`; }
                            if (bg.uri)  { bg.uri  = `backgrounds/${path}`; }
                        }
                    }
                    (component.components || []).forEach(updateImagePaths);
                };
                updateImagePaths(modelForCommit);
            }
            const finalScaffoldJSON = JSON.stringify(modelForCommit, null, 2);

            if (!hasImages) {
                client.putFile(FILE_PATH, client.toBase64(finalScaffoldJSON), commitMessage, fileSHA).then(() => {
                    this.showMessage("Scaffold committed successfully!");
                }).catch(err => {
                    console.error("❌ Error committing scaffold:", err);
                    this.showErrorMessage("Error committing scaffold!");
                });
            } else {
                // Complex commit with images using Trees API
                const repoURL = client.getRepoUrl();
                client.makeRequest("GET", `${repoURL}/branches/${BRANCH}`).then(branchData => {
                    const baseTreeSHA = branchData.commit.commit.tree.sha;
                    const parentCommitSHA = branchData.commit.sha;

                    const filesToCommit = [
                        {
                            path: FILE_PATH,
                            content: finalScaffoldJSON,
                            encoding: 'utf-8'
                        }
                    ];
                    Object.entries(imagesToCommit).forEach(([name, dataURL]) => {
                        filesToCommit.push({
                            path: `scaffolds/${scaffold.id}/backgrounds/${name}`,
                            content: dataURL.split(',')[1],
                            encoding: 'base64'
                        });
                    });

                    const treeItems = [];
                    const blobPromises = filesToCommit.map(file => {
                        return client.makeRequest("POST", `${repoURL}/git/blobs`, {
                            content: file.content,
                            encoding: file.encoding
                        }).then(blobData => {
                            treeItems.push({
                                path: file.path,
                                mode: "100644",
                                type: "blob",
                                sha: blobData.sha
                            });
                        });
                    });

                    Promise.all(blobPromises).then(() => {
                        client.makeRequest("POST", `${repoURL}/git/trees`, {
                            base_tree: baseTreeSHA,
                            tree: treeItems
                        }).then(treeData => {
                            client.makeRequest("POST", `${repoURL}/git/commits`, {
                                message: commitMessage,
                                tree: treeData.sha,
                                parents: [parentCommitSHA]
                            }).then(commitData => {
                                client.makeRequest("PATCH", `${repoURL}/git/refs/heads/${BRANCH}`, {
                                    sha: commitData.sha
                                }).then(() => {
                                    this.showMessage("Scaffold and images committed successfully!");
                                }).catch(refErr => {
                                    console.error("❌ Error updating branch reference:", refErr);
                                    this.showErrorMessage("Error updating branch reference!");
                                });
                            }).catch(commitErr => {
                                console.error("❌ Error creating commit:", commitErr);
                                this.showErrorMessage("Error creating commit!");
                            });
                        }).catch(treeErr => {
                            console.error("❌ Error creating tree:", treeErr);
                            this.showErrorMessage("Error creating tree!");
                        });
                    }).catch(blobErr => {
                        console.error("❌ Error creating blob:", blobErr);
                        this.showErrorMessage(`Error creating blob!`);
                    });
                }).catch(branchErr => {
                    console.error("❌ Error getting branch info:", branchErr);
                    this.showErrorMessage("Error getting branch info!");
                });
            }
        });
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
        this._graphData = generateFromJSON({"id": "Empty"});
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
        const inputStratifiedRegion = this.modelClasses.Stratification.createStratifiedRegion(this._model, inputStratification, inputWire);
        //mergeGenResource(undefined, this._model, inputStratifiedRegion, $Field.stratifiedRegions);

        // Generate class instance for the generated model
        const stratifiedRegion = this.modelClasses.StratifiedRegion.fromJSON(
            inputStratifiedRegion, this.modelClasses, this._graphData.entitiesByID, this._graphData.namespace
        );
        // Create visual objects for the new stratified region
        callback(stratifiedRegion);

        if (this._editor) {
            this._editor.set(this._model);
        }
        //
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
                up: this._webGLScene.camera.up::pick(["x", "y", "z"]),
                target: (this._webGLScene.controls && this._webGLScene.controls.target)
                    ? this._webGLScene.controls.target::pick(["x", "y", "z"]) : undefined
            },
            [$Field.layout]: this._config.layout::cloneDeep(),
            [$Field.showLabels]: this._config.showLabels::cloneDeep(),
            [$Field.labelContent]: this._config.labels::cloneDeep()
        }::merge(this._graphData.getCurrentState());
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
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        if (!GITHUB_TOKEN) {
            throw Error("Set the GITHUB_TOKEN environment variable!");
        }
        const client = new GitHubClient(GITHUB_TOKEN);
        const BRANCH = client.branch;

        // Serialize snapshot similar to saveSnapshot()
        const snapshotJSON = JSON.stringify(this._snapshot.toJSON(2, { [$Field.states]: 4 }), null, 2);
        const DEFAULT_COMMIT_MESSAGE = `Update snapshot ${this._snapshot.id}`;

        // Store snapshots in a snapshots/ folder next to models in the repo
        const FILE_PATH = `snapshots/${this._snapshot.id}.json`;

        // Step 1: Get existing file to retrieve SHA and old content
        client.getFile(FILE_PATH).then(fileData => {
            let fileSHA = fileData.sha;
            let oldContentText = "";
            if (fileData.content) {
                try {
                    oldContentText = client.fromBase64(fileData.content);
                } catch (e) {
                    console.warn("Could not decode existing snapshot content", e);
                    oldContentText = "";
                }
            }

            // Show diff and ask for commit message
            const dialogRef = this._dialog.open(DiffDialog, {
                width: '75%',
                data: {
                    oldContent: oldContentText,
                    newContent: snapshotJSON,
                    askCommitMessage: true,
                    defaultMessage: DEFAULT_COMMIT_MESSAGE
                }
            });

            dialogRef.afterClosed().subscribe(result => {
                if (!result || result.proceed === false) {
                    this.showMessage("Snapshot commit canceled.");
                    return;
                }
                const commitMessage = (result && result.message) ? result.message : DEFAULT_COMMIT_MESSAGE;

                client.putFile(FILE_PATH, client.toBase64(snapshotJSON), commitMessage, fileSHA).then(() => {
                    // Build raw GitHub URL for the committed snapshot and copy to clipboard
                    const {owner, repo} = client.getOwnerRepo();
                    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/${BRANCH}/${FILE_PATH}`;

                    const copyToClipboard = async (text) => {
                        try {
                            if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
                                await navigator.clipboard.writeText(text);
                                return true;
                            }
                        } catch (e) { /* fall back below */ }
                        try {
                            const ta = document.createElement('textarea');
                            ta.value = text;
                            ta.style.position = 'fixed';
                            ta.style.top = '0';
                            ta.style.left = '0';
                            ta.style.opacity = '0';
                            document.body.appendChild(ta);
                            ta.focus();
                            ta.select();
                            const success = document.execCommand('copy');
                            document.body.removeChild(ta);
                            return !!success;
                        } catch (e) {
                            return false;
                        }
                    };

                    copyToClipboard(rawUrl).then(ok => {
                        if (ok) {
                            this.showMessage("Snapshot committed successfully! location copied to clipboard");
                        } else {
                            this.showMessage(`Snapshot committed successfully! Raw location: ${rawUrl}`);
                        }
                    });
                }).catch(commitErr => {
                    console.error("❌ Error committing snapshot:", commitErr);
                    this.showErrorMessage("Error committing snapshot!");
                });
            });
        }).catch(err => {
            if (err.status === 404) {
                this.showMessage("Snapshot file does not exist. A new one will be created.");
                const dialogRef = this._dialog.open(DiffDialog, {
                    width: '75%',
                    data: {
                        oldContent: "",
                        newContent: snapshotJSON,
                        askCommitMessage: true,
                        defaultMessage: DEFAULT_COMMIT_MESSAGE
                    }
                });
                dialogRef.afterClosed().subscribe(result => {
                    if (!result || result.proceed === false) {
                        this.showMessage("Snapshot commit canceled.");
                        return;
                    }
                    const commitMessage = (result && result.message) ? result.message : DEFAULT_COMMIT_MESSAGE;
                    client.putFile(FILE_PATH, client.toBase64(snapshotJSON), commitMessage).then(() => {
                         // Build raw GitHub URL for the committed snapshot and copy to clipboard
                        const {owner, repo} = client.getOwnerRepo();
                        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/${BRANCH}/${FILE_PATH}`;

                        const copyToClipboard = async (text) => {
                             try {
                                if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
                                    await navigator.clipboard.writeText(text);
                                    return true;
                                }
                            } catch (e) { /* fall back below */ }
                            try {
                                const ta = document.createElement('textarea');
                                ta.value = text;
                                ta.style.position = 'fixed';
                                ta.style.top = '0';
                                ta.style.left = '0';
                                ta.style.opacity = '0';
                                document.body.appendChild(ta);
                                ta.focus();
                                ta.select();
                                const success = document.execCommand('copy');
                                document.body.removeChild(ta);
                                return !!success;
                            } catch (e) {
                                return false;
                            }
                        };

                        copyToClipboard(rawUrl).then(ok => {
                            if (ok) {
                                this.showMessage("Snapshot committed successfully! location copied to clipboard");
                            } else {
                                this.showMessage(`Snapshot committed successfully! Raw location: ${rawUrl}`);
                            }
                        });
                    }).catch(putErr => {
                        console.error("❌ Error committing snapshot:", putErr);
                        this.showErrorMessage("Error committing snapshot!");
                    });
                });
            } else {
                console.error("❌ Error checking snapshot existence:", err);
                this.showErrorMessage("Error checking snapshot existence!");
            }
        });
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