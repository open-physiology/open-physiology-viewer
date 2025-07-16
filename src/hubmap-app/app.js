import {NgModule, Component, ErrorHandler, ChangeDetectionStrategy} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {MatListModule} from '@angular/material/list'
import {MatFormFieldModule} from '@angular/material/form-field';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatSnackBar, MatSnackBarModule} from "@angular/material/snack-bar";
import {GlobalErrorHandler} from '../services/errorHandler';

import 'hammerjs';
import "./styles/material.scss";
import 'jsoneditor/dist/jsoneditor.min.css';
import "@fortawesome/fontawesome-free/js/all.js";
import "@fortawesome/fontawesome-free/css/all.css";
import "@fortawesome/fontawesome-free/js/v4-shims";
import "@fortawesome/fontawesome-free/css/v4-shims.css";

import {HubMapModule} from "../components/editors/hubmapViewer";
import {enableProdMode} from '@angular/core';

enableProdMode();

@Component({
    selector: 'hubmap-app',
    changeDetection: ChangeDetectionStrategy.Default,
    template: `
        <!-- Header -->

        <header class="w3-bar w3-top w3-dark-grey" style="z-index:10;">
            <span class="w3-bar-item"><i class="fa fa-heartbeat w3-margin-right"> </i>Hubmap viewer
			</span>
            <span class="w3-bar-item" title="Source code">
				<a href="https://github.com/open-physiology/open-physiology-viewer"><i class="fa fa-github"> </i></a>
			</span>
            <span *ngIf="version" class="w3-bar-item w3-right">{{version}}</span>
        </header>

        <!--Main View-->
        <hubmapViewer>
        </hubmapViewer>

        <!-- Footer -->

        <footer class="w3-container w3-grey">
            <span class="w3-row w3-right">
				<i class="fa fa-code w3-padding-small"> </i>natallia.kokash@gmail.com
			</span>
            <span class="w3-row w3-right">
				<i class="fa fa-envelope w3-padding-small"> </i>bernard.de.bono@gmail.com
			</span>
        </footer>
    `,
    styles: [`       
        footer {
            position: absolute;
            bottom: 0;
            width: 100%;
        }
    `]
})
export class HubMapApp {
}

/**
 * The MainAppModule test module, which supplies the _excellent_ MainApp test application!
 */
@NgModule({
    imports: [BrowserModule, BrowserAnimationsModule, MatListModule, MatFormFieldModule, MatSnackBarModule, HubMapModule],
    declarations: [HubMapApp],
    bootstrap: [HubMapApp],
    providers: [
        {
            provide: MatSnackBar,
            useClass: MatSnackBar
        },
        {
            provide: ErrorHandler,
            useClass: GlobalErrorHandler
        }
    ]
})
export class HubMapAppModule {
}
