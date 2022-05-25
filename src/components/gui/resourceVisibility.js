import {Component, Input, ChangeDetectionStrategy} from '@angular/core';

@Component({
    selector: 'resourceVisibility',
    changeDetection: ChangeDetectionStrategy.Default,
    template: `
        <mat-accordion >
            <mat-expansion-panel *ngIf="renderedResources">
                <mat-expansion-panel-header>
                    <mat-panel-title>
                        {{title}}
                    </mat-panel-title>
                </mat-expansion-panel-header>
                <div class="default-box">
                    <div class="settings-wrap">
                        <div class="wrap" *ngFor="let resource of renderedResources">
                            <mat-slide-toggle
                                    [checked]="isChecked(resource)"
                                    (change)="toggleResource(resource)">
                                {{resource._parent ? resource._parent.id + ":" : ""}}{{resource.name || resource.id}}
                            </mat-slide-toggle>
                        </div>
                    </div>
                </div>
            </mat-expansion-panel>
        </mat-accordion>
    `
})
export class ResourceVisibility {
    @Input() title;
    @Input() renderedResources;
    @Input() dependentProperties;

    isChecked(resource){
        if (resource.viewObjects && resource.viewObjects.main) {
            return resource.viewObjects.main.material.visible;
        } else {
            return resource._visible;
        }
    }

    toggleResource(resource){
        if (resource.viewObjects && resource.viewObjects.main){
            resource.viewObjects.main.material.visible = !resource.viewObjects.main.material.visible;
            (this.dependentProperties||[]).forEach(prop => {
                (resource[prop]||[]).forEach(e => {
                    if (e.viewObjects && e.viewObjects.main){
                        e.viewObjects.main.material.visible = resource.viewObjects.main.material.visible;
                    }
                })
            })
        } else {
            //Resource is an aggregated component
            resource._visible = !resource._visible;
            (this.dependentProperties||[]).forEach(prop => {
                (resource[prop]||[]).forEach(e => this.toggleResource(e));
            })
        }
    }
}