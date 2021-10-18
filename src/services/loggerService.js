import { Injectable} from '@angular/core';

@Injectable()
export class LoggerService {
    constructor() {
        this.log   = console.log.bind(console);
        this.error = console.error.bind(console);
        this.info  = console.info.bind(console);
        this.warn  = console.warn.bind(console);
    }
}