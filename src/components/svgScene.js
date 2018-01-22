import {NgModule, Component, ViewChild, ElementRef} from '@angular/core';
import {SVGRenderService} from '../services/svgRenderService';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';

@Component({
    selector: 'svgScene',
    template: `
        <div class="view_selector">
            Show:
            <input type="checkbox" name="show_graph"  (change)="_renderService.toggleGraph('A')" checked/> A
            <input type="checkbox" name="show_graph"  (change)="_renderService.toggleGraph('B')" checked/> B
            <input type="checkbox" name="show_graph"  (change)="_renderService.toggleGraph('C')" checked/> C
            <input type="checkbox" name="show_graph"  (change)="_renderService.toggleGraph('D')" checked/> D
            <input type="checkbox" name="show_planes" (change)="_renderService.togglePlanes()" checked/> Grid
        </div>
        <div id="svgScene" #svgScene></div>
    `,
    styles: [`
        #svgScene { width: 100%; height: 100%;}
        .node circle {
            stroke: black;
            stroke-width: 0px;
        }
        .edge path{
            fill: none;
            stroke: #666;
            stroke-width: 1.5px;
        }
    `]
})
export class SVGSceneComponent {
    @ViewChild('svgScene') container: ElementRef;

    constructor(renderService: SVGRenderService) {
        this._renderService = renderService;
    }

    ngAfterViewInit(){
        this._renderService.init(this.container.nativeElement);
    }
}

@NgModule({
    imports     : [CommonModule, FormsModule],
    declarations: [SVGSceneComponent],
    providers   : [SVGRenderService],
    exports     : [SVGSceneComponent]
})
export class SVGSceneModule {}
