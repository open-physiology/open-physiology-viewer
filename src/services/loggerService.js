import { Injectable} from '@angular/core';

@Injectable()
export class LoggerService {
    constructor() {
        //TODO change behavior wrt config (development vs production)
        this.log   = console.log.bind(console);
        this.error = console.error.bind(console);
        this.info  = console.info.bind(console);
    }
}