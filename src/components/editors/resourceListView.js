import {Component, Input, NgModule, ViewChild, Output, EventEmitter} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatButtonModule} from '@angular/material/button';
import {CommonModule} from "@angular/common";
import {MatMenuModule, MatMenuTrigger} from "@angular/material/menu";
import {MatListModule} from '@angular/material/list';
import {ColorPickerModule} from 'ngx-color-picker';
import {isObject} from "lodash-bound";
import {COLORS} from "../utils/colors";
import {MatTooltipModule} from "@angular/material/tooltip";
import {limitLabel} from "../utils/helpers";

/**
 * @class
 * @classdesc This is a resource node to display in the list
 * @property id
 * @property label
 * @property class
 * @property length
 * @property isTemplate
 * @property index
 * @property resource
 * @property icons
 */
export class ListNode {
    constructor(id, label, cls, length, isTemplate, index, resource) {
        this.id = id;
        this.label = limitLabel(label);
        this.length = length;
        this.isTemplate = isTemplate;
        this.class = cls;
        this.index = index;
        this.resource = resource;
        this.icons = [];
        this.canMoveUp = index > 0 && this.length > 1;
        this.canMoveDown = index < this.length - 1;
        this.layerIndex = resource?._layerIndex;
        this.maxLayerIndex = resource?._maxLayerIndex || (resource?.layers || []).length - 1;
    }

    /**
     * @param objOrID - Resource object or its ID
     * @param idx - position in the list
     * @param length - length of the list
     * @returns {ListNode}
     * @public
     */
    static createInstance(objOrID, idx, length = 0) {
        if (objOrID::isObject()) {
            return new this(objOrID.id, objOrID.name, objOrID._class, length, objOrID.isTemplate, idx, objOrID);
        } else {
            return new this(objOrID, "Generated " + objOrID, "Undefined", length, false, idx, undefined);
        }
    }
}

@Component({
    selector: 'resourceListView',
    template: `
        <section class="list-container">
            <div>
                <span (click)="activateList()" class="title w3-padding-small"
                      [ngClass]="{'selected': active}">{{listTitle}}</span>
                <span *ngIf="showLayerIndex" class="title w3-padding-small w3-right">Start layer</span>
            </div>

            <mat-nav-list class="w3-padding-0 node-list">
                <mat-list-item *ngFor="let node of listData">
                    <input *ngIf="showColor" class="list-node color-rect"
                           type="button"
                           (contextmenu)="preventDefault($event, node)"
                           (mousedown)="clearColor($event, node)"
                           [ngStyle]="{ 'background-color': node.resource?.color }"
                           [colorPicker]="node.color"
                           [cpOKButton]="true"
                           [cpCancelButton]="true"
                           [cpRemoveColorButton]="true"
                           [cpSaveClickOutside]="false"
                           (colorPickerSelect)="updateColor(node, $event)"
                    />
                    <div *ngIf="labeled && (node.index > -1)"
                         class="w3-padding-small">{{(node.index + 10).toString(36).toUpperCase()}}</div>
                    <div *ngIf="ordered && (node.index > -1)" class="w3-padding-small">{{node.index}}</div>
                    <button class="w3-hover-pale-red w3-hover-border-grey list-node" matTooltip={{node.id}}
                            [ngClass]="{
                               'selected'    : node.id === (selectedNode?.id || selectedNode),
                               'linked'      : node.id === (linkedNode?.id || linkedNode),                               
                               'lyph'        : node.class === 'Lyph',
                               'template'    : node.isTemplate || node.class === 'Template',
                               'material'    : node.class === 'Material', 
                               'chain'       : node.class === 'Chain', 
                               'coalescence' : node.class === 'Coalescence',
                               'external'    : node.class === 'ExternalResource',
                               'undefined'   : node.class === 'Undefined'}"
                            (click)="selectNode(node)"
                            (contextmenu)="onRightClick($event, node)">
                        {{node.label || node.id}}
                    </button>
                    <span *ngIf="expectedClass && expectedClass !== node.class" style="color: red">!</span>
                    <div *ngFor="let icon of node.icons; let i = index">
                        <i class="icon-mini" [ngClass]=icon> </i>
                    </div>

                    <div *ngIf="showLayerIndex && node?.maxLayerIndex >=0" style="margin-left: auto;">
                        <input type="number" matInput class="w3-input layer-index"
                               [value]="node?.layerIndex"
                               [min]=0
                               [max]="node?.maxLayerIndex"
                               (input)="updateLayerIndex(node, $event.target.value)"
                        />
                    </div>

                </mat-list-item>
            </mat-nav-list>
        </section>

        <!--Right click-->
        <div style="visibility: hidden; position: fixed;"
             [style.left]="rtmTopLeftPosition.x"
             [style.top]="rtmTopLeftPosition.y"
             [matMenuTriggerFor]="rightListMenu">
        </div>

        <!--Right click menu-->
        <mat-menu #rightListMenu="matMenu">
            <ng-template matMenuContent let-item="item" let-class="class" let-index="index"
                         let-canMoveUp="canMoveUp" let-canMoveDown="canMoveDown">
                <button mat-menu-item (click)="processOperation('insert', item, index)">Add</button>
                <button mat-menu-item (click)="processOperation('delete',item, index)">Delete</button>
                <button mat-menu-item (click)="processOperation('select', item, index)">Select</button>
                <button *ngIf="class === 'Undefined'" mat-menu-item
                        (click)="processOperation('defineAsLyph', item, index)">Define as lyph
                </button>
                <div *ngIf="ordered">
                    <button *ngIf="canMoveUp" mat-menu-item (click)="processOperation('up', item, index)">Move up
                    </button>
                    <button *ngIf="canMoveDown" mat-menu-item (click)="processOperation('down', item, index)">Move down
                    </button>
                    <button *ngIf="splitable" mat-menu-item (click)="processOperation('split', item, index)">Split
                    </button>
                </div>
                <div *ngFor="let action of extraActions">
                    <button *ngIf="!action.condition || action.condition(item)" mat-menu-item
                            (click)="processOperation(action.operation, item, index)">{{action.label}}</button>
                </div>
            </ng-template>
        </mat-menu>

    `,
    styles: [`

        ::ng-deep .mat-menu-content {
            padding-top: 0 !important;
            padding-bottom: 0 !important;
        }

        .title {
            font-size: 0.8rem;
            font-weight: bold;
            line-height: 0.934rem;
        }

        .mat-menu-item {
            line-height: 32px;
            height: 32px;
        }

        .list-node {
            border: 0.067rem solid ${COLORS.border};
        }

        .color-rect {
            width: 20px;
            height: 20px;
        }

        .lyph {
            background-color: ${COLORS.lyph};
        }

        .material {
            background-color: ${COLORS.material};
        }

        .template {
            background-color: ${COLORS.template};
        }

        .chain {
            background-color: ${COLORS.chain};
        }

        .coalescence {
            background-color: ${COLORS.coalescence};
        }

        .external {
            background-color: ${COLORS.external};
        }

        .undefined {
            background-color: ${COLORS.undefined};
            border: 0.067rem solid ${COLORS.border};
        }

        .selected {
            border: 3px solid ${COLORS.selectedBorder};
        }

        .linked {
            border: 3px solid ${COLORS.linkedBorder};
        }

        .list-container {
            height: 100vh;
            margin-top: 12px;
        }

        .node-list {
            height: 80vh;
            overflow-y: auto;
        }

        .icon-mini {
            transform: scale(0.7);
        }

        .mat-list-base .mat-list-item, .mat-list-base .mat-list-option {
            height: 32px;
        }

        .mat-list-item {
            min-height: 2.2em !important;
            height: 2.2em;
        }

        button {
            background: transparent;
            color: ${COLORS.buttonText};
            font-size: 0.75rem;
            font-weight: 500;
            cursor: pointer;
        }

        .layer-index {
            text-align: right;
            font: 12px sans-serif;
            background: ${COLORS.white};
            border: 0.067rem solid ${COLORS.inputBorderColor};
            color: ${COLORS.inputTextColor};
            box-sizing: border-box;
            height: 1.7rem;
            font-size: 0.8rem;
            padding: 0 0.5rem 0 1.734rem;
            margin-left: 0.2rem;
        }

    `]
})
export class ResourceListView {
    rtmTopLeftPosition = {x: '0', y: '0'}

