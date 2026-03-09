import {Component, Output, EventEmitter, Input, NgModule, ViewChild} from '@angular/core';
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {MatSlider, MatSliderModule} from '@angular/material/slider';
import {COLORS} from '../utils/colors.js'

@Component({
    selector: 'background-toolbar',
    template: `
       <section class="w3-bar w3-light-grey w3-bottom background-toolbar" title="Background image position">
           <div class="w3-bar-item slider-group" [class.active-slider]="activeSlider === 'offsetX'" (
                click)="setActiveSlider('offsetX')">
               <label>x:</label>
               <div class="slider">                   
                   <mat-slider #sliderX style="width: 100%"
                       [min]="-500" [max]="500" [step]="1"
                       [value]="offsetX"
                       (change)="onUpdateOffsetX.emit($event.value)"
                   >
                   </mat-slider>
                   <div style="display: flex; justify-content: space-between; width: 100%; margin-top: -8px;">
                       <span class="slider-label">-500</span>
                       <span class="slider-value">({{offsetX}})</span>
                       <span class="slider-label">500</span>
                   </div>
               </div>
           </div>
           <div class="w3-bar-item slider-group" [class.active-slider]="activeSlider === 'offsetY'" 
                (click)="setActiveSlider('offsetY')">
               <label>y:</label>
               <div class="slider">
                   <mat-slider #sliderY
                       style="width: 100%"
                       [min]="-500" [max]="500" [step]="1"
                       [value]="offsetY"
                       (change)="onUpdateOffsetY.emit($event.value)"
                   >
                   </mat-slider>
                   <div style="display: flex; justify-content: space-between; width: 100%; margin-top: -8px;">
                       <span class="slider-label">-500</span>
                       <span class="slider-value">({{offsetY}})</span>
                       <span class="slider-label">500</span>
                   </div>
               </div>
           </div>
           <div class="w3-bar-item slider-group" [class.active-slider]="activeSlider === 'scale'" 
                (click)="setActiveSlider('scale')" >
               <label>scale:</label>
               <div class="slider">
                   <mat-slider #sliderScale
                       style="width: 100%"
                       [min]="0.1" [max]="2.0" [step]="0.05"
                       [value]="scale"
                       (change)="onUpdateScale.emit($event.value)"
                   >
                   </mat-slider>
                   <div style="display: flex; justify-content: space-between; width: 100%; margin-top: -8px;">
                       <span class="slider-label">0.1</span>
                       <span class="slider-value">({{scale}})</span>
                       <span class="slider-label">2.0</span>
                   </div>
               </div>
           </div>
           <div class="w3-bar-item slider-group" [class.active-slider]="activeSlider === 'rotate'" 
                (click)="setActiveSlider('rotate')" >
               <label>rotate:</label>
               <div class="slider">
                   <mat-slider #sliderRotate
                       style="width: 100%"
                       [min]="-3.14" [max]="3.14" [step]="0.01"
                       [value]="rotate"
                       (change)="onUpdateRotate.emit($event.value)"
                   >
                   </mat-slider>
                   <div style="display: flex; justify-content: space-between; width: 100%; margin-top: -8px;">
                       <span class="slider-label">-3.14</span>
                       <span class="slider-value">({{rotate}})</span>
                       <span class="slider-label">3.14</span>
                   </div>
               </div>
           </div>
       </section>
    `,
    styles: [`
        .background-toolbar{
            width: 850px;
            position: fixed;
            bottom: 0;
            left: 500px;
            z-index: 11001;
            pointer-events: auto;
        }
        .background-toolbar .w3-bar-item {
            padding-top: 4px !important;
            padding-bottom: 4px !important;
            border: 1px solid transparent;
            height: 38px;
        }
        .background-toolbar .w3-bar-item.active-slider {
            border: 1px solid ${COLORS.selectedBorder};
        }
        .background-toolbar label {
            font-size: 0.8em;
            margin-bottom: 0px;
            display: block;
            line-height: 1;
        }
        .background-toolbar mat-slider {
            height: 32px;
        }
        .slider-label {
            font-size: 0.65em;
            color: gray;
        }
        .slider-value {
            font-size: 0.7em;
            font-weight: bold;
            min-width: 50px;
            text-align: center;
        }
        .slider-group {
            width: 200px; 
            margin-right: 10px;
            display: flex; 
            flex-direction: row;
        }
        .slider {
            display: flex; 
            flex-direction: column;
            justify-content: space-between; 
            width: 100%; 
            margin-top: -16px;
        }
        label {margin-right: 4px; width: 100%;}
	`]
})
export class BackgroundToolbar {
    @Input() offsetX = 0;
    @Input() offsetY = 0;
    @Input() scale = 1.0;
    @Input() rotate = 0;
    @Output() onUpdateOffsetX = new EventEmitter();
    @Output() onUpdateOffsetY = new EventEmitter();
    @Output() onUpdateScale = new EventEmitter();
    @Output() onUpdateRotate = new EventEmitter();

    @ViewChild('sliderX') sliderX;
    @ViewChild('sliderY') sliderY;
    @ViewChild('sliderScale') sliderScale;
    @ViewChild('sliderRotate') sliderRotate;

    activeSlider = 'offsetX';

    setActiveSlider(name) {
        this.activeSlider = name;
        switch (name) {
            case 'offsetX':
                this.sliderX?._elementRef.nativeElement.focus();
                break;
            case 'offsetY':
                this.sliderY?._elementRef.nativeElement.focus();
                break;
            case 'scale':
                this.sliderScale?._elementRef.nativeElement.focus();
                break;
            case 'rotate':
                this.sliderRotate?._elementRef.nativeElement.focus();
                break;
        }
    }
}

@NgModule({
    imports: [CommonModule, FormsModule, MatSliderModule],
    declarations: [BackgroundToolbar],
    exports: [BackgroundToolbar]
})
export class BackgroundToolbarModule {
}
