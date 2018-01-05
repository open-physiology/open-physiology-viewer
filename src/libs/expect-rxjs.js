import assert from 'power-assert';

assert(window.Rx, "The boxer library expects the Rxjs library to be loaded as the window.Rx object.");

export default window.Rx;

export const Observable      = window.Rx.Observable;
export const Scheduler       = window.Rx.Scheduler;
export const Subject         = window.Rx.Subject;
export const BehaviorSubject = window.Rx.BehaviorSubject;
