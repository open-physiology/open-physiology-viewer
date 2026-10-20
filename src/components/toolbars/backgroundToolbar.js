import {Component, Output, EventEmitter, Input, NgModule, ViewChild, ElementRef, SimpleChanges} from '@angular/core';
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {MatSlider, MatSliderModule} from '@angular/material/slider';
import {COLORS} from '../utils/colors.js'

const SLIDER_NAMES = ['offsetX', 'offsetY', 'offsetZ', 'scale', 'rotate'];
// flipX mirrors the image horizontally (across the y axis), flipY vertically (across the x axis)
const FLIP_NAMES = ['flipX', 'flipY'];
const PARAM_NAMES = [...SLIDER_NAMES, ...FLIP_NAMES];
const OFFSET_NAMES = ['offsetX', 'offsetY', 'offsetZ'];
// Arrow keys shift offsets by this fraction of the scene extent; with Shift (or Ctrl+Up/Down) by FINE_OFFSET_STEP
const COARSE_OFFSET_STEP = 0.01;
const FINE_OFFSET_STEP = 1;

@Component({
    selector: 'background-toolbar',
    template: `
       <section class="w3-bar w3-light-grey background-toolbar" title="Background image position. Arrow keys: move the active slider (x, y, z: by 1% of the scene extent); Shift+arrows or Ctrl+Up/Down: by 1; Ctrl+Left/Right: switch slider">
           <div class="w3-bar-item slider-group" [class.active-slider]="activeSlider === 'offsetX'"
                (mousedown)="setActiveSlider('offsetX')">
               <label>x:</label>
               <div class="slider">
                   <mat-slider #sliderX style="width: 100%"
                       [min]="_sliderConfig.offsetX.min" [max]="_sliderConfig.offsetX.max" [step]="1"
                       [value]="offsetX"
                       (input)="onSlider('offsetX', $event.value)"
                       (change)="onSlider('offsetX', $event.value)"
                   >
                   </mat-slider>
                   <div class="slider-scale">
                       <span class="slider-label">{{_sliderConfig.offsetX.min}}</span>
                       <span class="slider-value">({{offsetX}})</span>
                       <span class="slider-label">{{_sliderConfig.offsetX.max}}</span>
                   </div>
               </div>
           </div>
           <div class="w3-bar-item slider-group" [class.active-slider]="activeSlider === 'offsetY'"
                (mousedown)="setActiveSlider('offsetY')">
               <label>y:</label>
               <div class="slider">
                   <mat-slider #sliderY style="width: 100%"
                       [min]="_sliderConfig.offsetY.min" [max]="_sliderConfig.offsetY.max" [step]="1"
                       [value]="offsetY"
                       (input)="onSlider('offsetY', $event.value)"
                       (change)="onSlider('offsetY', $event.value)"
                   >
                   </mat-slider>
                   <div class="slider-scale">
                       <span class="slider-label">{{_sliderConfig.offsetY.min}}</span>
                       <span class="slider-value">({{offsetY}})</span>
                       <span class="slider-label">{{_sliderConfig.offsetY.max}}</span>
                   </div>
               </div>
           </div>
           <div class="w3-bar-item slider-group" [class.active-slider]="activeSlider === 'offsetZ'"
                (mousedown)="setActiveSlider('offsetZ')">
               <label>z:</label>
               <div class="slider">
                   <mat-slider #sliderZ style="width: 100%"
                       [min]="_sliderConfig.offsetZ.min" [max]="_sliderConfig.offsetZ.max" [step]="0.1"
                       [value]="offsetZ"
                       (input)="onSlider('offsetZ', $event.value)"
                       (change)="onSlider('offsetZ', $event.value)"
                   >
                   </mat-slider>
                   <div class="slider-scale">
                       <span class="slider-label">{{_sliderConfig.offsetZ.min}}</span>
                       <span class="slider-value">({{offsetZ}})</span>
                       <span class="slider-label">{{_sliderConfig.offsetZ.max}}</span>
                   </div>
               </div>
           </div>
           <div class="w3-bar-item slider-group" [class.active-slider]="activeSlider === 'scale'"
                (mousedown)="setActiveSlider('scale')">
               <label>scale:</label>
               <div class="slider">
                   <mat-slider #sliderScale style="width: 100%"
                       [min]="0.1" [max]="2.0" [step]="0.01"
                       [value]="scale"
                       (input)="onSlider('scale', $event.value)"
                       (change)="onSlider('scale', $event.value)"
                   >
                   </mat-slider>
                   <div class="slider-scale">
                       <span class="slider-label">0.1</span>
                       <span class="slider-value">({{scale}})</span>
                       <span class="slider-label">2.0</span>
                   </div>
               </div>
           </div>
           <div class="w3-bar-item slider-group" [class.active-slider]="activeSlider === 'rotate'"
                (mousedown)="setActiveSlider('rotate')">
               <label>rotate:</label>
               <div class="slider">
                   <mat-slider #sliderRotate style="width: 100%"
                       [min]="-3.14" [max]="3.14" [step]="0.01"
                       [value]="rotate"
                       (input)="onSlider('rotate', $event.value)"
                       (change)="onSlider('rotate', $event.value)"
                   >
                   </mat-slider>
                   <div class="slider-scale">
                       <span class="slider-label">-3.14</span>
                       <span class="slider-value">({{rotate}})</span>
                       <span class="slider-label">3.14</span>
                   </div>
               </div>
           </div>
           <button class="w3-bar-item w3-hover-light-grey" [class.flip-active]="flipX"
                   (click)="toggleFlip('flipX')"
                   title="Flip horizontally (mirror across the y axis)">
               <i class="fa fa-arrows-left-right"> </i>
           </button>
           <button class="w3-bar-item w3-hover-light-grey" [class.flip-active]="flipY"
                   (click)="toggleFlip('flipY')"
                   title="Flip vertically (mirror across the x axis)">
               <i class="fa fa-arrows-up-down"> </i>
           </button>
           <button class="w3-bar-item w3-hover-light-grey" (click)="applyChanges()"
                   title="Apply changes">
               <div style="display: flex">
                   <i class="fa fa-check"> </i>
                   <span *ngIf="isDirty()" style="color: red">*</span>
               </div>
           </button>
           <button class="w3-bar-item w3-hover-light-grey" (click)="rollbackChanges()"
                   title="Rollback changes">
               <i class="fa fa-undo"> </i>
           </button>
       </section>
    `,
    styles: [`
        .background-toolbar{
            position: fixed;
            bottom: 0;
            left: 500px;
            width: fit-content;
            z-index: 11001;
            pointer-events: auto;
            display: flex;
            align-items: center;
        }
        .background-toolbar .w3-bar-item {
            padding: 4px 8px !important;
            border: 1px solid transparent;
            height: 38px;
            flex-shrink: 0;
        }
        .background-toolbar .flip-active {
            border: 1px solid ${COLORS.selectedBorder};
        }
        .background-toolbar .slider-group {
            cursor: pointer;
        }
        .background-toolbar .slider-group.active-slider {
            cursor: default;
            border: 1px solid ${COLORS.selectedBorder};
        }
        /* Inactive sliders ignore pointer events so a stray click only selects the slider
           (handled by the group's mousedown) without changing its value. */
        .background-toolbar .slider-group mat-slider {
            pointer-events: none;
        }
        .background-toolbar .slider-group.active-slider mat-slider {
            pointer-events: auto;
        }
        .background-toolbar label {
            font-size: 0.8em;
            margin-bottom: 0px;
            display: block;
            line-height: 1;
            margin-right: 4px;
        }
        .background-toolbar mat-slider {
            height: 32px;
        }
        .slider-scale {
            display: flex;
            justify-content: space-between;
            width: 100%;
            margin-top: -8px;
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
            width: 180px;
            margin-right: 5px;
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
	`]
})
export class BackgroundToolbar {
    @Input() offsetX = 0;
    @Input() offsetY = 0;
    @Input() offsetZ = 0;
    @Input() scale = 1.0;
    @Input() rotate = 0;
    @Input() flipX = false;
    @Input() flipY = false;
    // Half-size of the scene coordinate system: x, y and z offsets range over [-extent, extent]
    @Input() extent = 1000;
    @Output() onUpdateOffsetX = new EventEmitter();
    @Output() onUpdateOffsetY = new EventEmitter();
    @Output() onUpdateOffsetZ = new EventEmitter();
    @Output() onUpdateScale = new EventEmitter();
    @Output() onUpdateRotate = new EventEmitter();
    @Output() onUpdateFlipX = new EventEmitter();
    @Output() onUpdateFlipY = new EventEmitter();
    @Output() onApply = new EventEmitter();

