import {NgModule, Component, ErrorHandler, ChangeDetectionStrategy} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {MatTabsModule} from '@angular/material/tabs';
import {MatListModule} from '@angular/material/list'
import {MatFormFieldModule} from '@angular/material/form-field';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import {MainToolbarModule} from "../components/toolbars/mainToolbar";
import {SnapshotToolbarModule} from "../components/toolbars/snapshotToolbar";
import {StateToolbarModule} from "../components/toolbars/stateToolbar";
import {ModelRepoPanelModule} from "../components/modelRepoPanel";
import {GlobalErrorHandler} from '../services/errorHandler';
import 'hammerjs';
import defaultTestModel from '../data/graph.json';

import "./styles/material.scss";
import "@fortawesome/fontawesome-free/js/all.js";
import "@fortawesome/fontawesome-free/css/all.css";
import "@fortawesome/fontawesome-free/js/v4-shims";
import "@fortawesome/fontawesome-free/css/v4-shims.css";

import {MatSnackBar, MatSnackBarModule} from "@angular/material/snack-bar";
import {ImportDialog} from "../components/dialogs/importDialog";
import {WebGLSceneModule} from '../components/webGLScene';
import {enableProdMode} from '@angular/core';

import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {AppCommon} from "../components/appCommon";
import {HttpClient, HttpClientModule} from "@angular/common/http";
import config from "../data/config.json";
import {processImports} from "../model";

enableProdMode();

@Component({
    selector: 'demo-app',
    changeDetection: ChangeDetectionStrategy.Default,
    template: `

        <!-- Header -->

        <header class="w3-bar w3-top w3-dark-grey" style="z-index:10;">
            <span class="w3-bar-item"><i class="fa fa-heartbeat w3-margin-right"> </i>ApiNATOMY
			</span>
            <span class="w3-bar-item" title="About ApiNATOMY">
				<a href="https://youtu.be/XZjldom8CQM"><i class="fa fa-youtube"> </i></a>
			</span>
            <span class="w3-bar-item" title="Source code">
				<a href="https://github.com/open-physiology/open-physiology-viewer"><i class="fa fa-github"> </i></a>
			</span>
            <span *ngIf="version" class="w3-bar-item w3-right">{{ version }}</span>
            <span class="w3-bar-item">
                Model: {{ _modelName }}
            </span>
            <span *ngIf="_snapshot" class="w3-bar-item">
                Snapshot model: {{ _snapshot.name }}
            </span>
            <snapshot-toolbar id="snapshot-toolbar"
                              (onCreateSnapshot)="createSnapshot()"
                              (onLoadSnapshot)="loadSnapshot($event)"
                              (onSaveSnapshot)="saveSnapshot()"
                              (onCommitSnapshot)="commitSnapshot()"
            >
            </snapshot-toolbar>
            <state-toolbar id="state-toolbar"
                           [activeIndex]="_snapshot?.activeIndex"
                           [total]="_snapshot?.length || 0"
                           [unsavedState]="!!_unsavedState"
                           (onPreviousState)="previousState()"
                           (onNextState)="nextState()"
                           (onAddState)="saveState()"
                           (onDeleteState)="removeState()"
                           (onHomeState)="homeState()"
            >
            </state-toolbar>
            <span class="w3-bar-item w3-right" title="ApiNATOMY">
				<a href="https://apinatomy.net/">
					<i class="fa fa-external-link"> </i>
				</a>  
			</span>
            <span class="w3-bar-item w3-right" title="Learn more">
				<a href="http://open-physiology-viewer-docs.surge.sh"><i class="fa fa-home"> </i></a>
            </span>
        </header>

        <!--Left toolbar-->

        <main-toolbar
                [showRepoPanel]="showRepoPanel"
                (onCreateModel)="create()"
                (onLoadModel)="load($event)"
                (onJoinModel)="join($event)"
                (onMergeModel)="merge($event)"
                (onExportModel)="save($event)"
                (onModelCommit)="commit($event)"
                (onImportExcelModel)="load($event)"
                (onToggleRepoPanel)="toggleRepoPanel()"
        >
        </main-toolbar>

        <!--Views-->

        <section id="main-panel">
            <section id="repo-panel" *ngIf="showRepoPanel" class="w3-quarter w3-gray w3-border-right w3-border-white">
                <section class="w3-padding-small">
                    <i class="fa fa-database"> </i> Model Repository
                </section>
                <modelRepoPanel (onModelLoad)="loadFromRepo($event)">
                </modelRepoPanel>
            </section>

            <webGLScene #webGLScene [class.w3-threequarter]="showRepoPanel"
                        [modelClasses]="modelClasses"
                        [graphData]="_graphData"
                        [config]="_config"
                        [showChain]="_showChain"
                        (onImportExternal)="importExternal($event)"
                        (selectedItemChange)="onSelectedItemChange($event)"
                        (highlightedItemChange)="onHighlightedItemChange($event)"
                        (scaffoldUpdated)="onScaffoldUpdated($event)"
                        (varianceReset)="applyChanges()"
                        (editResource)="onEditResource($event)"
            >
            </webGLScene>

            <!-- Model loading progress bar -->
            <div *ngIf="loading" class="loading-overlay">
                <div class="loading-content">
                    <mat-progress-spinner
                            color="primary"
                            mode="indeterminate"
                            diameter="50">
                    </mat-progress-spinner>
                    <p class="loading-text">Please, wait! Model is loading...</p>
                </div>
            </div>
        </section>

        <!-- Footer -->

        <footer class="w3-container w3-grey">
            <span class="w3-row w3-right">
				<i class="fa fa-code w3-padding-small"> </i>natallia.kokash@gmail.com
			</span>
            <span class="w3-row w3-right">
				<i class="fa fa-envelope w3-padding-small"> </i>bernard.de.bono@gmail.com
			</span>
        </footer>
    `,
    styles: [`
        .vertical-toolbar {
            width: 48px;
        }

        #main-panel {
            margin-top: 40px;
            margin-left: 48px;
            width: calc(100% - 48px);
            height: 90vh
        }

        #repo-panel {
            height: 95vh;
        }

        .loading-overlay {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
            width: 100%;
            position: absolute;
            top: 0;
            left: 0;
            background: rgba(255, 255, 255, 0.8);
            z-index: 1000;
        }

        .loading-content {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .loading-text {
            margin-top: 16px;
            font-size: 16px;
            color: #333;
            font-family: Arial, sans-serif;
        }

        footer {
            position: absolute;
            bottom: 0;
            width: 100%;
        }
    `]
})
export class DemoApp extends AppCommon {

