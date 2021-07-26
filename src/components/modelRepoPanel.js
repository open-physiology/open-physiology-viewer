import {NgModule, Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatListModule} from '@angular/material';

import {HttpClient} from "@angular/common/http";
import {repoURL} from './config';

/**
 * @ignore
 */
@Component({
    selector: 'modelRepoPanel',
    changeDetection: ChangeDetectionStrategy.Default,
    template: `
        <section class="w3-padding-small">
            <section id="modelRepo" class="w3-padding-small w3-white">
                <fieldset class="w3-card w3-round w3-margin-small">
                    <legend>URL</legend>
                    <input matInput class="w3-input"
                           matTooltip="Model repository link"
                           type="text"
                           [value]="url"
                           [max]="100"
                           (input)="url = $event.target.value"
                    >
                    <button class="w3-bar-item w3-hover-light-grey w3-right"
                            (click)="executeQuery()" title="Load models">
                        <i class="fa fa-database"> </i>
                    </button>
                </fieldset>
    
                <fieldset class="w3-card w3-round w3-margin-small">
                    <legend>Models</legend>
                    <mat-nav-list id="modelList">                
                        <mat-list-item *ngFor="let fileName of fileNames">
                            <button mat-icon-button (dblclick)="loadModel(fileName)">
                                <i class="fa fa-file"> {{fileName}} </i> 
                            </button>
                        </mat-list-item>
                    </mat-nav-list>
                </fieldset>
            </section>
        </section>
    `,
    styles: [`
        :host >>> fieldset {
            border: 1px solid grey;
            margin: 2px;
        }

        :host >>> legend {
            padding: 0.2em 0.5em;
            border : 1px solid grey;
            color  : grey;
            font-size: 90%;
            text-align: right;
        }

        #modelRepo {
            height: 100vh;
            overflow-y: scroll;
        }
    `]
})
export class ModelRepoPanel {
    models = {};
    fileNames = [];
    url = repoURL;

    @Output() onModelLoad = new EventEmitter();

    /**
     * Load ApiNATOMY models from GitHub repository
     * @param http
     */
    constructor(http: HttpClient) {
        this.http  = http;
    }

    executeQuery(){
        this.models = {};
        this.fileNames = [];
        const getFileExt = fileName => {
            let ext = /(?:\.([^.]+))?$/.exec(fileName)[1];
            return ext && ext.toLowerCase();
        }

        try {
            this.http.get(this.url).subscribe(res => {
                this.fileNames = (res||[]).map(model => model.name);
                console.log(this.fileNames);
                this.fileNames = this.fileNames.filter(fileName => getFileExt(fileName) === "json" );
                (res || []).forEach(model => {
                    this.models[model.name] = model;
                });
            })
        } catch (e){
            throw new Error("Failed to access the model repository, please revise the repository URL.");
        }
    }

    loadModel(fileName){
        if (!this.models[fileName]){
            throw new Error("File not found: " + fileName);
        }
        try {
            this.http.get(this.models[fileName].download_url).subscribe(res => {
                this.onModelLoad.emit({fileName: fileName, fileContent: res});
            })
        } catch (e){
            throw new Error("Failed to download the model!");
        }
    }
}

@NgModule({
    imports: [CommonModule, FormsModule, ReactiveFormsModule, MatListModule],
    declarations: [ModelRepoPanel],
    exports: [ModelRepoPanel]
})
export class ModelRepoPanelModule {
}