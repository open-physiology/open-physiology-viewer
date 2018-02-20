import {NgModule, Component, ViewChild, ElementRef} from '@angular/core';

import {CommonModule} from '@angular/common';
import {FormsModule}  from '@angular/forms';

@Component({
    selector: 'controlPanel',
    template: `
        <div class="view_selector">
            Show:
            <input type="checkbox" name="show_planes" (change)="_renderService.togglePlanes()"/> Grid
            <input type="checkbox" name="show_lyphs"  (change)="_renderService.toggleLyphs()" checked/> Lyphs
            <input type="checkbox" name="show_labels" (change)="_renderService.toggleLabels()" checked/> Node labels
        </div>
        <div class="dataset_selector">
            Dataset:
            <input type="radio" name="dataset" (change)="_renderService.toggleDataset('test')"/> Generated
            <input type="radio" name="dataset" (change)="_renderService.toggleDataset('kidney')" checked/> Kidney
        </div>
        <div class="icon_selector">
            Lyph icon:
            <input type="radio" name="linkIcon_view" (change)="_renderService.toggleLinkIcon('2d')"/> 2D
            <input type="radio" name="linkIcon_view" (change)="_renderService.toggleLinkIcon('3d')" checked/> 3D
        </div>
        <div class="dimensions_selector">
            Dimensions:
            <input type="radio" name="num_dimensions" (change)="_renderService.toggleDimensions(2)"/> 2D
            <!--<input type="radio" name="num_dimensions" (change)="_renderService.toggleDimensions(2.5)"/> 2.5D-->
            <input type="radio" name="num_dimensions" (change)="_renderService.toggleDimensions(3)" checked/> 3D
        </div>
    `,
    styles: [`
    `]
})
export class ControlPanel {
}

@NgModule({
    imports     : [CommonModule, FormsModule],
    declarations: [ControlPanel],
    exports     : [ControlPanel]
})
export class ControlPanelModule {}
