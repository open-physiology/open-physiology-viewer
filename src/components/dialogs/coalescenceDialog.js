import {Component, ElementRef, Inject, ViewChild} from '@angular/core';
import {
    MAT_DIALOG_DATA,
    MatDialogRef
} from '@angular/material/dialog';
import {drawSvgCoalescence} from '../utils/svgCoalescence';
import * as d3 from "d3";

window.d3 = d3;

@Component({
    selector: 'importDialog',
    template: `
        <button class="w3-bar-item w3-hover-light-grey w3-right" (click)="draw()" title="Refresh">
            <i class="fa fa-refresh"> </i>
        </button>
        <b mat-dialog-title>Coalescence {{coalescence?.name || coalescence?.id}}</b>
        <div mat-dialog-content #svgClsContainer id="svgClsContainer">
            <svg #svg></svg>
            <div #tooltip class="tooltip"></div>
        </div>
        <div mat-dialog-actions align="end">
            <button mat-button title="Cancel" (click)="onNoClick()">Close</button>
        </div>
    `,
    styles: [`
        .full-width {
            width: 100%;
        }

        .tooltip {
            position: absolute;
            padding: 2px;
            background-color: #f5f5f5;
            font: 12px sans-serif;
            border: 1px solid #666;
            pointer-events: none;
        }

        #svgClsContainer {
            height: 80%;
        }
    `]
})
export class CoalescenceDialog {
    dialogRef;
    coalescence;
    @ViewChild('svgClsContainer') svgClsContainer: ElementRef;
    @ViewChild('svg') svgRef: ElementRef;
    @ViewChild('tooltip') tooltipRef: ElementRef;

    constructor(dialogRef: MatDialogRef, @Inject(MAT_DIALOG_DATA) data) {
        this.dialogRef = dialogRef;
        this.coalescence = data.coalescence;
    }

    ngAfterViewInit() {
        this.width = this.svgClsContainer.nativeElement.clientWidth;
        this.height = this.svgClsContainer.nativeElement.clientHeight;
        this.draw();
    }

    draw() {
        let svg = d3.select(this.svgRef.nativeElement).attr("width", this.width).attr("height", this.height);
        //Clean the view
        svg.selectAll('g').remove();
        let tooltip = d3.select(this.tooltipRef.nativeElement).style("opacity", 0);
        drawSvgCoalescence(this.coalescence, svg, tooltip);
    }

    onNoClick() {
        this.dialogRef.close();
    }
}

