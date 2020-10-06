import {NgModule, Component, Input} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {
    MatListModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatTabsModule,
    MatSelectModule,
    MatCheckboxModule
} from '@angular/material';

import {$Field} from '../model/utils';
import {entries} from "lodash-bound";

@Component({
    selector: 'layoutEditor',
    template: `
        <mat-card class="w3-white w3-padding-small">
            <mat-card class="w3-padding-small">
                Associate connectivity model resources with scaffold elements to constraint model layout                    
            </mat-card>
            
            <mat-card class="w3-padding-small">
                <mat-form-field>
                    <mat-select
                            placeholder="Select a scaffold"
                            matTooltip="Scaffold"
                            [value]="_activeScaffold"
                            (selectionChange)="selectScaffold($event.value)">
                        <mat-option *ngFor="let scaffold of resource.scaffolds" [value]="scaffold">
                            {{scaffold.id}} - {{scaffold.name ||"?"}}
                        </mat-option>
                    </mat-select>
                </mat-form-field>
                
                <button [disabled]="!_activeScaffold"  title="Remove scaffold"
                        class="w3-hover-light-grey"
                        (click)="removeScaffold()">
                    <i class="fa fa-trash">
                    </i>
                </button>

                <mat-checkbox class= "w3-margin-left" 
                              [disabled]="!_activeScaffold"
                              matTooltip="Include prefix to scaffold resource reference"
                              labelPosition="before"
                              [checked]="_includePrefix"
                              (change)="togglePrefix($event.checked)">
                    Include prefix
                </mat-checkbox>
                
                
            </mat-card>

            <mat-tab-group animationDuration="0ms">
                <mat-tab *ngFor="let field of _relationshipFields">
                    <ng-template mat-tab-label>
                            <span [matTooltip]="field[1]?.description">
                                {{field[0]}}                                    
                            </span>
                    </ng-template>

                    <mat-card *ngIf="!!_activeScaffold" class="w3-card">
                        <mat-nav-list id="scaffoldResources">
                            <mat-list-item *ngFor="let scaffoldResource of _activeScaffold[field[0]]">
                                <span class="w3-row">
                                    <section class="w3-half">
                                        {{scaffoldResource.id}} - {{scaffoldResource.name || "?"}}
                                    </section>
                                    <section class="w3-half">
                                        Options...
                                    </section>
                                </span>
                            </mat-list-item>
                        </mat-nav-list>
                        
                    </mat-card>
                </mat-tab>
            </mat-tab-group>
            
            
        </mat-card>
    `,
    styles: [`      
        
    `]
})
export class LayoutEditor {
    _relationshipFields = [];
    _activeScaffold;
    _relatedFields = {
        [$Field.anchors]: [$Field.nodes],
        [$Field.wires]  : [$Field.links, $Field.chains],
        [$Field.regions]: [$Field.group]
    };
    _includePrefix = true;

    @Input() resource;
    @Input() _modelClasses;

    @Input('modelClasses') set modelClasses(newValue) {
        this._modelClasses = newValue;
        this._relationshipFields = this._modelClasses.Component.Model.schema.properties::entries().filter(([key, spec]) => !spec.readOnly);
    }

    get modelClasses() {
        return this._modelClasses;
    }

    getRelatedField(fieldName){
        return this._relatedFields[fieldName];
        //TODO mapping options
    }

    removeScaffold(){
        if (!this._activeScaffold){
            throw new Error("Scaffold is not selected!");
        }
        let pos = this.resource.scaffolds.indexOf(x => x.id === this._activeScaffold.id);
        if (pos > -1){
            this.resource.scaffolds.splice(pos, 1);
            this._activeScaffold = null;
        } else {
            throw new Error("Failed to find the requested scaffold!");
        }
    }

    togglePrefix(){
        this._includePrefix = !this._includePrefix;

    }

    selectScaffold(scaffold){
        this._activeScaffold = scaffold;

    }
}

@NgModule({
    imports: [FormsModule, BrowserAnimationsModule,
        MatListModule, MatDividerModule, MatFormFieldModule, MatInputModule, MatDialogModule, MatTooltipModule,
        MatCardModule, MatIconModule, MatListModule, MatCheckboxModule, MatTabsModule, MatSelectModule],
    declarations: [LayoutEditor],
    exports: [LayoutEditor]
})
export class LayoutEditorModule {
}