    constructor(dialog: MatDialog, snackBar: MatSnackBar, http: HttpClient) {
        super(dialog, snackBar, http);
    }

    ngAfterViewInit() {
        const fileName = 'renal-wbkg-scaffold-snapshot-v1.json';
        const metaUrl = `${config.storageContentURL}${fileName}`;
        try {
            this.http.get(metaUrl).subscribe((meta) => {
                const downloadUrl = meta && meta.download_url ? meta.download_url : null;
                if (!downloadUrl) {
                    this.showErrorMessage('Failed to resolve model download URL');
                    return;
                }
                this.http.get(downloadUrl).subscribe((model) => {
                    // Set main model
                    this.model = model;
                    // Load and import dependencies if any
                    const imports = (model && model.imports) ? model.imports : [];
                    if (imports.length > 0) {
                        const getJSON = (url) => new Promise((resolve, reject) => {
                            try {
                                this.http.get(url).subscribe(resolve, reject);
                            } catch (e) {
                                reject(e);
                            }
                        });
                        Promise.all(imports.map(u => getJSON(u)))
                            .then(values => {
                                if (values && values.length > 0) {
                                    processImports(this._model, values);
                                    // Re-assign to trigger graph regeneration and UI update
                                    this.model = this._model;
                                }
                            })
                            .catch(err => {
                                console.error(err);
                                this.showWarningMessage('Some imports failed to load');
                            });
                    }
                }, err => {
                    console.error(err);
                    this.showErrorMessage('Failed to download model');
                });
            }, err => {
                console.error(err);
                this.showErrorMessage('Failed to access model metadata');
            });
        } catch (e) {
            console.error(e);
            this.showErrorMessage('Unexpected error while loading model');
        }
    }
}

/**
 * The DemoAppModule test module, which supplies the _excellent_ TestApp test application!
 */
@NgModule({
    imports: [BrowserModule, WebGLSceneModule, BrowserAnimationsModule,
        ModelRepoPanelModule, MainToolbarModule, SnapshotToolbarModule, StateToolbarModule,
        MatDialogModule, MatTabsModule, MatListModule, MatFormFieldModule, MatSnackBarModule, MatProgressSpinnerModule,
        HttpClientModule],
    declarations: [DemoApp, ImportDialog],
    bootstrap: [DemoApp],
    entryComponents: [ImportDialog],
    providers: [
        {
            provide: MatSnackBar,
            useClass: MatSnackBar
        },
        {
            provide: ErrorHandler,
            useClass: GlobalErrorHandler
        }
    ]
})
export class DemoAppModule {
}
