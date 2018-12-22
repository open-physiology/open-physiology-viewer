import {NgModule, Component, Input, Output, EventEmitter, Inject} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatExpansionModule, MatDividerModule, MatFormFieldModule, MatInputModule, MatCheckboxModule,
    MatCardModule, MatDialogModule,  MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';
import {ResourceInfoModule} from "./gui/resourceInfo";
import {FieldEditorModule} from "./gui/fieldEditor";
import {ResourceNewDialog} from "./gui/resourceNewDialog";

@Component({
    selector: 'resourceEditor',
    template: `

        <mat-expansion-panel>
            <mat-expansion-panel-header>
                <mat-panel-title>
                    {{resource?.class}}: {{resource?.id ? resource.id : ""}} {{resource?.name ? resource.name : ""}}
                </mat-panel-title>
            </mat-expansion-panel-header>

            <mat-card class="w3-margin w3-grey">
                <section *ngFor="let field of _propertyFields">
                    <fieldEditor
                            [value] = "resource[field[0]]"
                            [spec]  = "field[1]"
                            [label] = "field[0]" 
                            (onValueChange)="onValueChange($event)">
                    </fieldEditor>
                </section>
            </mat-card>
            <mat-card class="w3-margin w3-grey">
                <mat-expansion-panel *ngFor="let field of _relationshipFields" class="w3-margin-bottom">
                    <mat-expansion-panel-header>
                        <mat-panel-title>
                            {{field[0]}}
                        </mat-panel-title>
                    </mat-expansion-panel-header>

                    <section *ngFor="let other of resource[field[0]]">
                        {{other.id}} - {{other.name? other.name: "?"}}
                        <mat-action-row>
                            <button class="w3-hover-light-grey">
                                <i class="fa fa-edit"></i>
                            </button>
                            <button class="w3-hover-light-grey">
                                <i class="fa fa-trash"></i>
                            </button>
                        </mat-action-row>
                    </section>

                    <mat-action-row>
                        <button class="w3-hover-light-grey">
                            <i class="fa fa-plus"></i>
                        </button>
                    </mat-action-row>

                </mat-expansion-panel>
            </mat-card>

        </mat-expansion-panel>
    `
})
export class ResourceEditor {
    _resource;
    _className;
    _propertyFields     = [];
    _relationshipFields = [];
    @Input() modelClasses;

    @Input('resource') set resource(newValue) {
        this._resource = newValue;
    }

    @Input('className') set className(newValue) {
        this._className = newValue;
        if (this.modelClasses){
            this._propertyFields     = this.modelClasses[this._className].Model.cudProperties;
            this._relationshipFields = this.modelClasses[this._className].Model.cudRelationships;
        }
    }

    get resource(){
        return this._resource;
    }

    onValueChange(newValue){
    }

    constructor(dialog: MatDialog) {}

    openDialog(): void {
        const dialogRef = this.dialog.open(ResourceNewDialog, {
            width: '25%',
            data: {className: this.name, animal: this.animal}
        });

    dialogRef.afterClosed().subscribe(result => {
        console.log('The dialog was closed');
        this.animal = result;
    });
    }


}

@NgModule({
    imports: [FormsModule, BrowserAnimationsModule, ResourceInfoModule,
        MatExpansionModule, MatDividerModule, MatFormFieldModule, MatInputModule, MatDialogModule,
        MatCheckboxModule, MatCardModule, FieldEditorModule],
    declarations: [ResourceEditor],
    exports: [ResourceEditor]
})
export class ResourceEditorModule {

}