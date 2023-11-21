import {NgModule, Component, Input, Output, EventEmitter} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatTooltipModule} from '@angular/material/tooltip';

export const COLORS = {
  grey: 'grey',
  white: '#FFFFFF',
  inputBorderColor: '#E0E0E0',
  inputTextColor: '#797979',
  inputPlacholderColor: '#C0C0C0',
  black: '#000000',
  toggleActiveBg: '#613DB0',
  headingBg: '#F1F1F1',
};

@Component({
    selector: 'resourceDeclaration',
    template: `
        <div class="default-box">
            <div class="settings-wrap">
               <div class="default-boxContent">
                   <mat-form-field>
                        <input matInput class="w3-input"
                               placeholder="id"
                               matTooltip="Identifier"
                               [value]="resource?.id"
                               (keyup.enter)="updateValue('id', $event.target.value)"
                        >
                   </mat-form-field>
                    
                   <mat-form-field>
                        <input matInput class="w3-input"
                               placeholder="name"
                               matTooltip="Name"
                               [value]="resource?.name"
                               (keyup.enter)="updateValue('name', $event.target.value)"
                        >
                   </mat-form-field>
        
                   <div>  
                       <ul *ngFor="let term of resource?.ontologyTerms; let i = index; trackBy: trackByFn" class="w3-ul">
                           <mat-form-field class="removable_field">
                                <input matInput class="w3-input"
                                       placeholder="ontologyTerm"
                                       matTooltip="Ontology term"
                                       [value]="term"
                                       (input)="updateOneOfMany('ontologyTerms', $event.target.value, i)"
                                >
                           </mat-form-field> 
                           <button mat-menu-item (click)="deleteOneFromMany(term, 'ontologyTerms')" class="w3-right w3-hover-light-grey">
                                <i class="fa fa-trash"></i>
                           </button> 
                       </ul>
                       <button mat-menu-item (click)="addOneToMany('ontologyTerms')" class="w3-right w3-hover-light-grey">
                            <i class="fa fa-add">
                            </i>
                       </button> 
                   </div>
                </div>
            </div>
        </div> 
    `,
    styles: [`
       .mat-form-field {
          width: 100%;
       }
       
        .removable_field{            
            width : calc(100% - 48px);
        }

        :host ::ng-deep .settings-wrap {
          padding-bottom: 0.8rem;
          margin-top: 0;
          position: relative;
        }
       
        .default-box .default-box-header {
          padding: 1.067rem;
          display: flex;
          align-items: center;
        }
       
        .default-box .default-boxContent {
          padding: 1.067rem;
          font-size: 0.75rem;
          color: ${COLORS.inputTextColor};
          font-weight: 500;
        }
        .default-box .default-box-header ~ .default-boxContent {
          padding-top: 0;
        }
        :host >>> .default-box .default-boxFooter {
          text-align: right;
        }
        :host >>> .default-box .default-boxContent section section {
          display: flex;
        }
        :host >>> .default-box .default-boxContent .w3-label {
          width: 6.25rem;
          flex: none;
        }
        :host >>> .default-box .default-boxContent button {
          border: ${COLORS.inputBorderColor} 1px solid;
          background: transparent;
          color:  ${COLORS.inputTextColor};
          font-size: 0.75rem;
          font-weight: 500;
          padding: 0.313rem 0.625rem;
          margin: 0.625rem 0 0;
          cursor: pointer;
        }
        :host >>> .default-box .default-boxContent button img {
          position: relative;
          top: -2px;
        }
        :host >>> .default-box .default-boxError {
          min-height: 6.25rem;
          display: flex;
          justify-content: center;
          align-items: center;
          color:  ${COLORS.inputTextColor};
          font-size: 0.75rem;
          font-weight: 500;
        }
        :host >>> .default-box .default-boxContent ~ .default-boxError {
          padding-bottom: 2rem;
        }
        :host >>> .default-box .default-boxResult {
          border-top:${COLORS.inputBorderColor} 1px solid;
          margin: 1rem 0 0;
          padding-top: 0.625rem;
        }
        :host >>> .default-box .default-boxResult {
          display: flex;
        }
        :host >>> .default-box .default-boxResult label {
          width: 6.25rem;
          flex: none;
        }
        :host >>> .default-box .default-boxResult ~ .default-boxError {
          display: none;
        }
        :host >>> .default-box .default-boxContent button:hover {
          background: transparent !important;
          color:  ${COLORS.inputTextColor} !important;
        }
    `]
})
/**
 * The class to edit a resource field
 */
export class ResourceDeclarationEditor {
    @Input() resource;
    @Output() onValueChange = new EventEmitter();

    updateValue(prop, value) {
        if (prop === "id"){
            //NK TODO Validate by schema that it is correct
        }
        this.resource[prop] = value;
        this.onValueChange.emit({prop: prop, value: value});
    }

    updateOneOfMany(prop, value, idx) {
        if (idx > -1){
            this.resource[prop][idx] = value;
        }
        // this.onValueChange.emit({prop: prop, value: this.resource[prop]});
    }

    deleteOneFromMany(rID, prop){
        if (this.resource) {
            let idx = this.resource[prop].findIndex(m => m === rID);
            if (idx > -1) {
                this.resource[prop].splice(idx, 1);
            }
            // this.onValueChange.emit({prop: prop, value: this.resource[prop]});
        }
    }

    addOneToMany(prop){
        if (this.resource) {
            this.resource[prop] = this.resource[prop] || [];
            this.resource[prop].push(this.resource.id + "_" + prop + "_new_" + (this.resource[prop].length + 1));
            // this.onValueChange.emit({prop: prop, value: this.resource[prop]});
        }
    }

    trackByFn(index, item) {
      return index;
    }
}

@NgModule({
    imports: [FormsModule, BrowserAnimationsModule, MatFormFieldModule, MatInputModule, MatTooltipModule],
    declarations: [ResourceDeclarationEditor],
    exports: [ResourceDeclarationEditor]
})
export class ResourceDeclarationModule {
}