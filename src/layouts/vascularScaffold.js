import {$Field, $Prefix, findResourceByID, getFullID, getGenID, getGenName, isIncluded} from "../model/utils";

const RAIL_DISTANCE = 10;
const aV = "aV", aW = "aW", rV = "rV", rW = "rW";

export class VascularScaffold {
    constructor(scaffold) {
        this.scaffold = scaffold;
        this.scaffold.namespace = scaffold.namespace || scaffold.id;
        this.wireV = findResourceByID(scaffold.wires, "w-V-rail");
        this.wireW = findResourceByID(scaffold.wires, "w-W-rail");
        this.sV = findResourceByID(scaffold.anchors, "sV");
        this.tV = findResourceByID(scaffold.anchors, "tV");
        this.sW = findResourceByID(scaffold.anchors, "sW");
        this.tW = findResourceByID(scaffold.anchors, "tW");
    }

    createRailV0() {
        if (isIncluded(this.scaffold.wires, "w-V-rail_0")) return;
        let sV_0 = {
            [$Field.id]: "sV_0",
            [$Field.layout]: {
                x: this.sV.layout.x,
                y: this.sV.layout.y + RAIL_DISTANCE
            },
            [$Field.invisible]: true,
            [$Field.skipLabel]: true
        }
        let tV_0 = {
            [$Field.id]: "tV_0",
            [$Field.layout]: {
                x: this.tV.layout.x,
                y: this.tV.layout.y + RAIL_DISTANCE
            },
            [$Field.invisible]: true,
            [$Field.skipLabel]: true
        }
        this.wireV_0 = {
            [$Field.id]: "w-V-rail_0",
            [$Field.source]: sV_0.id,
            [$Field.target]: tV_0.id,
            [$Field.geometry]: "invisible"
        }
        this.scaffold.anchors.push(sV_0);
        this.scaffold.anchors.push(tV_0);
        this.scaffold.wires.push(this.wireV_0);
    }

    createRailW0() {
        if (findResourceByID(this.scaffold.wires, "w-W-rail_0")) return;
        let sW_0 = {
            [$Field.id]: "sW_0",
            [$Field.layout]: {
                x: this.sW.layout.x,
                y: this.sW.layout.y - RAIL_DISTANCE
            },
            [$Field.invisible]: true,
            [$Field.skipLabel]: true
        }
        let tW_0 = {
            [$Field.id]: "tW_0",
            [$Field.layout]: {
                x: this.tW.layout.x,
                y: this.tW.layout.y - RAIL_DISTANCE
            },
            [$Field.invisible]: true,
            [$Field.skipLabel]: true
        }
        this.wireW_0 = {
            [$Field.id]: "w-W-rail_0",
            [$Field.source]: sW_0.id,
            [$Field.target]: tW_0.id,
            [$Field.geometry]: "invisible"
        }
        this.scaffold.anchors.push(sW_0);
        this.scaffold.anchors.push(tW_0);
        this.scaffold.wires.push(this.wireW_0);
    }

    computeDistance(coord1, coord2) {
        if (!coord1 || !coord2) return;
        const dx = coord1.x - coord2.x;
        const dy = coord1.y - coord2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    scaleEllipse(ellipse, dx, dy) {
        if (!ellipse?.radius) return;
        ellipse.radius.x += dx;
        ellipse.radius.y += dy;
    }

    updateRails(rail1, rail2, d) {
        if (!rail1 || !rail2) return;
        let s1 = findResourceByID(this.scaffold.anchors, rail1.source);
        let s2 = findResourceByID(this.scaffold.anchors, rail2.source);
        let t1 = findResourceByID(this.scaffold.anchors, rail1.target);
        let t2 = findResourceByID(this.scaffold.anchors, rail2.target);
        let d0 = this.computeDistance(s1, s2);
        let delta = (d - d0) / 2;
        s1.layout.y -= delta;
        s2.layout.y += delta;
        t1.layout.y -= delta;
        t2.layout.y += delta;
        return delta;
    }

    updateRegion(region, delta) {
        if (!region?.points) return;
        region.points.forEach(p => p.y += delta);
    }

    updateRailRegions(d) {
        let delta = this.updateRails(d);
        let rV = findResourceByID(this.scaffold.regions, rV);
        let rW = findResourceByID(this.scaffold.regions, rW);
        this.updateRegion(rV, -delta);
        this.updateRegion(rW, delta);
    }

    assignWire(chain, anchorS, anchorT, curvature) {
        let w = {
            [$Field.id]: getGenID($Prefix.wire, chain.id),
            [$Field.name]: getGenName("Wire for", chain.name),
            [$Field.source]: anchorS,
            [$Field.target]: anchorT,
            [$Field.geometry]: "spline",
            [$Field.stroke]: "dashed",
            [$Field.curvature]: curvature
        }
        this.scaffold.wires.push(w);
        chain.wiredTo = getFullID(this.scaffold.namespace, w.id);
        return w;
    }

    getVChains(chains) {
        return (chains || []).filter(c => c.root?.anchoredTo?.id === aV);
    }

    getWChains(chains) {
        return (chains || []).filter(c => c.root?.anchoredTo?.id === aW && c.levels?.length > 1);
    }

    createAnchorRegionV(ext, wire = null) {
        let anchorX = {
            [$Field.id]: getGenID($Prefix.anchor, aV, rV, ext),
            [$Field.hostedBy]: wire?.id || this.wireV.id,
            [$Field.skipLabel]: true,
            [$Field.invisible]: true
        }
        this.scaffold.anchors.push(anchorX);
        return anchorX;
    }

    createAnchorRegionW(ext, wire = null) {
        let anchorX = {
            [$Field.id]: getGenID($Prefix.anchor, aW, rW, ext),
            [$Field.hostedBy]: wire?.id || this.wireW.id,
            [$Field.skipLabel]: true,
            [$Field.invisible]: true
        }
        this.scaffold.anchors.push(anchorX);
        return anchorX;
    }
}