    @ViewChild('sliderX') sliderX;
    @ViewChild('sliderY') sliderY;
    @ViewChild('sliderZ') sliderZ;
    @ViewChild('sliderScale') sliderScale;
    @ViewChild('sliderRotate') sliderRotate;

    activeSlider = 'offsetX';

    // Range/step metadata mirrors the template bindings and drives keyboard increments
    _sliderConfig = {
        offsetX: {min: -1000, max: 1000, step: 1},
        offsetY: {min: -1000, max: 1000, step: 1},
        offsetZ: {min: -1000, max: 1000, step: 0.1},
        scale:   {min: 0.1,  max: 2.0, step: 0.01},
        rotate:  {min: -3.14, max: 3.14, step: 0.01}
    };

    // Baseline (last applied/loaded) values used to detect unsaved changes
    _savedParams = {};
    // Names of parameters whose @Input change is an echo of our own emit (not external)
    _pendingInternal = new Set();

    constructor(elementRef: ElementRef) {
        this._elementRef = elementRef;
    }

    ngAfterViewInit() {
        // Capture-phase listener so arrow keys are handled here before the focused mat-slider
        // applies its own (now unwanted) native increment/decrement.
        this._keydownHandler = (e) => this._onKeydownCapture(e);
        this._elementRef.nativeElement.addEventListener('keydown', this._keydownHandler, true);
    }

