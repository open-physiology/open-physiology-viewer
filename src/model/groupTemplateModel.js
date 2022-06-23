import {Resource} from './resourceModel';
import {
    $Field,
    $Prefix,
    getGenID,
    getFullID,
    refToResource,
    genResource
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
        group.id = group.id || getGenID($Prefix.group, template.id);
        let existing = refToResource(group.id, parentGroup, $Field.groups);
        if (existing){
            logger.warn($LogMsg.DYNAMIC_GROUP_EXISTS, group.id);
            group = existing;
        } else {
            group::defaults({
                [$Field.name]      : template.name,
                [$Field.hidden]    : template.hasOwnProperty($Field.hidden)? template.hidden: true
            });
            parentGroup.groups = parentGroup.groups || [];
            parentGroup.groups.push(group.id);
            group = genResource(group, "groupTemplateModel.createTemplateGroup (Group)");
        }
        group.namespace = group.namespace || template.namespace || parentGroup.namespace;
        group.fullID = getFullID(group.namespace, group.id);

        [$Field.links, $Field.nodes, $Field.lyphs].forEach(prop => {
            group[prop] = group[prop] || [];
            if (group[prop].length > 0){
                logger.warn($LogMsg.GROUP_GEN_NOT_EMPTY, prop, group[prop])
            }
        });

        [$Field.external, $Field.references, $Field.ontologyTerms].forEach(prop => {
            group[prop] = group[prop] || [];
            (template.prop||[]).forEach(e => group[prop].push(e));
        })

        return group;
    }

    static validateTemplate(template){
        return true;
    }
}
