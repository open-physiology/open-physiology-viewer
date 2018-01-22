import {NgModule, Component, ViewChild, ElementRef} from '@angular/core';
import {WebGLRenderService} from '../services/webGLRenderService';
import {CommonModule} from '@angular/common';
import {FormsModule}  from '@angular/forms';

@Component({
    selector: 'webGLScene',
    template: `
        <div class="view_selector">
            Show:
            <input type="checkbox" name="show_graph"  (change)="_renderService.toggleGraph('A')" checked/> A
            <input type="checkbox" name="show_graph"  (change)="_renderService.toggleGraph('B')" checked/> B
            <input type="checkbox" name="show_graph"  (change)="_renderService.toggleGraph('C')" checked/> C
            <input type="checkbox" name="show_graph"  (change)="_renderService.toggleGraph('D')" checked/> D
            <input type="checkbox" name="show_planes" (change)="_renderService.togglePlanes()" checked/> Grid
        </div>
        <div class="dimensions_selector">
            Dimensions:
            <input type="radio" name="num_dimensions" (change)="_renderService.toggleDimensions(1)"/> 1D
            <input type="radio" name="num_dimensions" (change)="_renderService.toggleDimensions(2)"/> 2D
            <input type="radio" name="num_dimensions" (change)="_renderService.toggleDimensions(3)" checked/> 3D
        </div>
        <div id="webGLScene" #webGLScene></div>
    `,
    styles: [`
        #webGLScene { width: 100%; }
        #create{ align: right; }        
    `]
})
export class WebGLSceneComponent {
    @ViewChild('webGLScene') container: ElementRef;

    constructor(renderService: WebGLRenderService) {
        this._renderService = renderService;
    }

    ngAfterViewInit(){
       this._renderService.init(this.container.nativeElement);
    }
}

@NgModule({
    imports     : [CommonModule, FormsModule],
    declarations: [WebGLSceneComponent],
    providers   : [WebGLRenderService],
    exports     : [WebGLSceneComponent]
})
export class WebGLSceneModule {}
