import {NgModule, Component, Input, Output, EventEmitter} from '@angular/core';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatExpansionModule} from '@angular/material/expansion';

@Component({
    selector: 'resourceEditor',
    template: `
        <mat-expansion-panel>
            <mat-expansion-panel-header>
                <mat-panel-title>
                    Resource editor
                </mat-panel-title>
            </mat-expansion-panel-header>
            
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
    _model;
    _graphData;
    @Input() modelClasses;
    @Input() readonly = true;

    @Input('model') set model(newModel) {
        this._model = newModel;
    }

    @Input('graphData') set graphData(newGraphData) {
        this._graphData = newGraphData;
    }


 }

@NgModule({
    imports: [BrowserAnimationsModule, MatExpansionModule],
    declarations: [ResourceEditor],
    exports: [ResourceEditor]
})
export class ResourceEditorModule {


}