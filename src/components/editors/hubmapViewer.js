import {NgModule, Component} from '@angular/core';
import {CommonModule} from "@angular/common";
import {HubMapTreeNode, HubMapTreeViewModule} from "./hubmapTreeView";
import hubmapData from "../../data/hubmapSubtrees.json";
import hubmapAnnotations from "../../data/hubmapAnnotations.json";

@Component({
    selector: 'hubmapViewer',
    template: `
        <section #hubmapPanel id="hubmapPanel">
            <hubmapTreeView
                    title="Roots"
                    [treeData]="rootTree"
                    [selectedNode]="selectedRoot"
                    [expanded]="true"
                    (onNodeClick)="selectRoot($event)"
                    (onChange)="processRootChange($event)"
            >
            </hubmapTreeView>
        </section>
    `
})
/**
 * @class
 */
export class HubMapComponent {
    rootTree = [];
    selectedRoot = null;
    hubmapLabels = {};

    ngAfterViewInit() {
        hubmapAnnotations.forEach(obj => this.hubmapLabels[obj.node] = obj.annotations);
        const mapToNodes = (curr, parent, idx) => {
            let annotations = (curr.name in this.hubmapLabels)? this.hubmapLabels[curr.name]: null;
            return new HubMapTreeNode(curr._id, curr.name, curr._type, annotations, parent, idx,
                (curr.contains || []).map((child, i) => mapToNodes(child, curr, i)));
        };
        this.rootTree = (hubmapData||[]).map(obj => mapToNodes(obj.subtree));
    }

    selectRoot(root) {
        this.selectedRoot = root;
    }
}

@NgModule({
    imports: [CommonModule, HubMapTreeViewModule],
    declarations: [HubMapComponent],
    exports: [HubMapComponent]
})
export class HubMapModule {
}

