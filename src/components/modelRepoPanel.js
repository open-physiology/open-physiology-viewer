import {NgModule, Component, Input, Output, EventEmitter} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

import {LogInfoModule, LogInfoDialog} from "./gui/logInfoDialog";
import {HttpClient} from "@angular/common/http";

/**
 * @ignore
 */
@Component({
    selector: 'modelRepoPanel',
    template: ` 
            <section class="w3-padding-small">
            </section>
    `,
    styles: [`
        :host >>> fieldset {
            border: 1px solid grey;
            margin: 2px;
        }
    `]
})
export class ModelRepoPanel {

    @Input() models;

    /**
     * Load ApiNATOMY models from GitHub repository
     * @param http
     */
    constructor(http: HttpClient) {
    }
}

@NgModule({
    imports: [CommonModule, FormsModule, ReactiveFormsModule, LogInfoModule],
    declarations: [ModelRepoPanel],
    entryComponents: [LogInfoDialog],
    exports: [ModelRepoPanel]
})
export class ModelRepoPanelModule {
}