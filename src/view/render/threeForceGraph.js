import { Group } from 'three';
import ForceGraph from './threeForceGraphKapsule.js';
import {keys} from 'lodash-bound';

/**
 * A closure-based component for the force-directed 3d graph layout
 * @param kapsule
 * @param baseClass
 * @param initKapsuleWithSelf
 * @returns {FromKapsule}
 */
function fromKapsule(kapsule, baseClass = Object, initKapsuleWithSelf = false) {

    class FromKapsule extends baseClass {
        constructor(...args) {
            super(...args);
            this.__kapsuleInstance = kapsule()(...[...(initKapsuleWithSelf ? [this] : []), ...args]);
        }
    }

    // attach kapsule props/methods to class prototype
    kapsule()::keys().forEach(m => FromKapsule.prototype[m] = function(...args) {
            const returnVal = this.__kapsuleInstance[m](...args);

            return returnVal === this.__kapsuleInstance
                ? this  // chain based on this class, not the kapsule obj
                : returnVal;
        });

    return FromKapsule;
}

export default fromKapsule(ForceGraph, Group, true);
