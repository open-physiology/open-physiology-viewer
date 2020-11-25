import {Resource} from './resourceModel';
import {
    getGenID,
    $Field,
    $Prefix
} from "./utils";
import {logger, $LogMsg} from './logger';
import {defaults} from 'lodash-bound';

/**
 * Group template
 * @property group
 */
export class GroupTemplate extends Resource{
    /**
     * Create empty group to accumulate resources generated from a template
     * @param template - tree or channel template
     * @param parentGroup - parent group
     */
    static createTemplateGroup(template, parentGroup){
        let group = template.group || {};
        group::defaults({
            [$Field.id]        : getGenID($Prefix.group, template.id),
            [$Field.name]      : template.name,
            [$Field.generated] : true
        });
        [$Field.links, $Field.nodes, $Field.lyphs].forEach(prop => {
            group[prop] = group[prop] || [];
            if (group[prop].length > 0){
                logger.warn($LogMsg.GROUP_GEN_NOT_EMPTY, prop, group[prop])
            }
        });

        if (!parentGroup.groups) { parentGroup.groups = []; }
        parentGroup.groups.push(group.id);
        return group;
    }
}
