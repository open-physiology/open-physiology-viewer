import {Directive, HostListener} from "@angular/core";

@Directive({
    selector: "[stop-propagation]"
})
export class StopPropagation
{
    @HostListener("window:keydown", ['$event'])
    onKeyDown(event) {
        event.preventDefault();
        event.stopPropagation();
    }

    @HostListener("mousemove", ['$event'])
    onMouseMove(event) {
        event.preventDefault();
        event.stopPropagation();
    }
}