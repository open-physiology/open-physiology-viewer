import {Component, Input, Output, EventEmitter} from '@angular/core';
import {FormControl} from '@angular/forms';
import {Observable}  from 'rxjs';
import {map, startWith} from 'rxjs/operators';

@Component({
    selector: 'searchBar',
    template: `
        <mat-form-field class="full-width">
            <input type="text" [value]="selected" class="w3-input" 
                   aria-label="Number" matInput [formControl]="_myControl"
                   [matAutocomplete]="auto">
            <mat-autocomplete #auto="matAutocomplete" (optionSelected)="optionSelected($event)">
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

export class SearchBar {
    @Input()  selected;
    @Input()  searchOptions;
    @Output() selectedItemChange = new EventEmitter();

    _myControl = new FormControl();
    _filteredOptions: Observable<string[]>;

    ngOnInit() {
        this._filteredOptions = this._myControl.valueChanges
            .pipe(
                startWith(''),
                map(value => this._filter(value))
            );
    }

    _filter(name){
        const filterValue = name.toLowerCase();
        return this.searchOptions.filter(option => option.toLowerCase().includes(filterValue));
    }

    optionSelected(event){
       this.selectedItemChange.emit(event.option.value);
    }
}
