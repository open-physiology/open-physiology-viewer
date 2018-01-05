import Rx from 'rxjs';

window.Rx = Rx;

export default window.Rx;

export const Observable      = window.Rx.Observable;
export const Scheduler       = window.Rx.Scheduler;
export const Subject         = window.Rx.Subject;
export const BehaviorSubject = window.Rx.BehaviorSubject;
