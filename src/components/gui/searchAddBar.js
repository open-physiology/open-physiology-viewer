import {Component, Input, Output, EventEmitter, NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from "@angular/common";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatButtonModule} from '@angular/material/button';
import {MatTooltipModule} from "@angular/material/tooltip";

import {SearchBarModule} from "./searchBar";
import {COLORS} from "../utils/colors";

@Component({
    selector: 'searchAddBar',
    template: `
        <div class="search-add-bar">
            <searchBar [searchOptions]="searchOptions"
                       [selected]="selected"
                       (selectedItemChange)="selectedItemChange.emit($event)">
            </searchBar>
            <button *ngIf="selected" (click)="addSelectedItem.emit(selected)"
                    matTooltip="Add selected item" 
                    class="w3-bar-item w3-hover-light-grey">
                <i class="fa fa-add">
                </i>
            </button>
        </div>
    `,
    styles: [`
        .search-add-bar {
            padding: 0 0 1rem 0; 
            position:relative;
            color: ${COLORS.inputTextColor};
        }
        
        .search-add-bar button {
            position:absolute;
            right:  1.3rem;
            bottom: 0;
        }
    `]
})
/**
 * Search bar component
 */
export class SearchAddBar {
    @Input()  selected;
    @Input()  searchOptions;
    @Output() selectedItemChange = new EventEmitter();
    @Output() addSelectedItem = new EventEmitter();
}

@NgModule({
    imports: [CommonModule, FormsModule, ReactiveFormsModule, MatAutocompleteModule, MatFormFieldModule,
        MatInputModule, MatButtonModule, SearchBarModule, MatTooltipModule],
    declarations: [SearchAddBar],
    exports: [SearchAddBar]
})
export class SearchAddBarModule {
}
