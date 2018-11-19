import {NgModule, Component, Input, Output, EventEmitter} from '@angular/core';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatExpansionModule} from '@angular/material/expansion';

@Component({
    selector: 'resourceEditor',
    template: `
        <mat-expansion-panel>
            <mat-expansion-panel-header>
                <mat-panel-title>
                    {{graphData?.class}}: {{graphData?.id? graphData.id: ""}}  {{graphData?.name? graphData.name: ""}} 
                </mat-panel-title>
            </mat-expansion-panel-header>
            
            <section *ngFor="let property of graphData.constructor.Model.properties; let i = index">
                <label>{{property[0]}} </label>
            </section>
            
            <mat-action-row>
                <button class="w3-hover-light-grey">
                    <i class="fa fa-plus"></i>
                </button>
                <button class="w3-hover-light-grey"> 
                    <i class="fa fa-trash"></i> 
                </button>
            </mat-action-row>
        </mat-expansion-panel>
    `
})
export class ResourceEditor {
    _graphData;
    @Input() modelClasses;
    @Input() readonly = true;


    @Input('graphData') set graphData(newGraphData) {
        this._graphData = newGraphData;
    }

    get graphData(){
        return this._graphData;
    }

 }

@NgModule({
    imports: [BrowserAnimationsModule, MatExpansionModule],
    declarations: [ResourceEditor],
    exports: [ResourceEditor]
})
export class ResourceEditorModule {


}