    @ViewChild(MatMenuTrigger, {static: true}) matMenuTrigger: MatMenuTrigger;

    @Input() listTitle;
    @Input() ordered = false;
    @Input() labeled = false;
    @Input() expectedClass;
    @Input() selectedNode;
    @Input() linkedNode;
    @Input() splitable = false;
    @Input() showColor = false;
    @Input() active = false;
    @Input() extraActions = [];
    @Input() showMenu = true;
    @Input() showLayerIndex;

    @Input() listData;

    @Output() onNodeClick = new EventEmitter();
    @Output() onChange = new EventEmitter();
    @Output() onColorUpdate = new EventEmitter();
    @Output() onLayerIndexChange = new EventEmitter();

    updateLayerIndex(node, layerIndex) {
        this.onLayerIndexChange.emit({node: node, layerIndex: layerIndex});
    }

    preventDefault(e, node) {
        e.preventDefault();
        e.stopPropagation();
    }

    clearColor(e, node) {
        if (e.button === 2) {
            e.preventDefault();
            e.stopPropagation();
            if (node.resource?.color) {
                this.onColorUpdate.emit({node, undefined});
            }
        }
    }

    updateColor(node, color) {
        if (color !== node.resource?.color) {
            this.onColorUpdate.emit({node, color});
        }
    }

    onRightClick(e, node) {
        if (!this.showMenu) {
            return;
        }
        e.preventDefault();
        this.rtmTopLeftPosition.x = e.clientX + 'px';
        this.rtmTopLeftPosition.y = e.clientY + 'px';
        this.matMenuTrigger.menuData = {
            item: node,
            class: node.class,
            index: node.index,
            canMoveUp: node.canMoveUp,
            canMoveDown: node.canMoveDown
        }
        this.matMenuTrigger.openMenu();
    }

    processOperation(operation, node, index) {
        this.onChange.emit({operation: operation, node: node, index: index});
    }

    selectNode(node) {
        this.selectedNode = node;
        this.onNodeClick.emit(node);
    }

    activateList() {
        this.onNodeClick.emit();
    }
}

@NgModule({
    imports: [CommonModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatInputModule, MatTooltipModule,
        MatListModule, MatMenuModule, ColorPickerModule],
    declarations: [ResourceListView],
    exports: [ResourceListView]
})
export class ResourceListViewModule {
}
