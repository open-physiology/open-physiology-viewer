import { ErrorHandler, Injectable} from '@angular/core';
import { MatSnackBar, MatSnackBarConfig} from '@angular/material';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {

    config = new MatSnackBarConfig();

    constructor(snackBar: MatSnackBar) {
        this._snackBar = snackBar;
        this.config.panelClass = ['w3-panel', 'w3-red'];
        this.config.duration = 3000;
    }

    handleError(error) {
        console.error(error);
        let message = "An unexpected error occurred: " + error;
        //this._snackBar.open(message, "OK", this.config);
    }
}