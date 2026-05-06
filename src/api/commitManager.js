import {GitHubClient} from "./githubClient";
import {gcsClient} from "./googleCloud";
import {isScaffold} from "../model";
import {DiffDialog} from "../components/dialogs/diffDialog";
import {$Field} from "../model/utils";
import {omit} from "lodash-bound";
import {ElementRef} from "@angular/core";

export class CommitManager {
    constructor(appCommon) {
        this.app = appCommon;
    }

    commit() {
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        if (!GITHUB_TOKEN) {
            throw Error("Set the GITHUB_TOKEN environment variable!");
        }
        const client = new GitHubClient(GITHUB_TOKEN);

        const scaffold = isScaffold(this.app._model);
        const props = scaffold
            ? [$Field.anchors, $Field.wires, $Field.regions, $Field.stratifications, $Field.components]
            : [$Field.groups, $Field.scaffolds, $Field.snapshots];

        const buildModelForCommit = (omitCollections = true) => {
            let base = this.app._model;
            if (omitCollections) {
                base = base::omit(...props);
                props.forEach(prop => {
                    if (this.app._model[prop]) {
                        base[prop] = this.app._model[prop].filter(g => !g.imported);
                    }
                });
            }
            // Ensure we use a clean JSON representation to avoid circular references
            return JSON.parse(JSON.stringify(base));
        };

        const initialModel = buildModelForCommit(true);
        const FILE_CONTENT_INITIAL = JSON.stringify(initialModel, null, 4);
        const DEFAULT_COMMIT_MESSAGE = scaffold ? `Update scaffold ${this.app._model.id}` : "Add/update JSON file via API";
        const FILE_PATH = scaffold ? `scaffolds/${this.app._model.id}.json` : `${this.app._model.id}.json`;

        const getExistingFile = () => client.getFile(FILE_PATH);

        getExistingFile().then(fileData => {
            let fileSHA = fileData.sha;
            let oldContentText = "";
            if (fileData.content) {
                try {
                    oldContentText = client.fromBase64(fileData.content);
                } catch (e) {
                    console.warn("Could not decode existing file content", e);
                }
            }
            this.showDiffAndCommit(client, oldContentText, fileSHA, buildModelForCommit, FILE_CONTENT_INITIAL, FILE_PATH, DEFAULT_COMMIT_MESSAGE);
        }).catch(err => {
            if (err.status === 404) {
                this.app.showMessage(`${scaffold ? 'Scaffold' : 'Model'} file does not exist. A new one will be created.`);
                this.showDiffAndCommit(client, "", null, buildModelForCommit, FILE_CONTENT_INITIAL, FILE_PATH, DEFAULT_COMMIT_MESSAGE);
            } else {
                console.error("❌ Error checking file existence:", err);
                this.app.showErrorMessage("Error checking file existence!");
            }
        });
    }

