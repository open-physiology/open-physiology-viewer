import {Component, Input, Output, EventEmitter, NgModule} from '@angular/core';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {Observable} from 'rxjs';
import {map, startWith} from 'rxjs/operators';
import {CommonModule} from "@angular/common";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatButtonModule} from '@angular/material/button';
import {COLORS} from "./utils";

@Component({
    selector: 'searchBar',
    template: `

        <div class="search-bar">
            <img src="./styles/images/search.svg"/>
            <mat-form-field>
                <input matInput class="w3-input search-input"
                       matTooltip="Describe resource you want to find"
                       type="text"
                       aria-label="Find resource"
                       [value]="selected"
                       [formControl]="_myControl"
                       [matAutocomplete]="auto"
                       (input)="inputChange.emit($event.target.value)"
                >
                <mat-autocomplete #auto="matAutocomplete"
                                  (optionSelected)="this.selectedItemChange.emit($event.option.value)">
                    <mat-option *ngFor="let option of _filteredOptions | async" [value]="option.label"
                                [ngClass]="option.type">
                        {{option.label}}
                    </mat-option>
                </mat-autocomplete>
                <button *ngIf="selected" matSuffix mat-icon-button aria-label="Clear"
                        (click)="selectedItemChange.emit(null)">
                    <i class="fa fa-close"> </i>
                </button>
            </mat-form-field>
        </div>
    `,
    styles: [`
        .search-bar {
            padding: 0 0.625rem 0 0.625rem;
            flex-grow: 1;
            position: relative;
        }

        .search-bar .mat-form-field-should-float .mat-form-field-label {
            display: none !important;
        }

        .search-bar .mat-form-field-label {
            padding-left: 1.625rem;
            top: 1.5em;
            color: ${COLORS.inputPlacholderColor};
        }

        .search-bar .mat-form-field-infix {
            background: ${COLORS.white};
            border: 0.067rem solid ${COLORS.inputBorderColor};
            box-sizing: border-box;
            border-radius: 0.134rem;
            margin: 0;
            height: 1.134rem;
            color: ${COLORS.inputTextColor};
            padding: 0.5rem 2rem 0 2rem;
        }

        .search-bar .mat-focused .mat-form-field-infix {
            outline: none;
            border-color: ${COLORS.toggleActiveBg};
            box-shadow: 0 0 0 2px rgba(97, 61, 176, 0.1);
        }

        .search-bar .mat-form-field {
            display: block;
            width: 100%;
        }

        .search-bar .mat-form-field-underline {
            display: none;
        }

        .search-bar input.mat-input-element {
            background: ${COLORS.white};
            border: 0.067rem solid ${COLORS.inputBorderColor};
            box-sizing: border-box;
            border-radius: 0.134rem;
            margin: 0;
            height: 2.134rem;
            color: ${COLORS.inputTextColor};
            padding: 0 0.534rem 0 1.734rem;
        }

        .search-bar img {
            z-index: 10;
            position: absolute;
            left: 1.150rem;
            top: 50%;
            transform: translateY(-50%);
            color: ${COLORS.inputTextColor};
            font-size: 0.934rem;
        }

        .search-bar img.input-clear {
            right: 0.534rem;
            cursor: pointer;
            left: auto;
        }

        .search-bar .search-input {
            background: ${COLORS.white};
            border: 0.067rem solid ${COLORS.inputBorderColor};
            box-sizing: border-box;
            border-radius: 0.134rem;
            margin: 0;
            display: block;
            width: 100%;
            height: 2.134rem;
            color: ${COLORS.inputTextColor};
            padding: 0 0.534rem 0 1.734rem;
            font-size: 0.75rem;
        }
                
        .search-bar .search-input:focus {
            outline: none;
            border-color: ${COLORS.toggleActiveBg};
            box-shadow: 0 0 0 2px rgba(97, 61, 176, 0.1);
        }

        .search-bar .search-input::placeholder {
            color: ${COLORS.inputPlacholderColor};
        }

        .mat-option {
            padding: 0 0.6rem;
            margin: 2px;
            line-height: 28px;
            height: 28px;
            font-size: 12px;
        }

        .Lyph {
            background-color: ${COLORS.lyph};
        }

        .Template {
            background-color: ${COLORS.template};
        }

        .Material {
            background-color: ${COLORS.material};
        }

        .Link {
            background-color: ${COLORS.link};
        }

        .Node {
            background-color: ${COLORS.node};
        }

        .Wire {
            background-color: ${COLORS.link};
        }

        .Anchor {
            background-color: ${COLORS.node};
        }

        .Region {
            background-color: ${COLORS.region};
        }

        .Coalescence {
            background-color: ${COLORS.coalescence};
        }
    `]
})
/**
 * Search bar component
 */
export class SearchBar {
    _selected;
    _searchOptions;

    @Input('selected') set selected(value) {
        this._selected = value;
        if (!value) {
            this._clearFilter();
        } else {
            this._filter(value);
        }
    };

    @Input('searchOptions') set searchOptions(newOptions) {
        this._searchOptions = newOptions || [];
        this._clearFilter();
    };

    @Output() selectedItemChange = new EventEmitter();
    @Output() inputChange = new EventEmitter();

    _myControl = new FormControl();
    _filteredOptions: Observable<string[]>;

    get searchOptions() {
        return this._searchOptions;
    }

    get selected() {
        return this._selected;
    }

    /**
     * @access private
     */
    ngOnInit() {
        this._clearFilter();
    }

    _clearFilter() {
        this._filteredOptions = this._myControl.valueChanges
            .pipe(
                startWith(''),
                map(value => this._filter(value))
            );
    }

    _filter(name) {
        if (!name) {
            return this.searchOptions || [];
        }
        const filterValue = name.toLowerCase();
        return (this.searchOptions || []).filter(option => option.label && option.label.toLowerCase().includes(filterValue));
    }
}

@NgModule({
    imports: [CommonModule, FormsModule, ReactiveFormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule, MatButtonModule],
    declarations: [SearchBar],
    exports: [SearchBar]
})
export class SearchBarModule {
}
