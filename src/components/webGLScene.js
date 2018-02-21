import {NgModule, Component, ViewChild, ElementRef} from '@angular/core';
import {WebGLRenderService} from '../services/webGLRenderService';
import {ControlPanelModule}    from '../components/controlPanel';

import {CommonModule} from '@angular/common';
import {FormsModule}  from '@angular/forms';

@Component({
    selector: 'webGLScene',
    template: `
        <section class="w3-row">
            <section class="w3-threequarter">
                <div id="webGLScene" #webGLScene></div>
            </section>
            <section class="w3-quarter">
                <section class="w3-content w3-padding-left">

                    <fieldset>
                        <legend>Show:</legend>
                        <input type="checkbox" name="planes" (change)="_renderService.togglePlanes()"/> Grid
                        <input type="checkbox" name="lyphs" (change)="toggleLyphs()" checked/> Lyphs
                    </fieldset>

                    <fieldset>
                        <legend>Labels:</legend>
                        <input type="checkbox" name="node_label" (change)="toggleNodeLabels()" checked/> Node
                        <input type="checkbox" name="link_label" (change)="toggleLinkLabels()"/> Link
                        <input type="checkbox" name="lyph_label" (change)="toggleLyphLabels()"/> Lyph

                        <fieldset [disabled]="!_showNodeLabels">
                            <legend>Node label:</legend>
                            <input type="radio" name="node_label"
                                   (change)="_renderService.updateLabelContent('node', 'id')" checked/> Id
                            <input type="radio" name="node_label"
                                   (change)="_renderService.updateLabelContent('node', 'name')"/> Name
                            <input type="radio" name="node_label"
                                   (change)="_renderService.updateLabelContent('node', 'external')"/> External
                        </fieldset>

                        <fieldset [disabled]="!_showLinkLabels">
                            <legend>Link label:</legend>
                            <input type="radio" name="link_label"
                                   (change)="_renderService.updateLabelContent('link', 'id')" checked/> Id
                            <input type="radio" name="link_label"
                                   (change)="_renderService.updateLabelContent('link', 'name')"/> Name
                            <input type="radio" name="link_label"
                                   (change)="_renderService.updateLabelContent('link', 'external')"/> External
                        </fieldset>

                        <fieldset [disabled]="!_showLyphLabels">
                            <legend>Lyph label:</legend>
                            <input type="radio" name="lyph_label"
                                   (change)="_renderService.updateLabelContent('lyph', 'id')" checked/> Id
                            <input type="radio" name="lyph_label"
                                   (change)="_renderService.updateLabelContent('lyph', 'name')"/> Name
                            <input type="radio" name="lyph_label"
                                   (change)="_renderService.updateLabelContent('lyph', 'external')"/> External
                        </fieldset>
                    </fieldset>

                    <fieldset>
                        <legend>Dataset:</legend>
                        <input type="radio" name="dataset" (change)="_renderService.toggleDataset('test')"/> Generated
                        <input type="radio" name="dataset" (change)="_renderService.toggleDataset('kidney')" checked/>
                        Kidney
                    </fieldset>

                    <fieldset [disabled]="!_showLyphs">
                        <legend>Lyph icon:</legend>
                        <input type="radio" name="linkIcon_view" (change)="_renderService.toggleLyphIcon('2d')"/> 2D
                        <input type="radio" name="linkIcon_view" (change)="_renderService.toggleLyphIcon('3d')"
                               checked/> 3D
                    </fieldset>

                    <fieldset>
                        <legend>Dimensions:</legend>
                        <input type="radio" name="num_dimensions" (change)="_renderService.toggleDimensions(2)"/> 2D
                        <input type="radio" name="num_dimensions" (change)="_renderService.toggleDimensions(3)"
                               checked/> 3D
                    </fieldset>
                </section>
            </section>
        </section>
    `,
    styles: [`
        #webGLScene {
            width: 100%
        }
    `]
})
export class WebGLSceneComponent {
    @ViewChild('webGLScene') container: ElementRef;

    constructor(renderService: WebGLRenderService) {
        this._renderService = renderService;
        this._showLyphs = true;
        this._showNodeLabels = true;
        this._showLinkLabels = false;
        this._showLyphLabels = false;
    }

    ngAfterViewInit(){
       //Prepare data
       this._renderService.init(this.container.nativeElement);
    }

    toggleNodeLabels(){
        this._showNodeLabels = !this._showNodeLabels;
        this._renderService.toggleNodeLabels(this._showNodeLabels);
    }

    toggleLinkLabels(){
        this._showLinkLabels = !this._showLinkLabels;
        this._renderService.toggleLinkLabels(this._showLinkLabels);
    }

    //Lyphs

    toggleLyphs(){
        this._showLyphs = !this._showLyphs;
        this._renderService.toggleLyphs(this._showLyphs);
    }

    toggleLyphLabels(){
        this._showLyphLabels = !this._showLyphLabels;
        this._renderService.toggleLyphLabels(this._showLyphLabels);
    }


}

@NgModule({
    imports     : [CommonModule, FormsModule],
    declarations: [WebGLSceneComponent],
    providers   : [WebGLRenderService],
    exports     : [WebGLSceneComponent]
})
export class WebGLSceneModule {}
