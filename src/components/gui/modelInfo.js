import {Component, Input} from '@angular/core';

@Component({
    selector: 'modelInfoPanel',
    template: `
        <fieldset class="w3-card w3-round w3-margin-small">
            <legend>Highlighted</legend>
            <!--Text infoFields-->
            <section *ngFor="let property of model.infoFields?.text || []">
                <section class="w3-half">
                    <label class="w3-label">{{property}}: </label>
                    {{model[property] || "?"}}
                </section>
            </section>
            <!--Objects-->
            <section *ngFor="let property of model.infoFields?.objects || []">
                <section class="w3-half">
                    <label class="w3-label">{{property}}: </label>
                    {{model[property]?.id || "?"}} - {{model[property]?.name || "?"}}
                    {{"(" + (model[property]?.class || "?") + ")"}}
                </section>
            </section>
            <section class="w3-clear"></section>
            <!--Lists-->
            <section *ngFor="let property of model.infoFields?.lists || []">
                <section>
                    <label class="w3-label">{{property}}: </label>
                    <section *ngIf="model[property]">
                        <ul *ngFor="let item of model[property]" class="w3-ul">
                            <li>{{item.id}} - {{item.name || "?"}}
                        </ul>
                    </section>
                </section>
            </section>
        </fieldset>
    `
})
export class ModelInfoPanel {
    @Input() model;
    @Input() readonly = true;

}
