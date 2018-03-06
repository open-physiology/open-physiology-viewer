import {Component, Input} from '@angular/core';

@Component({
    selector: 'modelInfoPanel',
    template: `
        <section class="w3-container w3-border">
            <!--Text fields-->
            <section *ngFor="let property of model.fields?.text || []">
                <section class="w3-half">
                    <label class="w3-label">{{property}}: </label>
                    {{model[property] || "?"}}
                </section>
            </section>
            <!--Objects-->
            <section *ngFor="let property of model.fields?.objects || []">
                <section class="w3-half">
                    <label class="w3-label">{{property}}: </label>
                    {{model[property]?.id || "?"}} - {{model[property]?.name || "?"}} 
                    {{"(" + (model[property]?.class || "?") + ")"}}
                </section>
            </section>
            <section class="w3-clear"></section>
            <!--Lists-->
            <section *ngFor="let property of model.fields?.lists || []">
                <section>
                    <label class="w3-label">{{property}}: </label>
                    <section *ngIf="model[property]">
                        <ul *ngFor="let item of model[property]" class="w3-ul">
                            <li>{{item.id}} - {{item.name || "?"}}
                        </ul>
                    </section>
                </section>
            </section>
        </section>
    `
})
export class ModelInfoPanel {
    @Input() model;
    @Input() readonly = true;

}