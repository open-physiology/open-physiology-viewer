import {Component, Output, EventEmitter, Input, NgModule} from '@angular/core';

import {MatDialogModule, MatFormFieldModule, MatInputModule} from '@angular/material';
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";

@Component({
    selector: 'state-toolbar',
    template: `
       <section class="w3-bar w3-bottom w3-light-grey" title="Snapshot model">
           <button id="backwardBtn" class="" (click)="previousState()" title="Next saved state">
                <i class="fa fa-step-backward"> </i> 
           </button> 
           <span class="">
               {{activeIndex}} / {{total}} 
           </span>
           <button id="forwardBtn" class="" (click)="nextState()" title="Previous saved state">
                <i class="fa fa-step-forward"> </i> 
           </button> 
        </section>
    `
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

}
@NgModule({
    imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule],
    declarations: [StateToolbar],
    exports: [StateToolbar]
})
export class StateToolbarModule {
}
