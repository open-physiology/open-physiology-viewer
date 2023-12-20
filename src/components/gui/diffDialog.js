import {Component, Inject, NgModule} from '@angular/core';
import {CommonModule} from "@angular/common";
import {MatDialogRef,MAT_DIALOG_DATA,MatDialogModule} from '@angular/material/dialog';
import {MatCheckboxModule} from "@angular/material/checkbox";
import { InlineDiffComponent } from 'ngx-diff';


@Component({
    selector: 'diffDialog',
    template:`
        <div mat-dialog-content>
            <inline-diff [oldText]="data.oldContent" [newText]="data.newContent" [lineContextSize]="4">                
            </inline-diff>
        </div>
        <div mat-dialog-actions align="end">
            <button mat-button (click)="onNoClick()">Close</button>
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
    data = {'oldContent': "", 'newContent': ""};
    print = JSON.stringify;

    constructor( dialogRef: MatDialogRef, @Inject(MAT_DIALOG_DATA) data) {
        this.dialogRef = dialogRef;
        this.data = data;
    }

    onNoClick(){
        this.dialogRef.close();
    }
}

@NgModule({
    imports: [CommonModule, MatDialogModule, MatCheckboxModule, InlineDiffComponent],
    declarations: [DiffDialog],
    exports: [DiffDialog]
})
export class DiffModule {}