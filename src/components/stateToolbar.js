import {Component, Output, EventEmitter, Input, NgModule} from '@angular/core';

import {MatDialogModule} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";

@Component({
    selector: 'state-toolbar',
    template: `
       <section class="w3-bar w3-light-grey w3-bottom state-toolbar" title="Snapshot state">
           <button id="backwardBtn" [disabled]="disablePrev" class="w3-bar-item" (click)="previousState()" title="Previous state">
                <i class="fa fa-step-backward"> </i> 
           </button> 
           <span class="w3-bar-item">
               {{currentState}} / {{total}} 
           </span>
           <button id="forwardBtn" [disabled]="disableNext" class="w3-bar-item" (click)="nextState()" title="Next state">
                <i class="fa fa-step-forward"> </i> 
           </button> 
           <button id="addBtn" class="w3-bar-item w3-hover-light-grey" (click)="addState()" title="Add state">
                <i class="fa fa-photo"> </i> 
           </button> 
           <button id="deleteBtn" class="w3-bar-item w3-hover-light-grey" (click)="deleteState()" title="Delete state">
                <i class="fa fa-trash"> </i> 
           </button> 
           <button id="resetBtn" [disabled]="!unsavedState" class="w3-bar-item w3-hover-light-grey" (click)="homeState()" title="Reset to last unsaved state">
                <i class="fa fa-stop"> </i> 
           </button> 
        </section>
    `, styles: [`
        .state-toolbar{
            width : 300px; 
            margin-left: 150px;
        }
	`]
})
export class StateToolbar {
    @Input() activeIndex = -1;
    @Input() total = 0;
    @Input() unsavedState = false;

    @Output() onAddState         = new EventEmitter();
    @Output() onDeleteState      = new EventEmitter();
    @Output() onHomeState        = new EventEmitter();
    @Output() onPreviousState    = new EventEmitter();
    @Output() onNextState        = new EventEmitter();

    addState(){
        this.onAddState.emit();
    }

    previousState(){
        this.onPreviousState.emit();
    }

    nextState(){
        this.onNextState.emit();
    }

    homeState(){
        this.onHomeState.emit();
    }

    deleteState(){
        this.onDeleteState.emit();
    }

    get currentState(){
        return this.activeIndex + 1;
    }

    get disablePrev(){
        return this.activeIndex <= 0;
    }

    get disableNext(){
        return this.total === 0 || this.activeIndex === this.total - 1;
    }

}
@NgModule({
    imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule],
    declarations: [StateToolbar],
    exports: [StateToolbar]
})
export class StateToolbarModule {
}
