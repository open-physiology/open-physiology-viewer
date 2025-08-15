import {Component, Input, NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {COLORS} from "../utils/colors";

@Component({
    selector: 'linkedResource',
    template: `
        <div *ngIf="resource">
            <div class="resource-box w3-margin-top">
                <div class="resource-boxContent">
                    <div class="linked">
                        {{resource.id}} {{resource.name}}
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .resource-box .resource-boxContent {
            padding: 0 0.625rem 0 0.625rem;
            font-size: 0.75rem;
            color: ${COLORS.inputTextColor};
            font-weight: 500;
        }
        .linked {
            border:3px solid #4CAF50;
            padding:8px 16px;
            border-radius:2px;
        }    
    `
    ]
})
/**
 * Resource info panel
 */
export class LinkedResourcePanel {
    _resource;

    @Input('resource') set resource(aResource) {
        this._resource = aResource;
    };

    get resource() {
        return this._resource;
    }
}

@NgModule({
    imports: [CommonModule],
    declarations: [LinkedResourcePanel],
    exports: [LinkedResourcePanel]
})
export class LinkedResourceModule {
}