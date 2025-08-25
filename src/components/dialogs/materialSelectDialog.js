import {Component, Inject, NgModule} from '@angular/core';
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatDialogRef, MAT_DIALOG_DATA, MatDialogModule} from '@angular/material/dialog';
import {MatSelectModule} from '@angular/material/select';
import {keys, values, entries, isObject} from 'lodash-bound';
import {MatButtonModule} from '@angular/material/button';
import {MatTooltipModule} from "@angular/material/tooltip";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {COLORS} from "../utils/colors";

@Component({
    selector: 'materialModDialog',
    template: `
        <h1 mat-dialog-title>Replace materials in lyph templates</h1>
        <div mat-dialog-content>
            <div *ngFor="let lyphID of lyphs">
                <button class="w3-hover-pale-red w3-hover-border-grey list-node"
                        [matTooltip]="data?.entitiesByID[lyphID].name"
                        [ngClass]="{
                               'selected'    : lyphID === selectedLyphID,
                               'lyph'        : data?.entitiesByID[lyphID]._class === 'Lyph',
                               'template'    : data?.entitiesByID[lyphID]._class === 'Template',
                               'undefined'   : !data || !data.entitiesByID[lyphID]}"
                        (click)="selectLyph(lyphID)">
                    {{data?.entitiesByID[lyphID].name || lyphID}}
                </button>
            </div>
            <div *ngFor="let ontoTerm of data.levelOntologyTerms">
                {{ontoTerm}}
                <div *ngFor="let material of materials">
                    <div class="w3-row">
                        <div class="w3-half w3-right-align w3-padding"> 
                             <button class="w3-hover-pale-red w3-hover-border-grey list-node material"
                                     [matTooltip]="material.id">
                                 {{material.name || material.id}}
                             </button>
                        </div>
                        <mat-form-field *ngIf="materialOptions[material.id] && materialOptions[material.id].length > 0"
                                        class="w3-half">
                            <mat-select
                                    placeholder="Select material"
                                    matTooltip="Material"
                                    (selectionChange)="selectMaterial(selectedLyphID, ontoTerm, material.id, $event.value)">
                                <mat-option
                                        *ngFor="let materialOption of materialOptions[material.id]; let i = index"
                                        [value]="materialOption.id">
                                    {{materialOption.name}} ({{materialOption.id}})
                                </mat-option>
                            </mat-select>
                        </mat-form-field>
                    </div>
                </div>
            </div>
        </div>
        <div mat-dialog-actions align="end">
            <button mat-button (click)="onNoClick()">Cancel</button>
            <button mat-button [mat-dialog-close]="response" cdkFocusInitial>OK</button>
        </div>
    `,
    styles: [`
        .full-width {
            width: 100%;
        }
        
         .title {
            font-size: 0.8rem;
            font-weight: bold;
            line-height: 0.934rem;
        }

        .list-node {
            border: 0.067rem solid ${COLORS.border};
        }

        .lyph {
            background-color: ${COLORS.lyph};
        }

        .material {
            background-color: ${COLORS.material};
        }

        .template {
            background-color: ${COLORS.template};
        }

        .undefined {
            background-color: ${COLORS.undefined};
            border: 0.067rem solid ${COLORS.border};
        }

        .selected {
            border: 3px solid ${COLORS.selectedBorder};
        }

        .mat-list-item {
            min-height: 2.2em !important;
            height: 2.2em;
        }

        button {
            background: transparent;
            color: ${COLORS.buttonText};
            font-size: 0.75rem;
            font-weight: 500;
            cursor: pointer;
        }
    `]
})
export class MaterialSelectDialog {
    lyphs = [];
    materials = [];

    materialOptions = {};

    selectedLyphID;
    dialogRef;
    data;
    response = {};

    constructor(dialogRef: MatDialogRef, @Inject(MAT_DIALOG_DATA) data) {
        this.dialogRef = dialogRef;
        this.data = data;
        this.lyphs = this.data.materialsByLyphID::keys();
        if (this.lyphs.length === 0) return;
        this.data.materialsByLyphID::entries().forEach(([lyphID, matArray]) => {
            matArray.forEach(material => {
                let materials = (material._inMaterials || []).map(m => m::isObject() ? m : this.data.entitiesByID[m]).filter(x => x);
                materials.forEach(mat => {
                    if (mat.id !== lyphID && !(this.materialOptions[material.id] || []).find(x => x.id === mat.id)) {
                        this.materialOptions[material.id] = this.materialOptions[material.id] || [];
                        this.materialOptions[material.id].push(mat);
                    }
                });
            });
        });
        this.selectedLyphID = this.lyphs[0];
        this.materials = data.materialsByLyphID[this.selectedLyphID] || [];
    }

    selectLyph(lyphID) {
        this.selectedLyphID = lyphID;
        this.materials = this.data.materialsByLyphID[this.selectedLyphID] || [];
    }

    selectMaterial(lyphID, ontoTerm, oldMatID, newMatID) {
        this.response[ontoTerm] = this.response[ontoTerm] || {};
        this.response[ontoTerm][lyphID] = this.response[ontoTerm][lyphID] || {};
        this.response[ontoTerm][lyphID][oldMatID] = newMatID;
    }

    onNoClick() {
        this.dialogRef.close();
    }
}

@NgModule({
    imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
        MatButtonModule, MatTooltipModule, MatCheckboxModule],
    declarations: [MaterialSelectDialog],
    exports: [MaterialSelectDialog]
})
export class MaterialSelectModule {
}