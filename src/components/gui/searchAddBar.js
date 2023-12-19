import {Component, Input, Output, EventEmitter, NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from "@angular/common";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatButtonModule} from '@angular/material/button';
import {MatTooltipModule} from "@angular/material/tooltip";
import {SearchBarModule} from "./searchBar";
import {COLORS} from "./utils";

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
                    class="w3-right w3-hover-light-grey">
                <i class="fa fa-add">
                </i>
            </button>
        </div>
    `,
    styles: [`
        .search-add-bar {
            padding: 0 1.067rem 2rem 0; 
            font-size: 0.75rem;
            color: ${COLORS.inputTextColor};
        }

        .search-add-bar button {
          border: ${COLORS.inputBorderColor} 1px solid;
          background: transparent;
          color:  ${COLORS.inputTextColor};
          font-size: 0.75rem;
          padding: 0.313rem 0.625rem;
          cursor: pointer;
        }
        
        .search-add-bar button:hover {
          background: transparent !important;
          color:  ${COLORS.inputTextColor} !important;
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
