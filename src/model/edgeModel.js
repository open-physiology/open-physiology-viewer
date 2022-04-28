import {
    $Field,
    $Prefix,
    getGenID,
    getNewID,
    EDGE_STROKE,
    EDGE_GEOMETRY,
    PROCESS_TYPE,
    WIRE_GEOMETRY,
    LINK_GEOMETRY,
    LYPH_TOPOLOGY, $SchemaClass
} from "./utils";
import {merge, pick} from "lodash-bound";
import {$LogMsg, logger} from "./logger";
import {VisualResource} from "./visualResourceModel";

/**
 * Abstract class to accommodate common for graph edges (Link, Wire) properties
 * @class
 * @property {EDGE_STROKE} stroke
 * @property {Number} lineWidth
 * @property {Number} length
 * @property {{x: Number, y: Number, z: Number}} arcCenter
 * @property {Array<Anchor>} hostedAnchors
 * @property {Vertice} source
 * @property {Vertice} target
 */
export class Edge extends VisualResource{

    /**
     * @property THICK
     * @property DASHED
     */
    static EDGE_STROKE   = EDGE_STROKE;
    static EDGE_GEOMETRY = EDGE_GEOMETRY;

    get isVisible(){
        return super.isVisible && (!this.source || this.source.isVisible) && (!this.target || this.target.isVisible);
    }
}

/**
 * The class to represent scaffold wires
 * @class
 * @property {Anchor} source
 * @property {Anchor} target
 * @property {WIRE_GEOMETRY} geometry
 */
export class Wire extends Edge {
    /**
     * @property LINK
     * @property ARC
     * @property SPLINE
     * @property SEMICIRCLE
     * @property RECTANGLE
     * @property ELLIPSE
     * @property INVISIBLE
     */
    static WIRE_GEOMETRY = WIRE_GEOMETRY;

    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
        json.id = json.id || getNewID(entitiesByID);
        json.class = json.class || $SchemaClass.Wire;
        const res = super.fromJSON(json, modelClasses, entitiesByID, namespace);
        //Wires are not in the force-field, so we set their length from end points
        const s = res.source && res.source.layout;
        const t = res.target && res.target.layout;
        if (s && t){
            const d = {};
            ["x", "y"].forEach(dim => d[dim] = (t[dim] || 0) - (s[dim] || 0));
            res.length = Math.sqrt( d.x * d.x + d.y * d.y + d.z * d.z);
        } else {
            res.length = 10; //TODO replace with config construct
        }
        return res;
    }

    applyToEndAnchors(handler){
        [$Field.source, $Field.target].forEach(prop => {
            if (this[prop]){
                handler(this[prop]);
            } else {
                logger.error($LogMsg.WIRE_NO_END_ANCHOR, this);
            }
        });
    }

    includeRelated(component){
        (this.hostedAnchors||[]).forEach(anchor => component.anchors.push(anchor));
        if (this.geometry !== WIRE_GEOMETRY.ELLIPSE) {
            this.applyToEndAnchors(
                (end) => {
                    if (end.generated && !component.contains(end)) {
                        component.anchors.push(end);
                        end.hidden = component.hidden;
                    }
                }
            )
        }
    }
}

/**
 * The class to visualize processes (edges)
 * @class
 * @property source
 * @property target
 * @property directed
 * @property collapsible
 * @property geometry
 * @property conveyingLyph
 * @property conveyingType
 * @property conveyingMaterials
 * @property path
 * @property hostedNodes
 * @property onBorder
 * @property levelIn
 * @property controlPoint
 * @property fasciculatesIn
 * @property nextChainStartLevels
 * @property prevChainEndLevels
 * @property endsIn
 */
export class Link extends Edge {
    /**
     * @property LINK
     * @property SEMICIRCLE
     * @property RECTANGLE
     * @property ARC
     * @property SPLINE
     * @property PATH
     * @property INVISIBLE
     */
    static LINK_GEOMETRY = LINK_GEOMETRY;

    /**
     * @property ADVECTIVE
     * @property DIFFUSIVE
     */
    static PROCESS_TYPE  = PROCESS_TYPE;

