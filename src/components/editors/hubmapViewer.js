import {NgModule, Component} from '@angular/core';
import {CommonModule} from "@angular/common";
import {HubMapTreeNode, HubMapTreeViewModule} from "./hubmapTreeView";
import hubmapData from "../../data/hubmapSubtrees.json";
import hubmapAnnotations from "../../data/hubmapAnnotations.json";
import {MatSnackBar, MatSnackBarConfig} from "@angular/material/snack-bar";

@Component({
    selector: 'hubmapViewer',
    template: `
        <section #hubmapPanel id="hubmapPanel">
            <hubmapTreeView
                    title="Roots"
                    [treeData]="treeData"
                    [selectedNode]="selectedNode"
                    [expanded]="true"
                    (onNodeClick)="selectNode($event)"
                    (onAnnotationClick)="selectAnnotation($event)"
            >
            </hubmapTreeView>
        </section>
    `
})
/**
 * @class
 */
export class HubMapComponent {
    treeData = [];
    selectedNode = null;
    annotationMap = {};

    _snackBar;
    _snackBarConfig = new MatSnackBarConfig();

    constructor(snackBar: MatSnackBar) {
        this._snackBar = snackBar;
        this._snackBarConfig = {
            panelClass: ['w3-panel', 'w3-blue'],
            duration: 1000
        };
    }

    ngAfterViewInit() {
        hubmapAnnotations.forEach(obj => this.annotationMap[obj.node] = obj.annotations.map(s => s.substring(s.indexOf(" ")+1) ));
        const mapToNodes = (curr, parent, idx) => {
            let annotations = (curr.name in this.annotationMap)? this.annotationMap[curr.name]: null;
            return new HubMapTreeNode(curr._id, curr.name, curr._type, annotations, parent, idx,
                (curr.contains || []).map((child, i) => mapToNodes(child, curr, i)));
        };
        this.treeData = (hubmapData||[]).map(obj => mapToNodes(obj.subtree));
    }

    showMessage(message) {
        this._snackBar.open(message, "OK", this._snackBarConfig);
    }

    selectNode(node) {
        this.selectedNode = node;
    }

    selectAnnotation(node){
        this.selectedNode = node;
        this.showMessage("Copied ID to clipboard!");
    }
}

@NgModule({
    imports: [CommonModule, HubMapTreeViewModule],
    declarations: [HubMapComponent],
    exports: [HubMapComponent]
})
export class HubMapModule {
}

