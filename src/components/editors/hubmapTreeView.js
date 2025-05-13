import {Component, Input, ChangeDetectionStrategy, NgModule, ViewChild, Output, EventEmitter} from '@angular/core';
import {MatTreeFlatDataSource, MatTreeFlattener, MatTreeModule} from '@angular/material/tree';
import {FlatTreeControl} from '@angular/cdk/tree';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatButtonModule} from '@angular/material/button';
import {CommonModule} from "@angular/common";
import {ClipboardModule} from '@angular/cdk/clipboard'
import {COLORS} from "../gui/utils";

/**
 * @class
 * @classdesc This is a tree viewer for HubMap external resources
 * @property id
 * @property label
 * @property type
 * @property annotations
 * @property parent
 * @property index
 * @property children
 */
export class HubMapTreeNode {
    constructor(id, label, type, annotations, parent, index, children) {
        this.id = id;
        this.label = label;
        this.type = type;
        this.annotations = annotations;
        this.parent = parent;
        this.index = index;
        this.children = children;
    }
}

@Component({
    selector: 'hubmapTreeView',
    changeDetection: ChangeDetectionStrategy.Default,
    template: `
        <section class="tree-container">
            <div class="title w3-margin">
                <span class="w3-padding-small" [ngClass]="{'selected': active}">{{title}}</span>
            </div>
            <mat-tree class="tree" [dataSource]="dataSource" [treeControl]="treeControl">
                <mat-tree-node *matTreeNodeDef="let node;" matTreeNodePadding>
                    <button mat-icon-button disabled></button>
                    <span>
                        <button class="w3-hover-pale-red w3-hover-border-grey node-item" [ngClass]="{
                                    'root'     : node.type === 'Root', 
                                    'main'     : node.type === 'Main'}"
                                (click)="selectNode(node)">
                                {{node.label}} 
                        </button>
                        <button *ngIf=node.annotations class="w3-hover-pale-red w3-hover-border-grey node-item annotation"
                                    (click)="selectAnnotation(node)" [cdkCopyToClipboard]="node.annotations.join(', ')">
                                {{node.annotations.join(', ')}}
                        </button>
                    </span>
                </mat-tree-node>
                <!--Closed node with children--> 
                <mat-tree-node *matTreeNodeDef="let node; when: hasChild" matTreeNodePadding>
                    <button *ngIf="treeControl.isExpanded(node)" mat-icon-button matTreeNodeToggle 
                            [attr.aria-label]="'Toggle ' + node.label">
                        <i class="fa fa-chevron-down"> </i>
                    </button>
                    <button *ngIf="!treeControl.isExpanded(node)" mat-icon-button matTreeNodeToggle
                            [attr.aria-label]="'Toggle ' + node.label">
                        <i class="fa fa-chevron-right"> </i>
                    </button>
                    <span>
                        <button class="w3-hover-pale-red w3-hover-border-grey node-item" [ngClass]="{
                                    'root'     : node.type === 'Root', 
                                    'main'     : node.type === 'Main'}"
                                (click)="selectNode(node)">
                            {{node.label}} 
                        </button>
                         <button *ngIf=node.annotations class="w3-hover-pale-red w3-hover-border-grey node-item annotation"
                                (click)="selectAnnotation(node)" [cdkCopyToClipboard]="node.annotations.join(', ')">
                            {{node.annotations.join(', ')}}
                        </button>
                    </span>
                </mat-tree-node>
            </mat-tree>
        </section>
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

        .node-item {
            border: 0.067rem solid ${COLORS.default};
        }

        .root {
            background-color: ${COLORS.hubmapRoot};
        }

        .main {
            background-color: ${COLORS.hubmapMain};
        }

        .annotation {
            background-color: ${COLORS.hubmapAnnotation};
        }

        .mat-menu-item {
            line-height: 40px;
            height: 40px;
        }

        .mat-tree-node {
            min-height: 2.2em !important;
            height: 2.2em;
        }

        .mat-icon-button {
            line-height: normal;
        }

        .selected {
            border: 3px solid ${COLORS.selectedBorder};
        }

        .tree-container {
            height: 100vh;
            overflow-y: auto;
        }

        .tree {
            height: 80vh;
            overflow-y: auto;
        }

        button {
            background: transparent;
            color: ${COLORS.buttonText};
            font-size: 0.75rem;
            font-weight: 500;
            cursor: pointer;
        }

        .no-wrap {
            overflow: visible;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .tiny {
            font-size: 10px;
            padding: 0;
            margin: 0;
            text-align: center;
        }
    `]
})
export class HubMapTreeView {
    _treeData = [];
    _selectedNode;
    rtmTopLeftPosition = {x: '0', y: '0'}

    @Input() title;

    @Input('treeData') set model(newTreeData) {
        this._treeData = newTreeData;
        this.dataSource.data = newTreeData;
        if (newTreeData) {
            this.treeControl.expandAll();
        }
    }

    @Input('expanded') set expanded(isExpanded) {
        if (isExpanded) {
            this.treeControl.expandAll();
        } else {
            this.treeControl.collapseAll();
        }
    }

    @Input('selectedNode') set selectedNode(node) {
        if (this._selectedNode !== node) {
            this._selectedNode = node;
            this.treeControl.expand(node);
        }
    }

    @Output() onNodeClick = new EventEmitter();
    @Output() onAnnotationClick  = new EventEmitter();

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

    selectNode(node) {
        this.selectedNode = node;
        this.onNodeClick.emit(node);
    }

    selectAnnotation(node) {
        this.onAnnotationClick.emit(node);
    }
}

@NgModule({
    imports: [CommonModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatInputModule,
        MatTreeModule, ClipboardModule],
    declarations: [HubMapTreeView],
    exports: [HubMapTreeView]
})
export class HubMapTreeViewModule {
}
