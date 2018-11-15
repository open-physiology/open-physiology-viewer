import {NgModule, Component} from '@angular/core';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatExpansionModule} from '@angular/material/expansion';

@Component({
    selector: 'resourceEditor',
    template: `
        <mat-expansion-panel>
            <mat-expansion-panel-header>
                <mat-panel-title>
                    {{model.id}}: {{model.name}} {{model.class}}
                </mat-panel-title>
                <mat-panel-description>
                    This is a summary of the content
                </mat-panel-description>
            </mat-expansion-panel-header>

            <p>This is the primary content of the panel.</p>

            <mat-action-row>
                <button mat-button>Click me</button>
            </mat-action-row>

        </mat-expansion-panel>
    `
})
export class ResourceEditor {
    @Input() model;
    @Input() readonly = true;
}

@NgModule({
    imports: [BrowserAnimationsModule, MatExpansionModule],
    declarations: [],
    exports: [ResourceEditor]
})
export class ResourceEditorModule {
}