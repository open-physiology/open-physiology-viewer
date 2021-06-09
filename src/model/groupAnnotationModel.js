import {GroupTemplate} from './groupTemplateModel';
import {
    findResourceByID,
    getNewID,
} from "./utils";
import {logger, $LogMsg} from './logger';

/**
 * Dynamic group model - properties of a
 * @property seed
 */
export class GroupAnnotation extends GroupTemplate{

    static expandTemplate(parentGroup, template){
        if (!template) {
            logger.warn($LogMsg.DYNAMIC_UNDEFINED);
            return;
        }

        if (!template.seed){
            logger.warn($LogMsg.DYNAMIC_NO_SEED, template);
            return;
        }

        let lyph = findResourceByID(parentGroup.lyphs, template.seed);
        if (!lyph){
            logger.warn($LogMsg.DYNAMIC_NO_SEED_FOUND, template);
            return;
        }

        if (lyph.isTemplate){
            logger.warn($LogMsg.DYNAMIC_ABSTRACT_SEED, lyph);
            return;
        }

        template.id = template.id || getNewID();
        template.group = GroupTemplate.createTemplateGroup(template, parentGroup);
    }
}