    ngOnDestroy() {
        if (this._keydownHandler) {
            this._elementRef.nativeElement.removeEventListener('keydown', this._keydownHandler, true);
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.extent && this.extent > 0) {
            ['offsetX', 'offsetY', 'offsetZ'].forEach(name => {
                this._sliderConfig[name].min = -this.extent;
                this._sliderConfig[name].max = this.extent;
            });
        }
        PARAM_NAMES.forEach(name => {
            if (!changes[name]) { return; }
            if (this._pendingInternal.has(name)) {
                // Echo of a value we just emitted - keep the baseline so the change stays "dirty"
                this._pendingInternal.delete(name);
                return;
            }
            // Initial binding or a genuine external update resets the baseline
            this._savedParams[name] = this[name];
        });
    }

    /** Round/clamp a value to the slider's range and step */
    _clamp(name, value) {
        const cfg = this._sliderConfig[name];
        let v = Math.min(cfg.max, Math.max(cfg.min, value));
        const inv = Math.round(1 / cfg.step);
        return Math.round(v * inv) / inv;
    }

    _emit(name, value) {
        switch (name) {
            case 'offsetX': this.onUpdateOffsetX.emit(value); break;
            case 'offsetY': this.onUpdateOffsetY.emit(value); break;
            case 'offsetZ': this.onUpdateOffsetZ.emit(value); break;
            case 'scale':   this.onUpdateScale.emit(value); break;
            case 'rotate':  this.onUpdateRotate.emit(value); break;
            case 'flipX':   this.onUpdateFlipX.emit(value); break;
            case 'flipY':   this.onUpdateFlipY.emit(value); break;
        }
    }

    /** Apply a user-initiated change to a parameter and notify the parent */
    _applyUserChange(name, value) {
        const val = this._clamp(name, value);
        if (val === this[name]) { return; }
        this[name] = val;
        this._pendingInternal.add(name);
        this._emit(name, val);
    }

    toggleFlip(name) {
        this[name] = !this[name];
        this._pendingInternal.add(name);
        this._emit(name, this[name]);
    }

    /** Handler for direct slider interaction (drag / click on the active slider) */
    onSlider(name, value) {
        this.setActiveSlider(name);
        this._applyUserChange(name, value);
    }

    /**
     * Keyboard increment for a parameter: x, y and z offsets move by a fraction of the scene extent,
     * or by FINE_OFFSET_STEP for fine-tuning; scale and rotation use their slider step.
     * @param name - parameter name
     * @param fine - whether a fine-tuning modifier is pressed
     */
    _keyStep(name, fine) {
        if (!OFFSET_NAMES.includes(name)) {
            return this._sliderConfig[name].step;
        }
        return fine ? FINE_OFFSET_STEP : Math.max(FINE_OFFSET_STEP, Math.round(COARSE_OFFSET_STEP * this.extent));
    }

    _onKeydownCapture(event) {
        const key = event.key;
        const ctrl = event.ctrlKey || event.metaKey;
        if (ctrl && (key === 'ArrowLeft' || key === 'ArrowRight')) {
            if (key === 'ArrowLeft') {
                this._switchSlider(-1);
            } else if (key === 'ArrowRight') {
                this._switchSlider(1);
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            return;
        }
        let delta = 0;
        if (key === 'ArrowLeft' || key === 'ArrowDown') { delta = -1; }
        else if (key === 'ArrowRight' || key === 'ArrowUp') { delta = 1; }
        if (delta !== 0) {
            const step = this._keyStep(this.activeSlider, ctrl || event.shiftKey);
            this._applyUserChange(this.activeSlider, this[this.activeSlider] + delta * step);
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    }

    _switchSlider(dir) {
        const idx = SLIDER_NAMES.indexOf(this.activeSlider);
        const next = (idx + dir + SLIDER_NAMES.length) % SLIDER_NAMES.length;
        this.setActiveSlider(SLIDER_NAMES[next]);
    }

    isDirty() {
        return PARAM_NAMES.some(name => this[name] !== this._savedParams[name]);
    }

    applyChanges() {
        PARAM_NAMES.forEach(name => this._savedParams[name] = this[name]);
        this.onApply.emit({...this._savedParams});
    }

    rollbackChanges() {
        PARAM_NAMES.forEach(name => {
            if (this[name] !== this._savedParams[name]) {
                this[name] = this._savedParams[name];
                this._pendingInternal.add(name);
                this._emit(name, this[name]);
            }
        });
    }

    setActiveSlider(name) {
        this.activeSlider = name;
        const slider = {
            offsetX: this.sliderX,
            offsetY: this.sliderY,
            offsetZ: this.sliderZ,
            scale: this.sliderScale,
            rotate: this.sliderRotate
        }[name];
        slider?._elementRef?.nativeElement?.focus();
    }
}

@NgModule({
    imports: [CommonModule, FormsModule, MatSliderModule],
    declarations: [BackgroundToolbar],
    exports: [BackgroundToolbar]
})
export class BackgroundToolbarModule {
}
