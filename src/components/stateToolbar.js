import {Component, Output, EventEmitter, Input, NgModule} from '@angular/core';

import {MatDialogModule} from '@angular/material/dialog';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";

@Component({
    selector: 'state-toolbar',
    template: `
       <section class="w3-bar w3-light-grey w3-bottom state-toolbar" title="Snapshot model">
           <button id="backwardBtn" class="" (click)="previousState()" title="Next saved state">
                <i class="fa fa-step-backward"> </i> 
           </button> 
           <span class="">
               {{activeIndex + 1}} / {{total}} 
           </span>
           <button id="forwardBtn" class="" (click)="nextState()" title="Previous saved state">
                <i class="fa fa-step-forward"> </i> 
           </button> 
           <button id="addBtn" class="w3-bar-item w3-hover-light-grey" (click)="addState()" title="Add model state">
                <i class="fa fa-photo"> </i> 
           </button> 
           <button id="deleteBtn" class="w3-bar-item w3-hover-light-grey" (click)="deleteState()" title="Add model state">
                <i class="fa fa-trash"> </i> 
           </button> 
           <button id="replaceBtn" class="w3-bar-item w3-hover-light-grey" (click)="updateState()" title="Add model state">
                <i class="fa fa-recycle"> </i> 
           </button> 
        </section>
    `, styles: [`
        .state-toolbar{
            width : 300px; 
        }
	`]
})
export class StateToolbar {
    @Input() activeIndex = -1;
    @Input() total = 0;

    @Output() onAddState         = new EventEmitter();
    @Output() onDeleteState      = new EventEmitter();
    @Output() onUpdateState      = new EventEmitter();
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

    updateState(){
        this.onUpdateState.emit();
    }

    deleteState(){
        this.onDeleteState.emit();
    }
}
@NgModule({
    imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule],
    declarations: [StateToolbar],
    exports: [StateToolbar]
})
export class StateToolbarModule {
}