    static fromJSON(json, modelClasses = {}, entitiesByID, namespace) {
        json.id = json.id || getNewID(entitiesByID);
        [$Field.source, $Field.target].forEach(prop => json[prop] = json[prop] || getGenID($Prefix[prop], json.id));
        json.class = json.class || $SchemaClass.Link;
        const res = super.fromJSON(json, modelClasses, entitiesByID, namespace);
        //If the end nodes are fixed, compute actual link's length
        const s = res.source && res.source.layout;
        const t = res.target && res.target.layout;
        if (s && t && s.fixed && t.fixed){
            const d = {};
            ["x", "y", "z"].forEach(dim => d[dim] =  (t[dim] || 0) - (s[dim] || 0));
            res.length = Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z);
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
            [$Field.stroke]     : EDGE_STROKE.DASHED,
            [$Field.length]     : 1,
            [$Field.strength]   : 1,
            [$Field.collapsible]: true,
            [$Field.skipLabel]  : true,
            [$Field.generated]  : true
        };
    }

    static createForceLink(sourceID, targetID){
        return {
            [$Field.id]         : getGenID($Prefix.force, sourceID, targetID),
            [$Field.description]: "force",
            [$Field.source]     : sourceID,
            [$Field.target]     : targetID,
            [$Field.geometry]   : EDGE_GEOMETRY.INVISIBLE,
            // Enable for testing
            // [$Field.geometry]   : EDGE_GEOMETRY.LINK,
            // [$Field.color]      : "#FF0000",
            [$Field.length]     : 1,
            [$Field.strength]   : 1,
            [$Field.skipLabel]  : true,
            [$Field.generated]  : true
        };
    }

    createForceNodes(){
        let nodes = [null, null];
        if (this.collapsible){
            let housingLyphs = [null, null];
            [$Field.source, $Field.target].forEach((prop, i) => {
                let border = this[prop] && this[prop].hostedBy;
                if (border) {
                    housingLyphs[i] = border.onBorder && border.onBorder.host;
                } else {
                    housingLyphs[i] = this[prop] && this[prop].internalIn;
                }
                while (housingLyphs[i] && (housingLyphs[i].container || housingLyphs[i].host)) {
                   housingLyphs[i] = housingLyphs[i].container || housingLyphs[i].host;
                }
            });
            [$Field.source, $Field.target].forEach((prop, i) => {
                nodes[i] = housingLyphs[i] && housingLyphs[i].conveys && housingLyphs[i].conveys[prop];
                if (!nodes[i]){
                    //Create a tension link between lyph end and free floating end of collapsible link
                    nodes[i] = this[prop];
                }
            });
        }
        return nodes;
    }

    get isVisible(){
        return this.onBorder? this.onBorder.isVisible : super.isVisible;
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
            if (!group.contains(this.conveyingLyph)){
                group.lyphs.push(this.conveyingLyph);
                this.conveyingLyph.hidden = group.hidden;
            }
        }
        (this.hostedNodes||[]).forEach(node => {
           if (!group.contains(node)) {
              group.nodes.push(node);
              node.hidden = group.hidden;
           }
        });
        //include generated source and target nodes to the same group
        this.applyToEndNodes(
            (end) => {
                if (end.generated && !group.contains(end)) {
                    group.nodes.push(end);
                    end.hidden = group.hidden;
                }
            }
        )
    }

    get conveyingTopology(){
        let res = this.conveyingLyph && (this.conveyingLyph.topology || LYPH_TOPOLOGY.TUBE);
        if (res === LYPH_TOPOLOGY["BAG-"]){
            return LYPH_TOPOLOGY.BAG;
        }
        if (res === LYPH_TOPOLOGY["BAG+"]){
            return LYPH_TOPOLOGY.BAG2;
        }
        return res;
    }

    validate(){
        this.validateProcess();
        if (!this.source.sourceOf){
            logger.error($LogMsg.NODE_NO_LINK_REF, this);
            return;
        }
        if (!this.target.targetOf){
            logger.error($LogMsg.NODE_NO_LINK_REF, this);
            return;
        }
        if (this.source.sourceOf.length === 1 && this.target.targetOf === 1){
            this.geometry = LINK_GEOMETRY.INVISIBLE;
            this.source.invisible = true;
            this.target.invisible = true;
        }
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