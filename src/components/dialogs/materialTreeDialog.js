import {Component, Inject, NgModule} from '@angular/core';
import {CommonModule} from "@angular/common";
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MaterialGraphViewerModule} from "../editors/materialGraphViewer";

@Component({
    selector: 'materialTreeDialog',
    template: `
        <div class="w3-right">
            <button mat-icon-button (click)="onNoClick()">
                <i class="fa fa-window-close"> </i>
            </button>
        </div>
        <b mat-dialog-title>{{data?.title}}</b>
        <div mat-dialog-content class="content">
            <ng-container *ngIf="roots && roots.length > 0; else noData">
                <div class="graph" *ngFor="let root of roots">
                    <materialGraphViewer [rootNode]="root" (onNodeSelect)="onSelect($event)"></materialGraphViewer>
                </div>
            </ng-container>
            <ng-template #noData>
                <div class="w3-small">No materials found.</div>
            </ng-template>
        </div>
        <div mat-dialog-actions align="end">
            <button mat-button (click)="onNoClick()">Close</button>
        </div>
    `,
    styles: [`
        .content {
            max-height: 65vh;
            overflow-y: auto;
            overflow-x: hidden;
        }
        .graph {
            width: 100%;
            min-height: 400px;
            margin-bottom: 16px;
            border: 1px solid #ddd;
            box-sizing: border-box;
        }
        /* Ensure the embedded MaterialGraphViewer fits horizontally and doesn't force full viewport height */
        :host ::ng-deep materialGraphViewer #materialGraphViewer {
            height: 60vh;
            overflow-x: auto;
            overflow-y: auto;
        }
    `]
})
export class MaterialTreeDialog {
    dialogRef;
    data;
    roots = [];

    constructor(dialogRef: MatDialogRef, @Inject(MAT_DIALOG_DATA) data) {
        this.dialogRef = dialogRef;
        this.data = data;
        const normalize = (node) => {
            if (!node) return undefined;
            const res = {...node};
            res.label = node.label || node.name || node.id;
            if (node.children && node.children.length > 0) {
                res.children = node.children.map(normalize).filter(x => x);
            }
            return res;
        };
        const inputRoots = (data && data.roots) ? data.roots : [];
        this.roots = inputRoots.map(normalize).filter(x => x);
    }

    onSelect(nodeId){
        // Reserved for future interactions (e.g., highlight in scene)
    }

    onNoClick() {
        this.dialogRef.close();
    }
}

@NgModule({
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MaterialGraphViewerModule],
    declarations: [MaterialTreeDialog],
    exports: [MaterialTreeDialog]
})
export class MaterialTreeDialogModule {}
