import {NgModule, Component, Input, Output, EventEmitter} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {
    MatFormFieldModule, MatTooltipModule, MatDialogModule, MatDialog, MatTableModule
} from '@angular/material';
import {getClassName, schemaClassModels} from '../../model/index.js';
import {FieldEditorDialog} from './fieldEditorDialog';

@Component({
    selector: 'fieldTableEditor',
    template: `
    `,
    styles: [`
        .full-width {
          width: 100%;
        }
    `]
})
/**
 * The class to edit a resource field
 */
export class FieldTableEditor {
    _spec;
    objectKeys = Object.keys;
    dialog: MatDialog;

    @Input() expanded = false;
    @Input() label;
    @Input() value;
    @Input('spec') set spec(newSpec){
        this._spec = newSpec;
        let clsName = getClassName(this._spec);
    }

    @Input() disabled = false;

    @Output() onValueChange = new EventEmitter();

    constructor(dialog: MatDialog) {
        this.dialog = dialog;
    }

    get spec(){
        return this._spec;
    }

    print = JSON.stringify;
}

@NgModule({
    imports: [FormsModule, BrowserAnimationsModule, MatExpansionModule, MatDividerModule, MatFormFieldModule, MatInputModule,
        MatCheckboxModule, MatCardModule, MatTooltipModule, MatDialogModule, MatSelectModule],
    declarations: [FieldTableEditor],
    entryComponents: [FieldEditorDialog],
    exports: [FieldTableEditor]
})
export class FieldTableEditorModule {
}