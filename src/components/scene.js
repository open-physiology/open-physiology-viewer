import {NgModule, Component, Input, Inject} from '@angular/core';
import {MainSceneRenderService} from '../services/MainSceneRenderService';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';

@Component({
    selector: 'scene',
    template: `
        <div id="scene"></div>
    `
})
export class SceneComponent {
    constructor(renderService: MainSceneRenderService) {
        this._renderService = renderService;
    }

    @Input('container') set container(value: HTMLElement) {
        if (value)
            this._renderService.init(value);
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
