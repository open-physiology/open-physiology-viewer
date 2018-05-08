import { Entity } from './entityModel';

/**
 * A group of entities
 */
export class Group extends Entity {
    //properties copied from manifest by Entity constructor
}

//TODO Do we need dependencies? Use case: do not show group of neurons if neural system group is off

//TODO graph and tree must be derived from Group?
//TODO lyph and border can be also derived from Group: entities will contain all their internal content?