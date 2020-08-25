import {Component, Input, Output, EventEmitter, NgModule} from '@angular/core';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {Observable}  from 'rxjs';
import {map, startWith} from 'rxjs/operators';
import {CommonModule} from "@angular/common";
import {MatAutocompleteModule, MatFormFieldModule, MatInputModule} from "@angular/material";

@Component({
    selector: 'searchBar',
    template: `
        <mat-form-field class="full-width">
            <input matInput class="w3-input"
                   placeholder="Search"
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
                <mat-option *ngFor="let option of _filteredOptions | async" [value]="option">
                    {{option}}
                </mat-option>
            </mat-autocomplete>
        </mat-form-field>
    `,
    styles: [`
        .full-width {
          width: 100%;
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
    imports: [CommonModule, FormsModule, ReactiveFormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule],
    declarations: [SearchBar],
    exports: [SearchBar]
})
export class SearchBarModule {}
