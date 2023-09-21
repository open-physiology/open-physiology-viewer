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
                       [(ngModel)]="selected"
                       [formControl]="_myControl"
                       [matAutocomplete]="auto"
                       (input)="inputChange.emit($event.target.value)"
                >
                <mat-autocomplete #auto="matAutocomplete"
                                  (optionSelected)="this.selectedItemChange.emit($event.option.value)">
                    <mat-option *ngFor="let option of _filteredOptions | async" [value]="option">
                        {{option}}
                    </mat-option>
                </mat-autocomplete>
                <button *ngIf="selected" matSuffix mat-icon-button aria-label="Clear" (click)="selected=''">
                    <i class="fa fa-close"> </i>
                </button>
            </mat-form-field>
        </div>
    `,
    styles: [`
        .search-bar {
            padding: 1.067rem;
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
            font-size: 0.75rem;
            font-weight: 500;
        }

        .search-bar .mat-form-field-infix {
            background: ${COLORS.white};
            border: 0.067rem solid ${COLORS.inputBorderColor};
            box-sizing: border-box;
            border-radius: 0.134rem;
            margin: 0;
            height: 2.134rem;
            color: ${COLORS.inputTextColor};
            font-weight: 500;
            font-size: 0.8rem;
            line-height: 1.067rem;
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
            font-weight: 500;
            font-size: 0.8rem;
            line-height: 1.067rem;
            padding: 0 0.534rem 0 1.734rem;
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
            font-weight: 500;
            font-size: 0.8rem;
            line-height: 1.067rem;
            padding: 0 0.534rem 0 1.734rem;
        }

        .search-bar img {
            z-index: 10;
            position: absolute;
            left: 1.534rem;
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

        .search-bar .search-input:focus {
            outline: none;
            border-color: ${COLORS.toggleActiveBg};
            box-shadow: 0 0 0 2px rgba(97, 61, 176, 0.1);
        }

        .search-bar .search-input::placeholder {
            color: ${COLORS.inputPlacholderColor};
        }
    `]
})
/**
 * Search bar component
 */
export class SearchBar {
    @Input()  selected;
    @Input()  searchOptions;
    @Output() selectedItemChange = new EventEmitter();
    @Output() inputChange = new EventEmitter();

    _myControl = new FormControl();
    _filteredOptions: Observable<string[]>;

    /**
     * @access private
     */
    ngOnInit() {
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
        return (this.searchOptions || []).filter(option => option && option.toLowerCase().includes(filterValue));
    }
}

@NgModule({
    imports: [CommonModule, FormsModule, ReactiveFormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule, MatButtonModule],
    declarations: [SearchBar],
    exports: [SearchBar]
})
export class SearchBarModule {
}
