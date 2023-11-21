import {Component, Input, Output, EventEmitter, NgModule} from '@angular/core';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {Observable}  from 'rxjs';
import {map, startWith} from 'rxjs/operators';
import {CommonModule} from "@angular/common";
import {MatAutocompleteModule} from "@angular/material/autocomplete";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatButtonModule} from '@angular/material/button';

@Component({
    selector: 'searchBar',
    template: `
        <mat-form-field class="full-width">
            <input matInput class="w3-input"
                   placeholder="Search"
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
    imports: [CommonModule, FormsModule, ReactiveFormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule, MatButtonModule],
    declarations: [SearchBar],
    exports: [SearchBar]
})
export class SearchBarModule {}
