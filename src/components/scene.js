import {NgModule, Component, Input} from '@angular/core';
import {MainSceneRenderService} from '../services/MainSceneRenderService';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';

@Component({
    selector: 'scene',
    template: `
        <button type="button" name="create" (click)="_renderService.createGraph()"> Create graph</button>
        <div class="view-selector">
            Show:
            <input type="checkbox" name="show_graph" (change)="_renderService.toggleGraph('A')" checked/> A
            <input type="checkbox" name="show_graph" (change)="_renderService.toggleGraph('B')" checked/> B
            <input type="checkbox" name="show_graph" (change)="_renderService.toggleGraph('C')" checked/> C
            <input type="checkbox" name="show_graph" (change)="_renderService.toggleGraph('D')" checked/> D
            <input type="checkbox" name="show_planes" (change)="_renderService.togglePlanes()" checked/> Planes
        </div>
        <div class="dimensions-selector">
            Dimensions:
            <input type="radio" name="num-dimensions" (change)="_renderService.toggleDimensions(1)"/> 1D
            <input type="radio" name="num-dimensions" (change)="_renderService.toggleDimensions(2)" checked/> 2D
            <input type="radio" name="num-dimensions" (change)="_renderService.toggleDimensions(3)"/> 3D
        </div>
        <div id="scene"></div>
    `,
    styles: [`
        #scene {
            width: 100%;
        }
        #nav-info {
            position: absolute;
            bottom: 5px;
            width: 100%;
            text-align: center;
            color: slategrey;
            opacity: 0.7;
            font-size: 10px;
        }
        .tooltip {
            position: absolute;
            color: lavender;
            font-size: 18px;
        }
    `]
})
export class SceneComponent {
    constructor(renderService: MainSceneRenderService) {
        this._renderService = renderService;
    }

    @Input('container') set container(value: HTMLElement) {
        if (value) {
            this._renderService.init(value);
        }
    }
}

/**
 * The TestAppModule test module, which supplies the _excellent_ TestApp test application!
 */
@NgModule({
    imports     : [CommonModule, FormsModule],
    declarations: [SceneComponent],
    providers   : [MainSceneRenderService],
    exports     : [SceneComponent]
})
export class SceneModule {}
