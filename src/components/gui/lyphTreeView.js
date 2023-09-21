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
        <section>
            {{title}}
            <div class="default-box">
                <mat-tree #tree id="tree" [dataSource]="dataSource" [treeControl]="treeControl">
                    <mat-tree-node *matTreeNodeDef="let node" matTreeNodePadding>
                        <div>
                            <button mat-icon-button disabled></button>
                            <button [ngClass]="{
                                   'selected' : active && (node.id === selectedNode?.id),
                                   'lyph'     : node.type === 'Lyph', 
                                   'material' : node.type === 'Material', 
                                   'undefined': node.type === 'Undefined'}"
                                    (click)="selectedNode = node" (contextmenu)="onRightClick($event, node)">
                                {{node.id}}
                            </button>
                        </div>
                        <div *ngFor="let icon of node.icons; let i = index">
                            <i class="icon-mini" [ngClass]=icon> </i>
                        </div>
                        <div *ngIf="showLayerIndex && node?.maxLayerIndex">
                            <input type="number" matInput class="w3-input w3-margin-small layer-index"
                               [value]="node?.layerIndex"
                               [min]=0    
                               [max]="node?.maxLayerIndex"    
                            />
                        </div>
                    </mat-tree-node>
                    <mat-tree-node *matTreeNodeDef="let node; when: hasChild" matTreeNodePadding>
                        <button *ngIf="treeControl.isExpanded(node)" mat-icon-button matTreeNodeToggle
                                [attr.aria-label]="'Toggle ' + node.id">
                            <i class="fa fa-chevron-down"> </i>
                        </button>
                        <button *ngIf="!treeControl.isExpanded(node)" mat-icon-button matTreeNodeToggle
                                [attr.aria-label]="'Toggle ' + node.id">
                            <i class="fa fa-chevron-right"> </i>
                        </button>
                        <button [ngClass]="{
                                'selected' : active && (node.id === selectedNode?.id),
                                'lyph'     : node.type === 'Lyph', 
                                'material' : node.type === 'Material', 
                                'undefined': node.type === 'Undefined'}"
                                (click)="selectedNode = node" (contextmenu)="onRightClick($event, node)">
                            {{node.id}}
                        </button>
                        <div *ngFor="let icon of node.icons; let i = index">
                            <i class="icon-mini" [ngClass]=icon> </i>
                        </div>
                    </mat-tree-node>
                </mat-tree>
            </div>
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
                    <div *ngIf="type === 'Lyph' || type === 'Material'">
                        <button mat-menu-item (click)="deleteLyph(item, index)">Delete</button>
                        <button *ngIf="!hasChildren" mat-menu-item (click)="deleteDefinition(item, index)">Delete definition</button>
                        <button *ngIf="!hasParent" mat-menu-item (click)="addLyph(item, index)">Add</button>
                        <button *ngIf="hasChildren" mat-menu-item (click)="removeChildren(item, index)">Remove children</button>
                    </div>
                    <button *ngIf="hasParent" mat-menu-item (click)="remove(item)">Remove</button>
                    <div *ngIf="type === 'Undefined'">
                        <button mat-menu-item (click)="defineAsMaterial(item)">Define as material</button>
                        <button mat-menu-item (click)="defineAsLyph(item)">Define as lyph</button>
                    </div>
                    <button *ngIf="canMoveUp" mat-menu-item (click)="moveUp(item, index)">Move up</button>
                    <button *ngIf="canMoveDown" mat-menu-item (click)="moveDown(item, index)">Move down</button>
                </div>
            </ng-template>
        </mat-menu>

    `,
    styles: [`
        mat-menu-item {
            padding: 0;
        }

        #matMenu- > div {
            padding: 0;
        }

        .mat-tree-node {
            min-height: 2em !important;
            height: 2em;
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

        #tree {
            height: 100vh;
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
         }
    `]
})
export class LyphTreeView {

    @ViewChild('tree') tree;
    @ViewChild(MatMenuTrigger, {static: true}) matMenuTrigger: MatMenuTrigger;

    @Output() onNodeClick = new EventEmitter();
    @Output() onChange = new EventEmitter();

    _treeData = [];
    rtmTopLeftPosition = {x: '0', y: '0'}

    @Input() title;
    @Input() showLayerIndex;
    @Input() showButtons = false;
    @Input() editable = true;
    @Input() ordered = false;
    @Input() active = true;

    @Input('treeData') set model(newTreeData) {
        this._treeData = newTreeData;
        this.dataSource.data = newTreeData;
    }

    ngAfterInitView() {
        if (this.tree?.treeModel?.roots?.length > 0) {
            this.selectedNode = this.tree.treeModel.roots[0];
        }
    }

    get treeData(){
        return this._treeData;
    }

    get selectedNode() {
        return this._selectedNode;
    }

    set selectedNode(node) {
        this._selectedNode = node;
        this.onNodeClick.emit(node);
    }

    _transformer = (node, level) => {
        return {
            expandable: node?.children?.length > 0,
            id: node.id,
            label: node.label,
            level: level,
            index: node.index,
            parent: node.parent,
            children: node.children || [],
            type: node.type,
            canMoveUp: node.canMoveUp,
            canMoveDown: node.canMoveDown,
            icons: node.icons,
            layerIndex: node.layerIndex,
            maxLayerIndex: node.maxLayerIndex || -1,
            inherited: node.inherited
        };
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
        e.preventDefault();
        this.rtmTopLeftPosition.x = e.clientX + 'px';
        this.rtmTopLeftPosition.y = e.clientY + 'px';
        this.matMenuTrigger.menuData = {
            item: node.id,
            type: node.type,
            hasParent: node.parent,
            hasChildren: (node.children || []).length > 0,
            index: node.index,
            canMoveUp: node.canMoveUp,
            canMoveDown: node.canMoveDown,
            inherited: node.inherited
        }
        this.matMenuTrigger.openMenu();
    }

    deleteLyph(node, index) {
        this.onChange.emit({operation: "delete", node: node, index: index});
    }

    deleteDefinition(node, index) {
        this.onChange.emit({operation: "deleteDef", node: node, index: index});
    }

    addLyph(node, index) {
        this.onChange.emit({operation: "insert", node: node, index: index});
    }

    remove(node, index) {
        this.onChange.emit({operation: "remove", node: node, index: index});
    }

    removeChildren(node) {
        this.onChange.emit({operation: "removeChildren", node: node});
    }

    defineAsMaterial(node) {
        this.onChange.emit({operation: "defineMaterial", node: node});
    }

    defineAsLyph(node) {
        this.onChange.emit({operation: "defineLyph", node: node});
    }

    moveUp(node, i) {
        this.onChange.emit({operation: "up", node: node, index: i});
    }

    moveDown(node, i) {
        this.onChange.emit({operation: "down", node: node, index: i});
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
