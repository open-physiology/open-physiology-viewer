import {Component, Input, NgModule} from '@angular/core';
import {CommonModule} from "@angular/common";
import {HttpClient, HttpClientModule} from '@angular/common/http';
import {annotations} from "../../data/config.json";

@Component({
    selector: 'sciGraphSearch',
    template:`
        <div mat-dialog-content>
            <div *ngIf ="query" class="default-boxResult">
                <label> Query </label>
                <span>{{query}}</span>
            </div>
            <div *ngIf="result" class="default-boxResult">
                <label> Response </label>
                <span>{{result}}</span>
            </div>
            <div *ngIf="error" class="default-boxError">
                {{error}}
            </div>
            <div *ngIf="selected" class="default-boxFooter">
                <button [disabled]="error" class="w3-bar-item w3-hover-light-grey"
                        (click)="executeQuery()" title="Find path in the KB">
                    <i class="fa fa-database"> </i>
                </button>
            </div>
        </div>
    `
})
export class ExternalSearchBar {
    _selected;

    query;
    error;
    result;

    constructor(http: HttpClient) {
        this.http  = http;
    }

    @Input('selected') set resource(newSelected) {
        const nameQuery = (sName) => `cypher/execute?cypherQuery=MATCH p=( o { label: "${sName}"})-[r*]-(x) RETURN p`;
        //const idQuery = (id) => `graph/reachablefrom/${id}`;

        this._selected = newSelected;
        this.query = "";
        this.error = "";
        this.result = "";

        if (!this.selected){
            this.error = "No resource is selected!";
        } else {
            if (!this.selected.name){
                this.error = "Selected resource has no name!";
            } else {
                this.query = nameQuery(this.selected.name);
                //this.query = idQuery(this.selected.id);
            }
        }
    }

    get selected(){
        return this._selected;
    }

    executeQuery(){
        if (!this.query){ throw Error ("Query is not defined!"); }
        let url = annotations.baseURL + this.query;

        this.http.get(url).subscribe(res => {
            this.result = JSON.stringify(res);
        })
    }

    print = JSON.stringify;
}

@NgModule({
    imports: [CommonModule, HttpClientModule],
    declarations: [ExternalSearchBar],
    exports: [ExternalSearchBar]
})
export class ExternalSearchModule {}
