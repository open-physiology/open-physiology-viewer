import {Component, Input, ChangeDetectionStrategy, NgModule, ViewChild, Output, EventEmitter} from '@angular/core';
import {MatTreeFlatDataSource, MatTreeFlattener, MatTreeModule} from '@angular/material/tree';
import {FlatTreeControl} from '@angular/cdk/tree';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatButtonModule} from '@angular/material/button';
import {CommonModule} from "@angular/common";
import {MatMenuModule, MatMenuTrigger} from "@angular/material/menu";
import {LyphTreeViewControls} from "./lyphTreeViewControls";
import {COLORS} from "./utils";


@Component({
    selector: 'lyphTreeView',
    changeDetection: ChangeDetectionStrategy.Default,
    template: `
        <section class="tree-container">
            <div class="w3-row w3-margin-right">
                <button matTooltip="Expand all" class="w3-right" (click)="treeControl.expandAll()">
                    <i class="fa fa-plus"> </i>
                </button>
                <button matTooltip="Collapse all" class="w3-right" (click)="treeControl.collapseAll()">
                    <i class="fa fa-minus"> </i>
                </button>
            </div>
            <div class="title w3-margin">
                <span class="w3-padding-small" [ngClass]="{'selected': active}">{{title}}</span>
            </div>
            <mat-tree #tree id="tree" [dataSource]="dataSource" [treeControl]="treeControl">
                <mat-tree-node *matTreeNodeDef="let node" matTreeNodePadding>
                    <button mat-icon-button disabled></button>
                    <div *ngIf="ordered && (node?.index > -1)" class="w3-serif w3-padding-small">{{node.index}}</div>
                    <button class="w3-hover-border-amber" [ngClass]="{
                               'selected' : active && (node.id === (selectedNode?.id || selectedNode)),
                               'lyph'     : node.type === 'Lyph', 
                               'material' : node.type === 'Material', 
                               'undefined': node.type === 'Undefined'}"
                            (click)="selectNode(node)"
                            (contextmenu)="onRightClick($event, node)">
                        {{node.id}}
                    </button>
                    <div *ngFor="let icon of node.icons; let i = index">
                        <i class="icon-mini" [ngClass]=icon> </i>
                    </div>
                    <div *ngIf="showLayerIndex && node?.maxLayerIndex >=0 ">
                        <input type="number" matInput class="w3-input layer-index"
                               [value]="node?.layerIndex"
                               [min]=0
                               [max]="node?.maxLayerIndex"
                               (input)="updateLayerIndex(node, $event.target.value)"
                        />
                    </div>
                </mat-tree-node>
                <!--Closed node with children-->
                <mat-tree-node *matTreeNodeDef="let node; when: hasChild" matTreeNodePadding>
                    <button *ngIf="treeControl.isExpanded(node)" mat-icon-button matTreeNodeToggle
                            [attr.aria-label]="'Toggle ' + node.id">
                        <i class="fa fa-chevron-down"> </i>
                    </button>
                    <button *ngIf="!treeControl.isExpanded(node)" mat-icon-button matTreeNodeToggle
                            [attr.aria-label]="'Toggle ' + node.id">
                        <i class="fa fa-chevron-right"> </i>
                    </button>
                    <button class="w3-hover-border-amber" [ngClass]="{
                                'selected' : active && (node.id === (selectedNode?.id || selectedNode)),
                                'lyph'     : node.type === 'Lyph', 
                                'material' : node.type === 'Material', 
                                'undefined': node.type === 'Undefined'}"
                            (click)="selectNode(node)" (contextmenu)="onRightClick($event, node)">
                        {{node.id}}
                    </button>
                    <div *ngFor="let icon of node.icons; let i = index">
                        <i class="icon-mini" [ngClass]=icon> </i>
                    </div>
                    <div *ngIf="showLayerIndex && node?.maxLayerIndex">
                        <input type="number" matInput class="w3-input layer-index"
                               [value]="node?.layerIndex"
                               [min]=0
                               [max]="node?.maxLayerIndex"
                               (input)="updateLayerIndex(node, $event.target.value)"
                        />
                    </div>
                </mat-tree-node>
            </mat-tree>
        </section>

        <!--Right click-->
        <div style="visibility: hidden; position: fixed;"
             [style.left]="rtmTopLeftPosition.x"
             [style.top]="rtmTopLeftPosition.y"
             [matMenuTriggerFor]="rightTreeMenu">
        </div>

        <!--Right click menu-->
        <mat-menu #rightTreeMenu="matMenu">
            <ng-template matMenuContent let-item="item" let-type="type" let-hasParent="hasParent" let-index="index"
                         let-hasChildren="hasChildren" let-canMoveUp="canMoveUp" let-canMoveDown="canMoveDown"
                         let-inherited="inherited">
                <div *ngIf="!inherited">
                    <button mat-menu-item (click)="processOperation('delete',item, index)">Delete</button>
                    <div *ngIf="type === 'Lyph' || type === 'Material'">
                        <button mat-menu-item (click)="processOperation('deleteDef', item, index)">Delete definition
                        </button>
                        <button mat-menu-item (click)="processOperation('insert', item, index)">Add</button>
                        <button *ngIf="hasChildren" mat-menu-item
                                (click)="processOperation('removeChildren', item, index)">Remove children
                        </button>
                    </div>
                    <button *ngIf="hasParent" mat-menu-item (click)="processOperation('removeParent', item, index)">
                        Remove parent
                    </button>
                    <div *ngIf="type === 'Undefined'">
                        <button mat-menu-item (click)="processOperation('defineAsMaterial', item, index)">Define as
                            material
                        </button>
                        <button mat-menu-item (click)="processOperation('defineAsLyph', item, index)">Define as lyph
                        </button>
                    </div>
                    <button *ngIf="canMoveUp" mat-menu-item (click)="processOperation('up', item, index)">Move up
                    </button>
                    <button *ngIf="canMoveDown" mat-menu-item (click)="processOperation('down', item, index)">Move
                        down
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

        .mat-tree-node {
            min-height: 2.2em !important;
            height: 2.2em;
        }

        .mat-icon-button {
            line-height: normal;
        }

        .lyph {
            background-color: #ffe4b2;
            border: 0.067rem solid lightgrey;
        }

        .material {
            background-color: #CCFFCC;
            border: 0.067rem solid lightgrey;
        }

        .undefined {
            background-color: lightgrey;
            border: 0.067rem solid lightgrey;
        }

        .selected {
            border: 3px solid darkgrey;
        }
        
        .treeContainer{
            height: 100vh;
        }

        #tree {
            height: 80vh;
            overflow-y: auto;
        }

        button {
            background: transparent;
            color: #797979;
            font-size: 0.75rem;
            font-weight: 500;
            cursor: pointer;
        }
        
        .icon-mini {
            transform: scale(0.7);
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
export class LyphTreeView {
    _treeData = [];
    _selectedNode;
    rtmTopLeftPosition = {x: '0', y: '0'}

    @ViewChild(MatMenuTrigger, {static: true}) matMenuTrigger: MatMenuTrigger;

    @Input() title;
    @Input() showLayerIndex;
    @Input() showButtons = false;
    @Input() editable = true;
    @Input() ordered = false;
    @Input() active = false;

    @Input('treeData') set model(newTreeData) {
        this._treeData = newTreeData;
        this.dataSource.data = newTreeData;
        if (newTreeData) {
            this.selectedNode = newTreeData[0];
            if (newTreeData.length === 1) {
                this.treeControl.expandAll();
            }
        }
    }

    @Input('selectedNode') set selectedNode(node) {
        if (this._selectedNode !== node) {
            this._selectedNode = node;
            this.treeControl.expand(node);
        }
    }

    @Output() onNodeClick = new EventEmitter();
    @Output() onChange = new EventEmitter();
    @Output() onLayerIndexChange = new EventEmitter();

    get treeData() {
        return this._treeData;
    }

    get selectedNode() {
        return this._selectedNode;
    }

    _transformer = (node, level) => {
        let res = node;
        res.expandable = node?.children?.length > 0;
        res.level = level;
        res.children = res.children || [];
        res.canMoveUp = res.canMoveUp && this.ordered;
        res.canMoveDown = res.canMoveDown && this.ordered;
        return res;
    };

    treeControl = new FlatTreeControl(
        node => node.level,
        node => node.expandable
    );

    treeFlattener = new MatTreeFlattener(
        this._transformer,
        node => node.level,
        node => node.expandable,
        node => node.children
    );

    dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

    hasChild = (_, node) => node.expandable;

    onRightClick(e, node) {
        if (node.inherited){
            return;
        }
        e.preventDefault();
        this.rtmTopLeftPosition.x = e.clientX + 'px';
        this.rtmTopLeftPosition.y = e.clientY + 'px';
        this.matMenuTrigger.menuData = {
            item: node,
            type: node.type,
            hasParent: node.parent,
            hasChildren: node.children?.filter(x => !x.inherited).length > 0,
            index: node.index,
            canMoveUp: node.canMoveUp,
            canMoveDown: node.canMoveDown,
            inherited: node.inherited
        }
        this.matMenuTrigger.openMenu();
    }

    processOperation(operation, node, index) {
        this.onChange.emit({operation: operation, node: node, index: index});
    }

    updateLayerIndex(node, layerIndex) {
        this.onLayerIndexChange.emit({node: node, layerIndex: layerIndex});
    }

    selectNode(node) {
        this.selectedNode = node;
        this.onNodeClick.emit(node);
    }
}

@NgModule({
    imports: [CommonModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatInputModule,
        MatTreeModule, MatMenuModule],
    declarations: [LyphTreeView, LyphTreeViewControls],
    exports: [LyphTreeView]
})
export class LyphTreeViewModule {
}
