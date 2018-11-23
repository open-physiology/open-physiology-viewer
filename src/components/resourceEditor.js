import {NgModule, Component, Input, Output, EventEmitter} from '@angular/core';
import {FormControl, FormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatExpansionModule, MatDividerModule, MatFormFieldModule, MatInputModule} from '@angular/material';

@Component({
    selector: 'resourceEditor',
    template: `
        <mat-expansion-panel>
            <mat-expansion-panel-header>
                <mat-panel-title>
                    {{entity?.class}}: {{entity?.id? entity.id: ""}}  {{entity?.name? entity.name: ""}} 
                </mat-panel-title>
            </mat-expansion-panel-header>
        
                <section *ngFor="let property of entity.constructor.Model.cudProperties">
                    <mat-form-field *ngIf="_isInputType(property[1])">
                        <input matInput [placeholder]= "property[0]"
                               [type]  = "_getMatInputType(property[1])"
                               [ngModel] = "entity[property[0]]"
                        >
                    </mat-form-field>
                    <label *ngIf="!_isInputType(property[1])">
                        {{property[0]}}
                    </label>
                </section>
                
                <mat-divider></mat-divider>
    
                <section *ngFor="let relation of entity.constructor.Model.cudRelationships">
                    <label>{{relation[0]}}: </label>
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
    _entity;
    @Input() modelClasses;
    @Input() readonly = true;

    //_myControl = new FormControl();

    @Input('entity') set entity(newentity) {
        this._entity = newentity;
    }

    get entity(){
        return this._entity;
    }

    _isInputType(spec){
        return spec.type === 'number' || spec.type  === 'string' ;
    }

    _getMatInputType(spec){
        if (spec.type === "number") { return "number"; }
        return "text";
    }
}

@NgModule({
    imports: [FormsModule, BrowserAnimationsModule,
        MatExpansionModule, MatDividerModule, MatFormFieldModule, MatInputModule],
    declarations: [ResourceEditor],
    exports: [ResourceEditor]
})
export class ResourceEditorModule {


}