import {NgModule, Component, Input, Output, EventEmitter, ViewChild, ElementRef} from '@angular/core';
import {MatMenuModule, MatMenuTrigger} from "@angular/material/menu";
import {CommonModule} from "@angular/common";
import {ResourceDeclarationModule, COLORS} from "./gui/resourceDeclarationEditor";
import {SearchBarModule} from "./gui/searchBar";
import {MatButtonModule} from '@angular/material/button';
import {MatDividerModule} from "@angular/material/divider";


@Component({
    selector: 'lyphEditor',
    template: `
        <section #lyphEditorD3 id="lyphEditorD3" class="w3-row">
        </section>
    `,
    styles: [`
    `]
})
/**
 * @class
 * @property entitiesByID
 */
export class LyphEditorComponent {
}

@NgModule({
    imports: [CommonModule, MatMenuModule, ResourceDeclarationModule, SearchBarModule, MatButtonModule, MatDividerModule],
    declarations: [LyphEditorComponent],
    exports: [LyphEditorComponent]
})
export class LyphEditorModule {
}

