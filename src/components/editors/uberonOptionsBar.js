import {Component, EventEmitter, Input, NgModule, Output} from '@angular/core';
import {CommonModule} from "@angular/common";
import {HttpClient, HttpClientModule} from '@angular/common/http';
import config from "../../data/config.json";
import {values} from 'lodash-bound';
import {CheckboxFilterModule} from "./checkboxFilter";

@Component({
    selector: 'uberonSearch',
    template:`
        <div>
            <mat-form-field>
                <input matInput class="w3-input"
                       placeholder="content"
                       matTooltip="Content"
                       [value]="content"
                       (keyup.enter)="content = $event.target.value"
                       (focusout)="content = $event.target.value"
                >
            </mat-form-field>
            <div class="default-boxFooter">
                <button [disabled]="!_content || error" class="w3-bar-item w3-hover-light-grey w3-right"
                        (click)="executeQuery()" title="Find UBERON annotations in KG">
                    <i class="fa fa-database"> </i>
                </button>
            </div>
            <div *ngIf="result" class="default-boxResult">
                <label>Response</label>
                <span>{{result}}</span>
            </div>
            <div class="default-boxResult">
                <checkboxFilter [options]="options"
                    (onOptionToggle)="updateOptions($event)"
                ></checkboxFilter>
                <button [disabled]="options?.length === 0" class="w3-bar-item w3-hover-light-grey w3-right"
                        (click)="onInclude.emit(options)" title="Include selected annotations">
                    <i class="fa fa-plus"> </i>
                </button>
            </div>
        </div>
    `
})
export class UberonOptionsBar {
    _content;
    result;
    options;
    @Output() onInclude = new EventEmitter();

    constructor(http: HttpClient) {
        this.http  = http;
    }

    @Input('content') set content(aContent) {
        this._content = aContent || "";
        this.result = "";
        this.options = [];
    }

    get content(){
        return this._content;
    }

    executeQuery(){
        const query = config.annotations.baseURL + config.annotations.contentURL + this._content;

        this.result = "";
        this.options = [];
        let uberonOptions = [];

        this.http.get(query).subscribe(res => {
            this.result = JSON.stringify(res);
            res::values().forEach(obj => {
                let term = obj.token.terms?.length > 0? " " + obj.token.terms[0]: ""
                uberonOptions.push({"id": obj.token.id, "name": obj.token.id + term, "disabled": true});
            });
            this.options = uberonOptions;
        });
    }

    updateOptions(options){
        this.options = options;
    }

    print = JSON.stringify;
}

@NgModule({
    imports: [CommonModule, HttpClientModule, CheckboxFilterModule],
    declarations: [UberonOptionsBar],
    exports: [UberonOptionsBar]
})
export class UberonOptionsModule {}