    showDiffAndCommit(client, oldContentText, fileSHA, buildModelForCommit, newContentInitial, filePath, defaultMessage) {
        const MAX_LINES = 10000;
        const lineCount = (newContentInitial || "").split('\n').length;
        const tooLarge = lineCount > MAX_LINES;

        const backgroundsMap = (this.app._webGLScene instanceof ElementRef)
            ? this.app._webGLScene.nativeElement?._backgroundsMap || {}
            : this.app._webGLScene?._backgroundsMap || {};
        const hasImages = Object.keys(backgroundsMap).length > 0;

        const dialogRef = this.app._dialog.open(DiffDialog, {
            width: '75%',
            data: {
                oldContent: tooLarge ? "Content too large to display diff" : oldContentText,
                newContent: tooLarge ? "Content too large to display diff" : newContentInitial,
                askCommitMessage: true,
                defaultMessage: defaultMessage,
                showIncludeImages: hasImages,
                isScaffold: isScaffold(this.app._model)
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (!result || result.proceed === false) {
                this.app.showWarningMessage("Commit canceled.");
                return;
            }
            const commitMessage = (result && result.message) ? result.message : defaultMessage;
            const omitCollections = (result && typeof result.omitCollections === 'boolean') ? result.omitCollections : true;
            const includeImages = hasImages && !!result.includeImages;

            const modelForCommit = buildModelForCommit(omitCollections);
            const fileContent = JSON.stringify(modelForCommit, null, 4);

            const commitAction = () => client.putFile(filePath, client.toBase64(fileContent), commitMessage, fileSHA).then(() => {
                this.app.showMessage(`${isScaffold(this.app._model) ? 'Scaffold' : 'Model'} file committed successfully!`);
            }).catch(commitErr => {
                console.error("❌ Error committing file:", commitErr);
                this.app.showErrorMessage("Error committing file!");
            });

            if (includeImages) {
                const uploadPromises = Object.entries(backgroundsMap).map(([name, dataURL]) =>
                    gcsClient.uploadImage(name, dataURL)
                );
                Promise.all(uploadPromises).then(() => {
                    commitAction();
                }).catch(err => {
                    console.error("❌ Error uploading images to GCS:", err);
                    this.app.showErrorMessage("Error uploading images to GCS! Model commit proceeded.");
                    commitAction();
                });
            } else {
                commitAction();
            }
        });
    }

    commitSnapshot() {
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        if (!GITHUB_TOKEN) {
            throw Error("Set the GITHUB_TOKEN environment variable!");
        }
        const client = new GitHubClient(GITHUB_TOKEN);
        const BRANCH = client.branch;

        // Serialize snapshot similar to saveSnapshot()
        const snapshotJSON = JSON.stringify(this.app._snapshot.toJSON(2, { [$Field.states]: 4 }), null, 2);
        const DEFAULT_COMMIT_MESSAGE = `Update snapshot ${this.app._snapshot.id}`;

        // Store snapshots in a snapshots/ folder next to models in the repo
        const FILE_PATH = `snapshots/${this.app._snapshot.id}.json`;

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

            // Show diff and ask for a commit message
            const dialogRef = this.app._dialog.open(DiffDialog, {
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
                    this.app.showMessage("Snapshot commit canceled.");
                    return;
                }
                const commitMessage = (result && result.message) ? result.message : DEFAULT_COMMIT_MESSAGE;

                client.putFile(FILE_PATH, client.toBase64(snapshotJSON), commitMessage, fileSHA).then(() => {
                    // Build raw GitHub URL for the committed snapshot and copy to clipboard
                    const {owner, repo} = client.getOwnerRepo();
                    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/${BRANCH}/${FILE_PATH}`;

                    this.copyToClipboard(rawUrl).then(ok => {
                        if (ok) {
                            this.app.showMessage("Snapshot committed successfully! location copied to clipboard");
                        } else {
                            this.app.showMessage(`Snapshot committed successfully! Raw location: ${rawUrl}`);
                        }
                    });
                }).catch(commitErr => {
                    console.error("❌ Error committing snapshot:", commitErr);
                    this.app.showErrorMessage("Error committing snapshot!");
                });
            });
        }).catch(err => {
            if (err.status === 404) {
                this.app.showMessage("Snapshot file does not exist. A new one will be created.");
                const dialogRef = this.app._dialog.open(DiffDialog, {
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
                        this.app.showMessage("Snapshot commit canceled.");
                        return;
                    }
                    const commitMessage = (result && result.message) ? result.message : DEFAULT_COMMIT_MESSAGE;
                    client.putFile(FILE_PATH, client.toBase64(snapshotJSON), commitMessage).then(() => {
                         // Build raw GitHub URL for the committed snapshot and copy to clipboard
                        const {owner, repo} = client.getOwnerRepo();
                        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/${BRANCH}/${FILE_PATH}`;

                        this.copyToClipboard(rawUrl).then(ok => {
                            if (ok) {
                                this.app.showMessage("Snapshot committed successfully! location copied to clipboard");
                            } else {
                                this.app.showMessage(`Snapshot committed successfully! Raw location: ${rawUrl}`);
                            }
                        });
                    }).catch(commitErr => {
                        console.error("❌ Error committing snapshot:", commitErr);
                        this.app.showErrorMessage("Error committing snapshot!");
                    });
                });
            } else {
                console.error("❌ Error checking snapshot existence:", err);
                this.app.showErrorMessage("Error checking snapshot existence!");
            }
        });
    }

    async copyToClipboard(text) {
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
    }
}
