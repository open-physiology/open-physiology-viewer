import {NgModule, Component, Input, ChangeDetectionStrategy} from '@angular/core';
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
    changeDetection: ChangeDetectionStrategy.Default,
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
                                <section class="full-width">
                                    <section class="w3-half">
                                        {{scaffoldResource.id}} - {{scaffoldResource.name || "?"}}
                                    </section>
                                    <section class="w3-half"> 
                                        <mat-select
                                                placeholder="resource"
                                                [value]="value"
                                                (selectionChange)="updateValue($event.value, scaffoldResource, field[0])">
                                            <mat-option *ngFor="let option of selectOptions(field[0])" [value]="option">
                                                {{option? option.id + " - " + (option.name || "?"): ""}}
                                            </mat-option>
                                        </mat-select>
                                    </section>
                                </section>
                            </mat-list-item>
                        </mat-nav-list>                        
                    </mat-card>
                </mat-tab>
            </mat-tab-group>                       
        </mat-card>
    `,
    styles: [`
        .full-width {
            width: 100%;
        } 
    `]
})
export class LayoutEditor {
    _relationshipFields = [];
    _activeScaffold;
    _relatedFields = {
        [$Field.anchors]: [$Field.nodes],
        [$Field.wires]  : [$Field.chains],
        [$Field.regions]: [$Field.groups, $Field.chains]
    };

    _resourceRelationships = {
        [$Field.anchors]: $Field.anchoredTo,
        [$Field.wires]  : $Field.wiredTo,
        [$Field.regions]: $Field.hostedBy
    };

    _scaffoldRelationships = {
        [$Field.anchors]: $Field.anchoredNode,
        [$Field.wires]  : $Field.wiredChain,
        [$Field.regions]: $Field.hostedGroup
    };

    @Input() resource;
    @Input() _modelClasses;
    @Input() modelResources;

    @Input('modelClasses') set modelClasses(newValue) {
        this._modelClasses = newValue;
        this._relationshipFields = this._modelClasses.Component.Model.schema.properties::entries().filter(([key, spec]) => !spec.readOnly && !spec.advanced);
    }

    get modelClasses() {
        return this._modelClasses;
    }

    selectOptions(fieldName){
        let res = [null];
        (this._relatedFields[fieldName] || []).forEach(prop => {
            if (this.resource[prop]) {
                res.push(...this.resource[prop]);
            }
        });
        return res;
    }

    getCurrentValue(scaffoldResource, fieldName){
        let sResource = this.modelResources[scaffoldResource.id];
        if (sResource) {
            return sResource[this._scaffoldRelationships[fieldName]];
        }
        return null;
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

    updateValue(modelResource, scaffoldResource, fieldName){
        let prop = this._resourceRelationships[fieldName];
        let relatedProp = this._scaffoldRelationships[fieldName];
        if (!prop || !relatedProp){
            throw new Error("Unknown resource-scaffold relationship!");
        }
        let sResource = this.modelResources[scaffoldResource.id];
        if (!sResource) {
            throw new Error("Failed to find scaffold resource!");
        }
        if (modelResource == null){
            delete scaffoldResource[relatedProp];
            delete sResource[relatedProp];
        } else {
            sResource[relatedProp] = modelResource;
            scaffoldResource[relatedProp] = modelResource.id;
            modelResource[prop] = scaffoldResource.id;
        }
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