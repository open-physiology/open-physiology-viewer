import {Component, Inject, NgModule} from '@angular/core';
import {CommonModule} from "@angular/common";
import {MatDialogRef,MAT_DIALOG_DATA,MatDialogModule} from '@angular/material/dialog';
import {MatCheckboxModule} from "@angular/material/checkbox";
import { InlineDiffComponent } from 'ngx-diff';
import { FormsModule } from '@angular/forms';


@Component({
    selector: 'diffDialog',
    template:`
        <div mat-dialog-content>
            <inline-diff [oldText]="data.oldContent" [newText]="data.newContent" [lineContextSize]="4">
            </inline-diff>
            <div *ngIf="data && data.askCommitMessage" style="margin-top: 12px;">
                <label for="commitMsg"><b>Commit message (optional):</b></label>
                <textarea id="commitMsg" [(ngModel)]="commitMessage" rows="3" style="width: 100%;"></textarea>
            </div>
        </div>
        <div mat-dialog-actions align="end">
            <button mat-button *ngIf="data && data.askCommitMessage" (click)="cancel()">Cancel</button>
            <button mat-button color="primary" *ngIf="data && data.askCommitMessage" (click)="proceed()">Proceed</button>
            <button mat-button *ngIf="!data || !data.askCommitMessage" (click)="close()">Close</button>
        </div>
    `,
    styles: [`
        .mat-dialog-title {
            font-size: 14px;
        }`
    ]
})
export class DiffDialog {
    dialogRef;
    data = { 'oldContent': "", 'newContent': "", 'askCommitMessage': false, 'defaultMessage': "" };
    commitMessage = "";

    constructor( dialogRef: MatDialogRef, @Inject(MAT_DIALOG_DATA) data) {
        this.dialogRef = dialogRef;
        this.data = data || this.data;
        this.commitMessage = (this.data && this.data.defaultMessage) ? this.data.defaultMessage : "";
    }

    close(){
        this.dialogRef.close();
    }

    cancel(){
        this.dialogRef.close({ proceed: false });
    }

    proceed(){
        this.dialogRef.close({ proceed: true, message: this.commitMessage });
    }
}

@NgModule({
    imports: [CommonModule, FormsModule, MatDialogModule, MatCheckboxModule, InlineDiffComponent],
    declarations: [DiffDialog],
    exports: [DiffDialog]
})
export class DiffModule {}