import {Component, Input, ChangeDetectionStrategy, NgModule, ViewChild, Output, EventEmitter} from '@angular/core';
import {MatTreeFlatDataSource, MatTreeFlattener, MatTreeModule} from '@angular/material/tree';
import {FlatTreeControl} from '@angular/cdk/tree';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatButtonModule} from '@angular/material/button';
import {CommonModule} from "@angular/common";
import {MatMenuModule, MatMenuTrigger} from "@angular/material/menu";

import {isNumber, isObject} from "lodash-bound";

import {COLORS} from "../gui/utils";
import {$Field, $SchemaClass} from "../../model";
import {MatTooltipModule} from "@angular/material/tooltip";


/**
 * @class
 * @classdesc This is a lyph, material, or reference to undefined lyph to display in lyph tree viewer
 * @property id
 * @property label
 * @property type
 * @property parent
 * @property length
 * @property children
 * @property index
 * @property resource
 * @property icons
 * @property imported
 */
export class ResourceTreeNode {
    constructor(id, label, type, parent, length, children, index, resource) {
        this.id = id;
        this.label = label;
        this.parent = parent;
        this.length = length;
        this.children = children;
        this.type = type;
        this.index = index;
        this.resource = resource;
        this.icons = [];
    }

    /**
     * Create resource tree node for a given ApiNATOMY resource object or its ID
     * @param objOrID - lyph object or its identifier
     * @param parent - lyph's parent in the tree (e.g., supertype)
     * @param idx - position of the node among its siblings
     * @param length - total number of siblings
     * @returns {ResourceTreeNode} - generated tree node to display in the mat-tree-based component
     * @public
     */
    static createInstance(objOrID, parent, idx, length = 0) {
        if (objOrID::isObject()) {
            return new this(objOrID.id, objOrID.name, objOrID._class || "Undefined", parent, length, [], idx, objOrID);
        } else {
            return new this(objOrID, "Generated " + objOrID, "Undefined", parent, length, [], idx, undefined);
        }
    }

    /**
     * Prepares a nested hierarchy of lyphs to display in the lyphTreeViewer
     * @param selectedLyph - root lyph
     * @param entitiesByID - map of all resources
     * @param prop - property to build the hierarchy
     * @param includeInherited - indicates whether to include supertype properties into the hierarchy
     * @returns {([({}|ResourceTreeNode)]|[])[]}
     * @public
     */
    static preparePropertyTree(selectedLyph, entitiesByID, prop, includeInherited = false) {
        let stack = [];
        let loops = [];

        const mapToNodes = (lyphOrID, parent, idx) => {
            if (!lyphOrID) return {};
            if (parent) {
                stack.push(parent);
            }
            let lyph = lyphOrID.id ? lyphOrID : entitiesByID[lyphOrID];
            let length = parent ? (parent[prop] || []).length : 1;
            let res = this.createInstance(lyph || lyphOrID, parent, idx, length);
            if (lyph) {
                let loopStart = stack.find(x => x.id === lyph.id);
                //Loop detected
                if (loopStart) {
                    loops.push(lyph.id);
                } else {
                    res.children = (lyph[prop] || []).map((e, i) => mapToNodes(e, lyph, i));
                    if (includeInherited && lyph.supertype) {
                        let supertype = mapToNodes(lyph.supertype);
                        supertype.children.forEach(c => {
                            c.inherited = true;
                            if (!c.icons.includes(ICON.INHERITED)) {
                                c.icons.push(ICON.INHERITED);
                            }
                        });
                        if (supertype.children) {
                            res.children = res.children.concat(supertype.children);
                        }
                    }
                    if (prop === $Field.layers) {
                        (lyph.internalLyphsInLayers || []).forEach(layerIndex => {
                            if (layerIndex::isNumber() && layerIndex > -1 && layerIndex < res.children.length) {
                                res.children[layerIndex].icons.push(ICON.INTERNAL);
                            }
                        });
                    }
                }
            }
            if (parent) {
                stack.pop();
            }
            return res;
        };

        let tree = [mapToNodes(selectedLyph)];
        return [tree, loops];
    }

}

@Component({
    selector: 'resourceTreeView',
    changeDetection: ChangeDetectionStrategy.Default,
    template: `
        <section class="tree-container">
            <div class="title w3-margin">
                <span class="w3-padding-small" [ngClass]="{'selected': active}">{{title}}</span>
            </div>
            <mat-tree class="tree" [dataSource]="dataSource" [treeControl]="treeControl">
                <mat-tree-node *matTreeNodeDef="let node" matTreeNodePadding>
                    <button mat-icon-button disabled></button>
                    <button class="w3-hover-pale-red w3-hover-border-grey node-item" matTooltip={{node.label}}
                            [ngClass]="node.type"
                            (click)="selectNode(node)"
                            (contextmenu)="onRightClick($event, node)">
                        {{node.id}}
                    </button>
                   
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
                    <button class="w3-hover-pale-red w3-hover-border-grey node-item" matTooltip={{node.label}}
                            [ngClass]="node.type"
                            (click)="selectNode(node)" (contextmenu)="onRightClick($event, node)">
                        {{node.id}}
                    </button>                    
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
                         let-hasChildren="hasChildren">
                    <button mat-menu-item (click)="processOperation('delete',item, index)">Delete</button>
                    <div *ngIf="type !== 'Undefined'">
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
                        <button mat-menu-item (click)="processOperation('define', item, index)">Define</button>
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

        .node-item {
            border: 0.067rem solid lightgrey;
        }

        .Chain {
            background-color: ${COLORS.chain};
        }
        
         .Lyph {
            background-color: ${COLORS.lyph};
        }

        .Template {
            background-color: ${COLORS.template};
        }

        .Material {
            background-color: ${COLORS.material};
        }

        .Link {
            background-color: ${COLORS.link};
        }

        .Node {
            background-color: ${COLORS.node};
        }

        .Wire {
            background-color: ${COLORS.link};
        }

        .Anchor {
            background-color: ${COLORS.node};
        }

        .Region {
            background-color: ${COLORS.region};
        }

        .Coalescence {
            background-color: ${COLORS.coalescence};
        }

        .undefined {
            background-color: lightgrey;
            border: 0.067rem solid lightgrey;
        }

        .selected {
            border: 3px solid darkgrey;
        }

        .tree-container {
            height: 100vh;
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

        .icon-mini {
            transform: scale(0.7);
        }
    `]
})
export class ResourceTreeView {
    _treeData = [];
    _selectedNode;
    rtmTopLeftPosition = {x: '0', y: '0'}

    @ViewChild(MatMenuTrigger, {static: true}) matMenuTrigger: MatMenuTrigger;

    @Input() title;
    @Input() active = false;
    @Input() showMenu = true;

    @Input('treeData') set model(newTreeData) {
        this._treeData = newTreeData;
        this.dataSource.data = newTreeData;
        if (newTreeData) {
            if (newTreeData.length === 1) {
                this.treeControl.expandAll();
            }
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
            node && this.treeControl.expand(node);
        }
    }

    @Output() onNodeClick = new EventEmitter();
    @Output() onChange = new EventEmitter();

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

    onRightClick(e, node) {
        if (!this.showMenu || node.inherited || node.imported) {
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
            index: node.index
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
    imports: [CommonModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatInputModule, MatTooltipModule,
        MatTreeModule, MatMenuModule],
    declarations: [ResourceTreeView],
    exports: [ResourceTreeView]
})
export class ResourceTreeViewModule {
}
