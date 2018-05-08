import {Component, Input, Output, EventEmitter} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {Observable} from 'rxjs/Observable';
import {startWith} from 'rxjs/operators/startWith';
import {map} from 'rxjs/operators/map';

@Component({
  selector: 'selectNameSearchBar',
  template: `<input id="searchBar" type="text" [formControl]="inputTextName" (focus)="showOptions()" (mouseenter)="showOptions()" (mouseenter)="hideOptions()" (focusout)="hideOptions()" [value]="selectedName" />
             <div class="dropDownContent" (mouseenter)="showOptions()" (mouseleave)="hideOptions()">
              <button *ngFor="let option of filterednames | async" (click)="clickName(option)" (mouseenter)="highlightHoveredName(option)" (mouseleave)="unhighlightUnhoveredName(option)">{{option}}</button>
             </div>`,
        styles: [`
              #searchBar{
                width: 100%;
              }
              .dropDownContent button {
                  color: black;
                  padding: 8px;
                  text-decoration: none;
                  display: block;
                  border: none;
                  cursor: pointer;
                  text-align: left;
                  white-space: normal;
                  width: 100%;
              }
              .dropDownContent button:hover {
                  background-color: #cce6ff;
              }`
          ]
})


export class SelectNameSearchBar {
  @Input() namesAvailable;
  @Input() selectedName;

  @Output() unhighlightedByUnhoverEvent = new EventEmitter();
  @Output() highlightedByHoverEvent = new EventEmitter();
  @Output() selectedBySearchEvent = new EventEmitter();

  inputTextName: FormControl = new FormControl();
  filterednames: Observable<string[]>;
  dropDownListDiv;
  allowHide;
  // option = "";

  constructor() {
    this.disableOnHover = false;
  }

  ngOnInit() {
    this.dropDownListDiv = document.getElementsByClassName("dropDownContent")[0];

    this.filterednames = this.inputTextName.valueChanges.pipe(
      startWith(''),
      map(val => this.filter(val))
    );

    this.enableFocusOut();
    this.hideOptions();
  }

  filter(val: string): string[] {
    return this.namesAvailable.filter( name => name.toLowerCase().indexOf(val.toLowerCase()) === 0 );
  }

  clickName( anOption ){
    this.disableOnHover = true;
    this.selectedName = anOption;
    // this.option = anOption;
    this.enableFocusOut();
    this.hideOptions();
    this.selectedBySearchEvent.next( this.selectedName );
  }

  showOptions(){
    this.disableOnHover = false;
    this.dropDownListDiv.classList.remove("hide");
  }

  hideOptions(){
    if (this.allowHide){
      this.dropDownListDiv.classList.add("hide");
    }
  }

  disableFocusOut(){
    this.allowHide = false;
  }

  enableFocusOut(){
    this.allowHide = true;
  }

  highlightHoveredName( hoveredName ){
    if (!this.disableOnHover){
      this.disableFocusOut();
      this.hoveredName = hoveredName;
      this.highlightedByHoverEvent.next( hoveredName );
    }
  }

  unhighlightUnhoveredName( unhoveredName ){
    if (!this.disableOnHover){

      this.enableFocusOut();
      this.unhighlightedByUnhoverEvent.next( unhoveredName );
    }
  }



}
