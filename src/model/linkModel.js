import {$Field, $Prefix, getGenID, getNewID, LINK_STROKE, PROCESS_TYPE} from "./utils";
import {merge, pick} from "lodash-bound";
import {$LogMsg, logger} from "./logger";
import {VisualResource} from "./visualResourceModel";

/**
 *  The class to visualize processes (edges)
 * @class
 * @property source
 * @property target
 * @property directed
 * @property collapsible
 * @property geometry
 * @property conveyingLyph
 * @property conveyingType
 * @property conveyingMaterials
 * @property stroke
 * @property path
 * @property lineWidth
 * @property hostedNodes
 * @property onBorder
 * @property levelIn
 */
export class Link extends VisualResource {

    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
        json.id = json.id || getNewID(entitiesByID);
        json.source = json.source || getGenID($Prefix.source, json.id);
        json.target = json.target || getGenID($Prefix.target, json.id);
        const res = super.fromJSON(json, modelClasses, entitiesByID, namespace);
        //If the end nodes are fixed, compute actual link's length
        const s = res.source && res.source.layout;
        const t = res.target && res.target.layout;
        if (s && t && s.fixed && t.fixed){
            const d = {};
            ["x", "y", "z"].forEach(dim => d[dim] =  (t[dim] || 0) - (s[dim] || 0));
            res.length = Math.sqrt( d.x * d.x + d.y * d.y + d.z * d.z);
        }
        return res;
    }

    static clone(sourceLink, targetLink){
        if (!sourceLink || !targetLink) { return; }
        targetLink.cloneOf = sourceLink.id;
        targetLink::merge(sourceLink::pick([$Field.conveyingType, $Field.conveyingMaterials, $Field.color]));
        targetLink.skipLabel = true;
        targetLink.generated = true;
    }

    static createCollapsibleLink(sourceID, targetID){
        return {
            [$Field.id]         : getGenID($Prefix.link, sourceID, targetID),
            [$Field.source]     : sourceID,
            [$Field.target]     : targetID,
            [$Field.stroke]     : LINK_STROKE.DASHED,
            [$Field.length]     : 1,
            [$Field.strength]   : 1,
            [$Field.collapsible]: true,
            [$Field.skipLabel]  : true,
            [$Field.generated]  : true
        };
    }

    get isVisible(){
        return (this.onBorder? this.onBorder.isVisible : super.isVisible) && this.source && this.source.isVisible && this.target && this.target.isVisible;
    }

    applyToEndNodes(handler){
        [$Field.source, $Field.target].forEach(prop => {
            if (this[prop]){
                handler(this[prop]);
            } else {
                logger.error($LogMsg.LINK_NO_END_NODE, this);
            }
        });
    }

    includeRelated(group){
        if (this.conveyingLyph) {
            if (!group.lyphs.find(lyph => lyph.id === this.conveyingLyph.id)){
                group.lyphs.push(this.conveyingLyph);
            }
        }
        //include generated source and target nodes to the same group
        this.applyToEndNodes(
            (end) => {
                if (end.generated && !group.nodes.find(node => node.id === end.id)) {
                    group.nodes.push(end);
                }
            }
        )
    }

    validateProcess(){
        if (this.conveyingLyph){
            let layers = this.conveyingLyph.layers || [this.conveyingLyph];
            if (layers[0] && layers[0].materials){
                if (this.conveyingType === PROCESS_TYPE.ADVECTIVE){
                    if (!this.conveyingMaterials || this.conveyingMaterials.length === 0){
                        this.conveyingMaterials = layers[0].materials;
                    } else {
                        let diff = (layers[0].materials || []).filter(x => !(this.conveyingMaterials||[]).find(e => e.id === x.id));
                        if (diff.length > 0){
                            logger.warn($LogMsg.PROCESS_NOT_ADVECTIVE, this.id, diff);
                        }
                    }
                } else {
                    let nonConveying = (this.conveyingMaterials||[]).filter(x => !(layers[0].materials || []).find(e => e.id === x.id));
                    if (nonConveying.length > 0){
                        logger.warn($LogMsg.PROCESS_NOT_DIFFUSIVE, this.id, nonConveying);
                    }
                }
            }
        }
    }
}