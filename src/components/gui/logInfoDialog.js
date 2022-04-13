import {Component, Inject, NgModule} from '@angular/core';
import {CommonModule} from "@angular/common";
import {MatDialogRef,MAT_DIALOG_DATA,MatDialogModule} from '@angular/material/dialog';
import {MatCheckboxModule} from "@angular/material/checkbox";

const LEVEL = {
    INFO  : "Info",
    WARN  : "Warn",
    ERROR : "Error"
};

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'levelFilterPipe',
    pure: false
})
export class LevelFilterPipe implements PipeTransform {
    transform(items, filter): any {
        if (!items || !filter) {
            return items;
        }
        return items.filter(item => filter[item.level]);
    }
}

@Component({
    selector: 'logInfoDialog',
    template:`
        <section mat-dialog-title class="w3-bar w3-light-gray w3-right-align">
            <span class="w3-margin-right" *ngFor="let level of levelFilters | keyvalue: originalOrder">
                <span [class]="msgTextColor(level.key)">
                    <mat-checkbox matTooltip="Filter messages" labelPosition="after" class="w3-margin-left"
                                  [checked] = "level.value"
                                  (change)  = "toggleLevel(level.key)"> 
                        {{level.key}}
                    </mat-checkbox>
                </span>    
            </span>
        </section>
        <div mat-dialog-content>
            <section *ngFor="let entry of data | levelFilterPipe: levelFilters" class="w3-margin-bottom">
                <section [class]="msgTextColor(entry.level)">
                    {{entry.msg}}
                </section>
                <section *ngFor="let param of entry.params">
                    {{print(param)}}
                </section>
            </section>
        </div>
        <div mat-dialog-actions align="end">
            <button mat-button (click)="onNoClick()">Close</button>
            <button mat-button [mat-dialog-close]="data" cdkFocusInitial>Save</button>
        </div>
    `,
    styles: [`
        .mat-dialog-title {
            font-size: 14px;
        }`
    ]
})
export class LogInfoDialog {
    dialogRef;
    data;
    levelFilters = {
        [LEVEL.INFO]: true,
        [LEVEL.WARN]: true,
        [LEVEL.ERROR]: true
    }
    print = JSON.stringify;

    constructor( dialogRef: MatDialogRef, @Inject(MAT_DIALOG_DATA) data) {
        this.dialogRef = dialogRef;
        this.data = data;
    }

    onNoClick(){
        this.dialogRef.close();
    }

    msgTextColor(level){
        return (level === LEVEL.WARN)? "w3-text-orange" : (level === LEVEL.ERROR)? "w3-text-red" : "w3-text-blue";
    }

    originalOrder(a, b) {
      return 0;
    }

    toggleLevel(level){
        this.levelFilters[level] = !this.levelFilters[level];
    }
}

@NgModule({
    imports: [CommonModule, MatDialogModule, MatCheckboxModule],
    declarations: [LogInfoDialog, LevelFilterPipe],
    exports: [LogInfoDialog]
})
export class LogInfoModule {}