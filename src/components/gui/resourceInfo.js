import {Component, Input, NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {isArray, isObject} from 'lodash-bound';

@Component({
    selector: 'resourceInfoPanel',
    template: `
        <section *ngFor="let property of resource?.infoFields || []">
            <section>
                <label class="w3-label"><b>{{property}}: </b></label>
                <span *ngIf="_fieldMap[property] === FIELD_TYPES.TEXT">
                    {{resource[property] || "?"}}
                </span>
                
                <span *ngIf="_fieldMap[property] === FIELD_TYPES.OBJECT">
                    {{resource[property]?.id || "?"}} - {{resource[property]?.name || "?"}}
                    {{"(" + (resource[property]?.class || "?") + ")"}}
                </span>

                <section *ngIf="_fieldMap[property] === FIELD_TYPES.ARRAY">
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

    FIELD_TYPES = {
        ARRAY  : "array",
        OBJECT : "object",
        TEXT   : "text"
    };

    @Input('resource') set resource(newValue){
        this._resource = newValue;
        if (this.resource && this.resource.constructor) {
            this._fieldMap = {};
            (this._resource.infoFields||[]).forEach(key => {
                if (!key) { return; }
                if (this._resource[key]){
                    if (this._resource[key]::isArray()){
                        this._fieldMap[key] = this.FIELD_TYPES.ARRAY;
                    } else {
                        if (this._resource[key]::isObject()){
                            this._fieldMap[key] = this.FIELD_TYPES.OBJECT;
                        }
                    }
                }
                if (!this._fieldMap[key]){
                    this._fieldMap[key] = this.FIELD_TYPES.TEXT;
                }
            });
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