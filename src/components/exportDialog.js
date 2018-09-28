import {NgModule, Component, ViewChild, EventEmitter, Input, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {DialogRef, ModalComponent} from 'angular2-modal';

@Component({
    selector: 'modal-window',
    template:`
        <modal #myModal>
            <modal-header [show-close]="true">
                <h4 class="modal-title">Select entities for export</h4>
            </modal-header>
            <modal-body>
                <li *ngFor="let option of _entities; let i = index">
                    <a class="small" href="#">
                        <input type="checkbox"
                               [(ngModel)]="option.selected"
                               (ngModelChange)="_updateValue(option)"/>&nbsp;
                        {{option.value.name}}</a>
                </li>
            </modal-body>
            <modal-footer>
                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" (click)="close($event)">Ok</button>
            </modal-footer>
        </modal>
    `
})
export class ExportDialog{
    @Input()  dataModel;
    @Output() closed = new EventEmitter();

    //Measurable replication
    _entities   = [];
    _entitiesToExport = new Set();

    @ViewChild('myModal')
    modal: ModalComponent;

    /**
     * Open the modal window with pre-filled measurables of lyph supertypes
     */
    open() {
        this._entities = (this.dataModel||{})::values().map(x => {
            return {value: x.id, selected: false }
        });
        this.modal.open();
    }

    /**
     * Close the modal window
     * @param event - the event object
     */
    close(event) {
        this.modal.close();
        this.closed.emit(event);
    }

    _updateValue(option){
        if ( this._entitiesToExport.has(option.value)) {
            if (!option.selected) { this._entitiesToExport.delete(option.value); }
        } else {
            if (option.selected) { this._entitiesToExport.add(option.value); }
        }
    }
}

/**
 * The MeasurableGeneratorModule module, offers the MeasurableGenerator component.
 */
@NgModule({
    imports: [ CommonModule, FormsModule, Ng2Bs3ModalModule],
    declarations: [ ExportDialog ],
    exports: [ ExportDialog ]
})
export class ExportDialogModule {}


