import {Component, Input, Output, EventEmitter} from '@angular/core';

@Component({
    selector: 'lyphTreeViewControls',
    template: `
        <button *ngIf="ordered && showUp" class="control-btn" [attr.aria-label]="'Up ' + label" (click)="onBtnClick.emit('up')">
          <i class="fa fa-arrow-up"> </i>
        </button>
        <button *ngIf="ordered && showDown" class="control-btn" [attr.aria-label]="'Down ' + label" (click)="onBtnClick.emit('down')">
          <i class="fa fa-arrow-down"> </i>
        </button>
        <button *ngIf="editable" class="control-btn" [attr.aria-label]="'Delete ' + label" (click)="onBtnClick.emit('delete')">
          <i class="fa fa-trash-can"> </i>
        </button>
        <button *ngIf="editable" class="control-btn" [attr.aria-label]="'Insert above ' + label" (click)="onBtnClick.emit('insert')">
          <i class="fa fa-plus"> </i>
        </button> 
    `,
    styles: [`
        button {
          background: transparent;
          color:  #797979;
          font-size: 0.75rem;
          font-weight: 500;
          padding: 0.313rem 0.625rem;
          margin: 0.625rem 0 0;
          cursor: pointer;
        }

        .control-btn {
           border: none;
           padding: 0.313rem;
           margin: 0;
        }
    `]
})
export class LyphTreeViewControls {
    @Input() label;
    @Input() editable;
    @Input() ordered;
    @Input() showUp = true;
    @Input() showDown = true;
    @Output() onBtnClick = new EventEmitter();
}

