import {Component, Input, Output, EventEmitter} from '@angular/core';
import {FormControl} from '@angular/forms';
import {Observable} from 'rxjs/Observable';
import {startWith} from 'rxjs/operators/startWith';
import {map} from 'rxjs/operators/map';

@Component({
  selector: 'selectNameSearchBar',
  template: `<input id="searchBar" type="text" [formControl]="inputTextName" (click)="showOptions()"
                    (focus)="showOptions()" (mouseenter)="showOptions()" (mouseenter)="hideOptions()"
                    (focusout)="hideOptions()" [value]="selectedName"/>
  <div id="dropDownContent" (mouseenter)="showOptions()" (mouseleave)="hideOptions()">
      <a href="#" *ngFor="let option of filteredNames | async" (click)="clickName(option)"
         (mouseenter)="highlightHoveredName(option)" (mouseleave)="unhighlightUnhoveredName(option)" title="{{option}}">{{option}}</a><br/>
  </div>`,
        styles: [`
            #searchBar{
              width: 100%;
            }

            #dropDownContent{
              max-height: 500px;
              overflow-x: hidden;
              overflow-y: scroll;
              z-index: 10;
            }

            #dropDownContent a {
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

            #dropDownContent a:hover {
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
  filteredNames: Observable<string[]>;
  dropDownListDiv;
  allowHide;

  constructor() {
    this.disableOnHover = false;
  }

  ngOnInit() {
    this.dropDownListDiv = document.getElementById("dropDownContent");

    this.filteredNames = this.inputTextName.valueChanges.pipe(
      startWith(''),
      map(val => this.filter(val))
    );

    this.enableFocusOut();
    this.hideOptions();
  }

  filter(val: string): string[] {
    let indexedWordPos;

    // Search for any word beginning with that.
    return this.namesAvailable.filter( name =>
      {
        indexedWordPos = name.toLowerCase().indexOf(val.toLowerCase());
        if (indexedWordPos >= 0){
          return name;
        }
      }).sort();
  }

  clickName( anOption ){
    this.disableOnHover = true;
    this.selectedName = anOption;
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
