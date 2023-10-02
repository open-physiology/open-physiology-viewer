import {NgModule, Component, Input, Output, EventEmitter} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatTooltipModule} from '@angular/material/tooltip';
import {ResourceDeclarationModule} from "./resourceDeclarationEditor";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatRadioModule} from "@angular/material/radio";
import {COLORS} from './utils.js'
import {SearchAddBarModule} from "./searchAddBar";

@Component({
    selector: 'lyphDeclaration',
    template: `
         <resourceDeclaration
            [resource]="lyph"
            (onValueChange)="onValueChange.emit($event)"
        ></resourceDeclaration>
        <div class="resource-box">
            <div class="settings-wrap">
                <div class="resource-boxContent">                 
                    <section>
                        <mat-radio-group name="topology"  aria-label="Topology" [value]="currentTopology">
                          <mat-radio-button *ngFor="let option of topologyOptions" class="w3-margin-right" 
                                            [value]="option" (change)="updateValue('topology', option.id)">
                            {{ option.name }}
                          </mat-radio-button>
                        </mat-radio-group>
                    </section> 

                    <mat-checkbox matTooltip="Indicates that the lyph defines layers for its subtypes"
                              labelPosition="after"
                              [checked]="lyph?.isTemplate"
                              (change)="updateValue('isTemplate', $event.checked)"
                        >isTemplate?
                    </mat-checkbox>  

               </div>
            </div>
        </div>                     
<!--        <searchAddBar -->
<!--                [searchOptions]="_searchOptions"-->
<!--                [selected]="selectedRegion"-->
<!--                (selectedItemChange)="selectBySearch($event)"-->
<!--                (addSelectedItem)="replaceRegion($event)"-->
<!--        ></searchAddBar>-->
        <div class="resource-box">
            <div class="settings-wrap">
                <div class="resource-boxContent">                
                <!--Search for region-->
                    <mat-form-field>
                        <input matInput class="w3-input"
                            placeholder="hostedBy"
                            matTooltip="Lyph or region to host the lyph"
                            [value]="lyph?.hostedBy"
                            (keyup.enter)="updateValue('name', $event.target.value)"
                        >
                    </mat-form-field>                           
               </div>
            </div>
        </div> 
    `,
    styles: [`
        .mat-form-field {
          width: 100%;
       }
       
        .settings-wrap {
          padding-bottom: 0.8rem;
          margin-top: 0;
          position: relative;
        }
      
        .resource-box .resource-boxContent {
          padding: 1.067rem;
          font-size: 0.75rem;
          color: ${COLORS.inputTextColor};
          font-weight: 500;
        }

        .resource-box .resource-boxContent button {
          border: ${COLORS.inputBorderColor} 1px solid;
          background: transparent;
          color:  ${COLORS.inputTextColor};
          font-size: 0.75rem;
          font-weight: 500;
          padding: 0.313rem 0.625rem;
          margin: 0.625rem 0 0;
          cursor: pointer;
        }
        
        .resource-box .resource-boxContent button img {
          position: relative;
          top: -2px;
        }
    `]
})
/**
 * The class to edit a resource field
 */
export class LyphDeclarationEditor {
    _lyph;
    @Output() onValueChange = new EventEmitter();

    topologyOptions: Option[] = [
      { name: 'None', id: null },
      { name: 'TUBE', id: 'TUBE' },
      { name: 'BAG- (BAG)', id: 'BAG' },
      { name: 'BAG+ (BAG2)', id: 'BAG2' },
      { name: 'CYST', id: 'CYST' }
    ];

    @Input('lyph') set lyph(newLyph){
        if (this._lyph !== newLyph) {
            this._lyph = newLyph;
            this.currentTopology = this.topologyOptions.find(e => e.id === newLyph?.topology) || this.topologyOptions[0];
        }
    }

    @Input('regions') set regions(newModel){
        this._searchOptions = (newModel || []).map(e => e.name + ' (' + e.id + ')');
        this._searchOptions.sort();
    };

    get lyph(){
        return this._lyph;
    }

    updateValue(prop, value) {
        console.log("INTERNAL", prop, value);
        if (this.lyph && (this.lyph[prop] !== value)) {
            let oldValue = this.lyph[prop];
            if (!value){
                delete this.lyph[prop];
            } else {
                this.lyph[prop] = value;
            }
            this.onValueChange.emit({prop: prop, value: value, oldValue: oldValue});
        }
    }

    selectBySearch(nodeLabel) {
        this.selectedRegion = nodeLabel.substring(
            nodeLabel.indexOf("(") + 1,
            nodeLabel.lastIndexOf(")")
        );
    }

    replaceRegion(nodeID){
        if (this.lyph){
            this.lyph.hostedBy = nodeID;
        }
    }
}

@NgModule({
    imports: [FormsModule, BrowserAnimationsModule, MatFormFieldModule, MatInputModule, MatTooltipModule,
        MatCheckboxModule, MatRadioModule, ResourceDeclarationModule, SearchAddBarModule],
    declarations: [LyphDeclarationEditor],
    exports: [LyphDeclarationEditor]
})
export class LyphDeclarationModule {
}