import {NgModule, Component, Input, Output, EventEmitter} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

import {HttpClient} from "@angular/common/http";

/**
 * @ignore
 */
@Component({
    selector: 'modelRepoPanel',
    template: ` 
            <section class="w3-padding-small">
                <button class="w3-bar-item w3-hover-light-grey"
                        (click)="executeQuery()" title="Load models">
                    <i class="fa fa-database"> </i>
                </button>
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
    models;
    /**
     * Load ApiNATOMY models from GitHub repository
     * @param http
     */
    constructor(http: HttpClient) {
        this.http  = http;
    }

    executeQuery(){
        let url = "https://api.github.com/users/albatros/repos";

        this.http.get(url).subscribe(res => {
            this.result = JSON.stringify(res);
            console.log(this.result);
        })
    }
}

@NgModule({
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    declarations: [ModelRepoPanel],
    exports: [ModelRepoPanel]
})
export class ModelRepoPanelModule {
}