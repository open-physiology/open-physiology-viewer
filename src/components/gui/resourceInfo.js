import {Component, Input, NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {keys, isArray, isObject} from 'lodash-bound';

@Component({
    selector: 'resourceInfoPanel',
    template: `
        <section *ngFor="let property of resource?.infoFields || []">
            <section>
                <label class="w3-label">{{property}}: </label>
                <span *ngIf="_fieldMap[property] === 'text'">
                    {{resource[property] || "?"}}
                </span>

                <span *ngIf="_fieldMap[property] === 'object'">
                    {{resource[property]?.id || "?"}} - {{resource[property]?.name || "?"}}
                    {{"(" + (resource[property]?.class || "?") + ")"}}
                </span>

                <section *ngIf="_fieldMap[property] === 'array'">
                    <ul *ngFor="let item of resource[property]" class="w3-ul">
                        <li>{{item.id}} - {{item.name || "?"}}
                    </ul>
                </section>                
            </section> 
        </section>
    `
})
/**
 * Resource info panel
 */
export class ResourceInfoPanel {
    _resource;

    @Input('resource') set resource(newValue){
        this._resource = newValue;
        if (this.resource && this.resource.constructor) {
            this._fieldMap = {};
            (this._resource.infoFields||[]).forEach(key => {
                if (this._resource[key]){
                    if (this._resource[key]::isArray()){
                        this._fieldMap[key] = "array";
                    } else {
                        if (this._resource[key]::isObject()){
                            this._fieldMap[key] = "object";
                        }
                    }
                }
                if (!this._fieldMap[key]){
                    this._fieldMap[key] = "text";
                }
            })
        }
    };

    get resource(){
        return this._resource;
    }
}

@NgModule({
    imports: [CommonModule],
    declarations: [ResourceInfoPanel],
    exports: [ResourceInfoPanel]
})
export class ResourceInfoModule {}