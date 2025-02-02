import {Component, Input, NgModule, ViewChild, Output, EventEmitter} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatButtonModule} from '@angular/material/button';
import {CommonModule} from "@angular/common";
import {MatMenuModule, MatMenuTrigger} from "@angular/material/menu";
import {MatListModule} from '@angular/material/list';

import {isObject} from "lodash-bound";

import {COLORS} from "../gui/utils";

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
        this.label = label;
        this.length = length;
        this.isTemplate = isTemplate;
        this.class = cls;
        this.index = index;
        this.resource = resource;
        this.icons = [];
        this.canMoveUp = index > 0 && this.length > 1;
        this.canMoveDown = index < this.length - 1;
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
            return new this(objOrID, "Generated " + objOrID, "Undefined", length, false, idx,undefined);
        }
    }
}

@Component({
    selector: 'resourceListView',
    template: `
        <section class="list-container">
            <div class="title w3-margin">
                <span class="w3-padding-small">{{title}}</span>
            </div>
            <mat-nav-list id="nodeList" class="w3-padding-0">                
                <mat-list-item *ngFor="let node of listData">
                    <div *ngIf="ordered && (node?.index > -1)" class="w3-serif w3-padding-small">{{node.index}}</div>
                    <button class="w3-hover-pale-red w3-hover-border-grey list-node" [ngClass]="{
                               'selected'    : node.id === (selectedNode?.id || selectedNode),
                               'lyph'        : node.class === 'Lyph',
                               'template'    : node.isTemplate || node.class === 'Template',
                               'material'    : node.class === 'Material', 
                               'chain'       : node.class === 'Chain', 
                               'coalescence' : node.class === 'Coalescence',
                               'external'    : node.class === 'ExternalResource',
                               'undefined'   : node.class === 'Undefined'}"
                            (click)="selectNode(node)"
                            (contextmenu)="onRightClick($event, node)">
                        {{node.id}}
                    </button>
                    <span *ngIf="expectedClass && expectedClass !== node.class" style="color: red">!</span>
                    <div *ngFor="let icon of node.icons; let i = index">
                        <i class="icon-mini" [ngClass]=icon> </i>
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
                <button mat-menu-item (click)="processOperation('delete',item, index)">Delete</button>
                <button mat-menu-item (click)="processOperation('insert', item, index)">Add</button>
                <button *ngIf="class === 'Undefined'" mat-menu-item 
                        (click)="processOperation('defineAsLyph', item, index)">Define as lyph</button>
                <div *ngIf="ordered">
                    <button *ngIf="canMoveUp" mat-menu-item (click)="processOperation('up', item, index)">Move up
                    </button>
                    <button *ngIf="canMoveDown" mat-menu-item (click)="processOperation('down', item, index)">Move down
                    </button>
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
            border: 0.067rem solid lightgrey;
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
            background-color: lightgrey;
            border: 0.067rem solid lightgrey;
        }

        .selected {
            border: 3px solid darkgrey;
        }
        
        .listContainer{
            height: 100vh;
        }

        #nodeList {
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
            color: #797979;
            font-size: 0.75rem;
            font-weight: 500;
            cursor: pointer;
        }
    `]
})
export class ResourceListView {
    _listData = [];
    rtmTopLeftPosition = {x: '0', y: '0'}

    @ViewChild(MatMenuTrigger, {static: true}) matMenuTrigger: MatMenuTrigger;

    @Input() title;
    @Input() ordered = false;
    @Input() expectedClass;
    @Input() selectedNode;
    @Input() showMenu = true;

    @Input('listData') set model(newListData) {
        this._listData = newListData;
    }

    @Output() onNodeClick = new EventEmitter();
    @Output() onChange = new EventEmitter();

    get listData() {
        return this._listData;
    }

    onRightClick(e, node) {
        if (!this.showMenu){
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
}

@NgModule({
    imports: [CommonModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatInputModule,
        MatListModule, MatMenuModule],
    declarations: [ResourceListView],
    exports: [ResourceListView]
})
export class ResourceListViewModule {
}
