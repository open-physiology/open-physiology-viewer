import {NgModule, Component, Input, Output, EventEmitter} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatSliderModule} from '@angular/material/slider'

@Component({
    selector: 'checkboxFilter',
    template: `
        <section>
            <span class="wrap" *ngFor="let option of options">
                <mat-slide-toggle [checked]="!option.disabled"
                                  (change)="toggleOption(option)">{{option.name}}</mat-slide-toggle>
            </span>
        </section>
    `,
    styles: [`
        .mat-slide-toggle {
            padding: 0.267rem 0;
        }

        .mat-slide-toggle {
            height: auto;
            display: flex;
            width: 100%;
        }
    `]
})
export class CheckboxFilterPanel {
    @Input() options;
    @Output() onOptionToggle= new EventEmitter();

    toggleOption(option) {
        option.disabled = !option.disabled;
        this.onOptionToggle.emit(this.options);
    }
}

@NgModule({
    imports: [CommonModule, MatSliderModule, MatSlideToggleModule],
    declarations: [CheckboxFilterPanel],
    exports: [CheckboxFilterPanel]
})

export class CheckboxFilterModule {
}