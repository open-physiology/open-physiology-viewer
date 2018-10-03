import { ErrorHandler, Injectable} from '@angular/core';
import { ToastyService, ToastOptions, ToastData } from 'ng2-toasty';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    constructor(toastyService: ToastyService) {
        this._toastyService = toastyService;
    }

    handleError(error) {
        console.error(error);
        this.publishToast(error, "An unexpected error occured: " + error);
    }

    publishToast(error, msg) {
        let title = "Error " + (error.statusCode ? error.statusCode : '');
        let message = msg ? msg : '' + error.body ? error.body : '';

        // Create the instance of ToastOptions
        let toastOptions: ToastOptions = {
            title     : title,
            msg       : message,
            showClose : true,
            timeout   : 5000,
            theme     : 'bootstrap',
            onAdd     : (toast: ToastData) => {},
            onRemove  : (toast: ToastData) => {}
        };
        this._toastyService.error(toastOptions);
    }
}