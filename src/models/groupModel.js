import { Entity } from './entityModel';

/**
 * A group of entities
 */
export class Group extends Entity {
    belongsTo(entity){
        return this.entities.find(e => (e === entity) || (e.id === entity.id && e.class === entity.class));
    }
}

//TODO Do we need dependencies? Use case: do not show group of neurons if neural system group is off
//TODO graph and tree must be derived from Group?
//TODO lyph and border can be also derived from Group: entities will contain all their internal content?