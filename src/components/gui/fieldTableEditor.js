import {NgModule, Component, Input, Output, EventEmitter, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatFormFieldModule, MatTooltipModule, MatDialogModule, MatTableModule
} from '@angular/material';
import {FieldEditorDialog} from './fieldEditorDialog';
import {isArray, isPlainObject} from "lodash-bound";
import {annotations} from "./config";

@Component({
    selector: 'fieldTableEditor',
    template: `
        <table #table2 mat-table [dataSource]="dataSource" matSort>
            <!-- ID Column -->
            <ng-container matColumnDef="id" sticky>
                <th mat-header-cell *matHeaderCellDef mat-sort-header> ID </th>
                <td mat-cell *matCellDef="let element"> {{element?.id}} </td>
            </ng-container>

            <!-- Name Column -->
            <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef mat-sort-header> Name </th>
                <td mat-cell *matCellDef="let element"> {{element?.name}} </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions" stickyEnd>
                <th mat-header-cell *matHeaderCellDef>
                    <section *ngIf="!disabled && (!dataSource || isArray(dataSource))">
                        <button class="w3-hover-light-grey"  title = "Create"
                                (click)="createRelatedResource.emit(table)">
                            <i class="fa fa-plus"></i>
                        </button>
                        <button class="w3-hover-light-grey"  title = "Include" (click)="createRelationship.emit(table)">
                            <i class="fa fa-search-plus">
                            </i>
                        </button>
                        <button *ngIf="showExternal" class="w3-hover-light-grey"  title = "Annotate" (click)="createExternalResource.emit(table)">
                            <i class="fa fa-comment">
                            </i>
                        </button>
                    </section>

                </th>

                <td mat-cell *matCellDef="let element; let i = index;">
                    <button *ngIf="isPlainObject(element)" title = "Edit" class="w3-hover-light-grey" (click) = "editRelatedResource.emit({index: i, table: table})">
                        <i class="fa fa-edit">
                        </i>
                    </button>
                    <button *ngIf="!disabled && !!element" title = "Remove" class="w3-hover-light-grey" (click) = "removeRelationship.emit({index: i, table: table})">
                        <i class="fa fa-trash">
                        </i>
                    </button>
                </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

            <!--<mat-paginator [pageSizeOptions]="[5, 10, 20]" showFirstLastButtons></mat-paginator>-->
        </table>
    `,
    styles: [`
        table {
            width: 100%;
        }
    `]
})
/**
 * The class to edit a resource field
 */
export class FieldTableEditor {
    displayedColumns: string[] = ['id', 'name', 'actions'];

    @ViewChild('table2') table;

    @Input() showExternal = false;
    @Input() dataSource;
    @Input() disabled = false;

    @Output() removeRelationship = new EventEmitter();
    @Output() editRelatedResource = new EventEmitter();
    @Output() createRelatedResource = new EventEmitter();
    @Output() createRelationship = new EventEmitter();
    @Output() createExternalResource = new EventEmitter();

    print = JSON.stringify;

    // noinspection JSMethodCanBeStatic
    isPlainObject(value){
        return value::isPlainObject();
    }

    // noinspection JSMethodCanBeStatic
    isArray(value){
        return value::isArray();
    }


}

@NgModule({
    imports: [FormsModule, BrowserAnimationsModule, MatFormFieldModule,
        MatTooltipModule, MatDialogModule, MatTableModule],
    declarations: [FieldTableEditor],
    entryComponents: [FieldEditorDialog],
    exports: [FieldTableEditor]
})
export class FieldTableEditorModule {
}