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
                        <mat-radio-group aria-label="Topology">
                            <mat-radio-button value="TUBE" class="w3-margin-right" (change)="updateProperty('topology', 'TUBE')">TUBE</mat-radio-button>
                            <mat-radio-button value="CYST" class="w3-margin-right" (change)="updateProperty('topology', 'CYST')">CYST</mat-radio-button>
                            <mat-radio-button value="BAG+" class="w3-margin-right" (change)="updateProperty('topology', 'BAG+')">BAG+</mat-radio-button>
                            <mat-radio-button value="BAG-" (change)="updateProperty('topology', 'BAG-')">BAG-</mat-radio-button>
                        </mat-radio-group>
                    </section>

                    <mat-checkbox matTooltip="Indicates that the lyph defines layers for its subtypes"
                              labelPosition="after"
                              [checked]="lyph?.isTemplate"
                              (change)="updateProperty('isTemplate', $event.checked)"
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
                            (keyup.enter)="updateProperty('name', $event.target.value)"
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
    @Input() lyph;
    @Output() onValueChange = new EventEmitter();

    @Input('regions') set value(newModel){
        this._searchOptions = (newModel || []).map(e => e.name + ' (' + e.id + ')');
        this._searchOptions.sort();
    };

    updateProperty({prop, value}) {
        if (this.lyph) {
            this.lyph[prop] = value;
            if (this.lyph.resource){
                this.lyph.resource[prop] = value;
            }
        }
        this.onValueChange.emit({prop, value})
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