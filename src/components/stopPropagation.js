import {Directive, HostListener} from "@angular/core";

@Directive({
    selector: "[stop-propagation]"
})
export class StopPropagation
{
    @HostListener("window:keydown", ['$event'])
    onKeyDown(event:KeyboardEvent) {
        event.preventDefault();
        event.stopPropagation();
    }
}