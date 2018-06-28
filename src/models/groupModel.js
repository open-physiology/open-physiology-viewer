import { Entity } from './entityModel';

/**
 * A group of entities
 */
export class Group extends Entity {

    belongsTo(entity){
        return this.entities.find(e => (e === entity) || (e.id === entity.id && e.class === entity.class));
    }

    get subgroups(){
        return (this.entities||[]).filter(e => e.class === this.constructor.name);
    }

    set subgroups(subgroups){
        this.entities = [...new Set([...this.entities, ...subgroups])];
    }
}

//TODO graph and tree must be derived from Group?
//TODO lyph and border can be also derived from Group: entities will contain all their internal content?