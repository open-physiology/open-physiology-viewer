import {Component, Input, Output, EventEmitter, NgModule} from '@angular/core';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {Observable}  from 'rxjs';
import {map, startWith} from 'rxjs/operators';
import {CommonModule} from "@angular/common";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatIconModule} from "@angular/material/icon";

@Component({
    selector: 'searchBar',
    template: `
        <mat-form-field class="full-width autocomplete">
            <input matInput class="w3-input"
                   placeholder="Search"
                   matTooltip="Describe resource you want to find"
                   type="text"
                   aria-label="Find resource"
                   [value]="selected"
                   [formControl]="_myControl" 
                   [matAutocomplete]="auto"
                   (input)="inputChange.emit($event.target.value)"
                   [(ngModel)]="value"
            >
            <mat-autocomplete #auto="matAutocomplete" class="autocomplete-select"
                (optionSelected)="this.selectedItemChange.emit($event.option.value)">
                <mat-option *ngFor="let option of _filteredOptions | async" [value]="option">
                    {{option}}
                </mat-option>
            </mat-autocomplete>
            <button class="input-clear" type="button" mat-button *ngIf="value" matSuffix mat-icon-button aria-label="Clear" (click)="value = ''">
                <mat-icon><img src="./styles/images/close.svg" /></mat-icon>
            </button>
        </mat-form-field>
    `,
    styles: [`
        .full-width {
          width: 100%;
        }
        .autocomplete .input-clear {
            background: transparent;
            border: 0;
            position: absolute;
            right: 0;
            top: 50%;
            transform: translate(0, -70%);
            cusor: pointer;
        }
        ::ng-deep .autocomplete-select {
            background-color: blue;
        }
        ::ng-deep .autocomplete-select .mat-option {
            font-size: 0.875rem;
            line-height: 2.25rem;
            height: auto;
            background: white !important;
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

    _filter(name){
        const filterValue = name.toLowerCase();
        return this.searchOptions.filter(option => option && option.toLowerCase().includes(filterValue));
    }
}

@NgModule({
    imports: [CommonModule, FormsModule, ReactiveFormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule, MatIconModule],
    declarations: [SearchBar],
    exports: [SearchBar]
})
export class SearchBarModule {}
