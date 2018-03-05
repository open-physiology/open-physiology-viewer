import {Component, Input} from '@angular/core';

@Component({
    selector: 'modelInfoPanel',
    template: `
        <section class="w3-card">
            <section class="w3-content">
                <label>Class</label>
                <input class="w3-input" type="text"
                       [(ngModel)] = "model.class"
                       [disabled]  = "readonly"
                />
    
                <label>Name</label>
                <input class="w3-input" type="text"
                   [(ngModel)] = "model.name"
                   [disabled]  = "readonly"
                />
            </section>
        </section>
    `
})
export class ModelInfoPanel {
    @Input() model;
    @Input() readonly = true;
}