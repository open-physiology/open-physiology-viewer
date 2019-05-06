import {Component, Inject, NgModule} from '@angular/core';
import {
    MatDialogRef,
    MAT_DIALOG_DATA
} from '@angular/material';
import {CommonModule} from "@angular/common";
import {MatDialogModule} from '@angular/material'

@Component({
    selector: 'logInfoDialog',
    template:`
        <div mat-dialog-content>
            <section *ngFor="let entry of data" class="w3-margin-bottom">
                <section>
                    {{entry.level}} - {{entry.msg}}
                </section>
                <section *ngFor="let param of entry.params">
                    {{toJSON(param)}}
                </section>
            </section>
        </div>
        <div mat-dialog-actions align="end">
            <button mat-button (click)="onNoClick()">Close</button>
<!--
            <button mat-button [mat-dialog-close]="data" cdkFocusInitial>Save</button>
-->
        </div>
    `
})
export class LogInfoDialog {
    dialogRef;
    data;
    toJSON = JSON.stringify;

    constructor( dialogRef: MatDialogRef, @Inject(MAT_DIALOG_DATA) data) {
        this.dialogRef = dialogRef;
        this.data = data;
    }

    onNoClick(){
        this.dialogRef.close();
    }
}

@NgModule({
    imports: [CommonModule, MatDialogModule],
    declarations: [LogInfoDialog],
    exports: [LogInfoDialog]
})
export class LogInfoModule {}