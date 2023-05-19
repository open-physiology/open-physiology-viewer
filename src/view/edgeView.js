import {$Field, modelClasses} from "../model";
import { random_rgba } from "./utils";
import {
    extractCoords,
    THREE,
    copyCoords,
    direction,
    semicircleCurve,
    rectangleCurve,
    getPoint,
    arcCurve,
    getDefaultControlPoint,
} from "./utils";
import { DIMENSIONS, pointAlongLine } from "./render/autoLayout";
import { rotateAroundCenter } from "./render/autoLayout/transform";

import './lines/Line2.js';
import {MaterialFactory} from "./materialFactory";
import { link } from "d3-shape";

const {VisualResource, Edge, Link, Wire} = modelClasses;

/**
 * Create visual object for edge
 */
Edge.prototype.createViewObjects = function(state) {
    VisualResource.prototype.createViewObjects.call(this, state);
};

/**
 * Update visual object for edge
 */
Edge.prototype.updateViewObjects = function(state) {
    VisualResource.prototype.updateViewObjects.call(this, state);
};

Edge.prototype.getViewObject = function (state){
    let material;
    if (this.stroke === Edge.EDGE_STROKE.DASHED) {
        material = MaterialFactory.createLineDashedMaterial({color: this.color});
    } else {
        //Thick lines
        if (this.stroke === Edge.EDGE_STROKE.THICK) {
            // Line 2 method: draws thick lines
            material = MaterialFactory.createLine2Material({
                color: this.color,
                lineWidth: this.lineWidth,
                polygonOffsetFactor: this.polygonOffsetFactor
            });
        } else {
            //Normal lines
            material = MaterialFactory.createLineBasicMaterial({
                color: this.color,
                polygonOffsetFactor: this.polygonOffsetFactor
            });
        }
    }
    let geometry, obj;
    if (this.stroke === Link.EDGE_STROKE.THICK) {
        geometry = new THREE.LineGeometry();
        obj = new THREE.Line2(geometry, material);
    } else {
        geometry = new THREE.BufferGeometry();
        obj = new THREE.Line(geometry, material);
    }
    // Edge bundling breaks a link into 66 points
    this.pointLength = (!this.geometry || this.geometry === Edge.EDGE_GEOMETRY.LINK)? 2 : (this.geometry === Link.LINK_GEOMETRY.PATH)? 67 : state.edgeResolution;
    // We need better resolution for elliptic wires
    if (this.geometry === Wire.WIRE_GEOMETRY.ELLIPSE){
        this.pointLength *= 10;
    }
    if (this.stroke !== Edge.EDGE_STROKE.THICK){
         geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.pointLength * 3), 3));
    }
    obj.visible = !this.inactive;
    obj.position.z = DIMENSIONS.LINK_MIN_Z;
    return obj;
}

Edge.prototype.getCurve = function(start, end) {
    switch (this.geometry) {
        case Edge.EDGE_GEOMETRY.ARC:
            return arcCurve(start, end, extractCoords(this.arcCenter));
        case Edge.EDGE_GEOMETRY.SEMICIRCLE:
            return semicircleCurve(start, end);
        case Edge.EDGE_GEOMETRY.RECTANGLE:
            return rectangleCurve(start, end);
        case Wire.WIRE_GEOMETRY.SPLINE:
            const control = this.controlPoint? extractCoords(this.controlPoint): getDefaultControlPoint(start, end, this.curvature);
            return new THREE.QuadraticBezierCurve3(start, control, end);
        default:
            return new THREE.Line3(start, end);
    }
};

/**
 * Create visual objects for a link
 * @param state
 */
Link.prototype.createViewObjects = function(state){
    Edge.prototype.createViewObjects.call(this, state);
    //Link
    if (!this.viewObjects["main"]) {
        let obj = Edge.prototype.getViewObject.call(this, state);

        if (this.directed){
            let dir    = direction(this.source, this.target);
            let arrow  = new THREE.ArrowHelper(dir.normalize(), extractCoords(this.target),
                state.arrowLength, material.color.getHex(),
                state.arrowLength, state.arrowLength * 0.75);
            obj.add(arrow);
        }

        obj.renderOrder = 10;  // Prevents visual glitches of dark lines on top of nodes by rendering them last
        obj.userData = this;   // Attach link data
        this.viewObjects["main"] = obj;
    }

    //Link label
    this.createLabels();

    //Icon (lyph)
    if (this.conveyingLyph) {
        this.conveyingLyph.createViewObjects(state);

        // Note: we do not make conveying lyphs children of links to include them to the scene
        // because we want to have them in the main scene for highlighting
        this.viewObjects['icon']      = this.conveyingLyph.viewObjects['main'];
        this.viewObjects['iconLabel'] = this.conveyingLyph.viewObjects["label"];

        //TODO create Process resource?
        if (this.conveyingType){
            //Draw process edge - line between lyph points p0, p1
            // let edgeMaterial = MaterialFactory.createLineBasicMaterial({
            //     color: this.conveyingType === (PROCESS_TYPE.ADVECTIVE)? "#CCC": "#000",
            //     polygonOffsetFactor: this.polygonOffsetFactor
            // });
            // let edgeGeometry = new THREE.BufferGeometry();
            // edgeGeometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(2 * 3), 3));
            // this.viewObjects["edge"] = new SpriteText2D("X", state.fontParams);
        }
    }
};

Link.prototype.getCurve = function(start, end){
    let curve = new THREE.Line3(start, end);
    switch (this.geometry) {
        case Link.LINK_GEOMETRY.PATH:
            if (this.path){
                curve = new THREE.CatmullRomCurve3(this.path);
            }
            break;
        default:
            curve = Edge.prototype.getCurve.call(this, start, end);
    }
    return curve;
};

Link.prototype.regenerateFromSegments = function(segments) {
  this.viewObjects['linkSegments'] = segments ;
}

/**
 * Update visual objects for a link
 */
Link.prototype.updateViewObjects = function(state) {

  if ( this.viewObjects['linkSegments'] ) {
    const points = []
    const z = Math.floor(Math.random() * 6) + 1 ;

    const segments = this.viewObjects['linkSegments'][0] ;

    segments.forEach( segment => {
      points.push( new THREE.Vector3( segment.x, segment.y, 0 ) );
    })

    let material;
    if ( this.collapsible ) {
        material = MaterialFactory.createLineDashedMaterial({color: random_rgba()});
    } else {
        material = MaterialFactory.createLineBasicMaterial({color : random_rgba()});
    }
    
    const geometry = new THREE.BufferGeometry().setFromPoints( points );
    const line = new THREE.Line( geometry, material );

    line.userData = this;
    line.position.z = DIMENSIONS.LINK_MIN_Z;
    this.viewObjects["main"] = line ;
    line.geometry.verticesNeedUpdate = true;
    line.computeLineDistances();
    line.geometry.computeBoundingBox();
    line.geometry.computeBoundingSphere();
    this.createLabels();

    if (this.conveyingLyph){
        this.conveyingLyph.updateViewObjects(state);
        this.viewObjects['icon']      = this.conveyingLyph.viewObjects["main"];
        this.viewObjects['iconLabel'] = this.conveyingLyph.viewObjects["label"];

        let edgeObj = this.viewObjects["linkSegments"];
        if (edgeObj){
            copyCoords(edgeObj.position, this.conveyingLyph.center);
        }
    }
    if (this.conveyingLyph?.viewObjects["main"] && this.neurulated){
        let centerPoint = pointAlongLine(points[0], points[points.length - 1], .5)
         
        this.conveyingLyph.viewObjects["main"].position.x = centerPoint.x;
        this.conveyingLyph.viewObjects["main"].position.y = centerPoint.y;
        this.conveyingLyph.viewObjects["main"].position.z = DIMENSIONS.LYPH_MIN_Z * 2;
        rotateAroundCenter(lyph, host.rotation.x, host.rotation.y, host.rotation.z);
        copyCoords(this.conveyingLyph,this.conveyingLyph.viewObjects["main"].position);
    }
  }else{

    Edge.prototype.updateViewObjects.call(this, state);

    const obj = this.viewObjects["main"];
    let start = extractCoords(this.source);
    let end   = extractCoords(this.target);
    let curve = this.getCurve(start, end);
    this.center = getPoint(curve, start, end, 0.5);
    this.points = curve.getPoints? curve.getPoints(this.pointLength): [start, end];

    if (this.geometry === Link.LINK_GEOMETRY.ARC){       
        this.points = this.points.map(p => new THREE.Vector3(p.x, p.y,0));
    }

    //Merge nodes of a collapsible link
    if (this.collapsible){
        if (!this.source.isConstrained && !this.target.isConstrained) {
            copyCoords(this.source, this.center);
            copyCoords(this.target, this.center);
        } else {
            if (!this.source.isConstrained) {
                copyCoords(this.source, this.target);
            } else {
                if (!this.target.isConstrained) {
                    copyCoords(this.target, this.source);
                }
            }
        }
    }

    //Position hosted nodes
    (this.hostedNodes||[]).forEach((node, i) => {
        let d_i = node.offset !== undefined? node.offset:  (i + 1) / (this.hostedNodes.length + 1);
        const pos = getPoint(curve, start, end, d_i);
        copyCoords(node, pos);
    });

    if (this.conveyingLyph){
        this.conveyingLyph.updateViewObjects(state);
        this.viewObjects['icon']      = this.conveyingLyph.viewObjects["main"];
        this.viewObjects['iconLabel'] = this.conveyingLyph.viewObjects["label"];

        let edgeObj = this.viewObjects["edge"];
        if (edgeObj){
            copyCoords(edgeObj.position, this.conveyingLyph.center);
        }
    }

    //Update buffered geometries
    //Do not update links with fixed node positions
    if (this.geometry === Link.LINK_GEOMETRY.INVISIBLE && this.source.fixed && this.target.fixed)  { return; }

    if (obj) {
        if (this.directed && obj.children[0] && (obj.children[0] instanceof THREE.ArrowHelper)){
            let arrow  = obj.children[0];
            let dir = direction(this.source, this.target);
            let length = curve && curve.getLength? curve.getLength(): dir.length();
            let t = this.state.arrowLength / length;
            if (curve && curve.getTangent){
                dir = curve.getTangent(1 - t);
            }
            let pos = getPoint(curve, start, end, 1 - t);
            copyCoords(arrow.position, pos);
            arrow.setDirection(dir.normalize());
        }
        if (this.stroke === Link.EDGE_STROKE.THICK){
            let coordArray = [];
            this.points.forEach(p => coordArray.push(p.x, p.y, p.z));
            obj.geometry.setPositions(coordArray);
        } else {
            if (obj && this.stroke === Link.EDGE_STROKE.DASHED) {
                obj.geometry.setFromPoints(this.points);
                obj.geometry.verticesNeedUpdate = true;
                obj.computeLineDistances();
                obj.geometry.computeBoundingBox();
                obj.geometry.computeBoundingSphere();
            } else {
                let linkPos = obj.geometry.attributes && obj.geometry.attributes.position;
                if (linkPos) {
                    if ( this.neurulated && (start.y !== end.y)  && (start.x !== end.x) ) {
                        // Elevation of the curve for the link
                        let elevation = 0, height = 1.5;
                        if ( this.source?.hostedBy ) {
                            end.y < start.y ? elevation = -1 * height : elevation = height;
                        } else {
                            end.y > start.y ? elevation = -1 * height : elevation = height;
                        }

                        // Look for neurulated links whose target/source is this node
                        let neurulatedLinks = [];
                        this.source.sourceOf != undefined ? neurulatedLinks = this.source.sourceOf?.filter( l => l.neurulated ) : null;
                        this.source.targetOf != undefined ?  neurulatedLinks = neurulatedLinks.concat(this.source.targetOf?.filter( l => l.neurulated )) : null;
                        this.target.sourceOf != undefined ? neurulatedLinks = neurulatedLinks.concat(this.target.sourceOf?.filter( l => l.neurulated )) : null
                        this.target.targetOf != undefined ?  neurulatedLinks = neurulatedLinks.concat(this.target.targetOf?.filter( l => l.neurulated )) : null;
                        const neurulated = neurulatedLinks.length > 0;

                        // For Links with source/target nodes at center of lyph, create some space from center
                        let newStart = start;
                        this.source.internalIn && neurulated ? newStart = pointAlongLine(start, end, .05) : null;
                        let newEnd = end;
                        this.target.internalIn && neurulated ? newEnd = pointAlongLine(start, end, .95) : null;

                        let curvature = this.curvature ? this.curvature :elevation * (Math.abs(Math.abs(newStart.y) - Math.abs(newEnd.y)));
                        let points = [newStart, getDefaultControlPoint(newStart, newEnd, curvature), newEnd];
                        const curve3 = new THREE.SplineCurve( points);
                        this.points = curve3.getPoints(50);

                        if (this.conveyingLyph?.viewObjects["main"] && this.neurulated){
                            let centerPoint = this.points[Math.floor(this.points.length/2)];
                            this.conveyingLyph.viewObjects["main"].position.x = centerPoint.x;
                            this.conveyingLyph.viewObjects["main"].position.y = centerPoint.y;
                            this.conveyingLyph.viewObjects["main"].position.z = DIMENSIONS.LYPH_MIN_Z * 2;
                            copyCoords(this.conveyingLyph,this.conveyingLyph.viewObjects["main"].position);
                        }
                    } else {
                        this.points.forEach((p, i) => ["x", "y", "z"].forEach((dim,j) => linkPos.array[3 * i + j] = p[dim]));
                    }
                    obj.geometry.setFromPoints(this.points);
                    obj.geometry.attributes.position.needsUpdate = true;
                    obj.position.z = DIMENSIONS.LINK_MIN_Z * 2;
                    obj.geometry.verticesNeedUpdate = true;
                    obj.geometry.computeBoundingBox();
                    obj.geometry.computeBoundingSphere();
                }
            }
        }
        copyCoords(this, obj.position);
        this.updateLabels( obj.position.clone().addScalar(this.state.labelOffset.Edge));
    }
  }
};

Object.defineProperty(Link.prototype, "polygonOffsetFactor", {
    get: function() {
        return Math.min(...["source", "target"].map(prop => this[prop]?
            (this[prop].polygonOffsetFactor || 0) - 1: 0));
    }
});

/**
 * Create visual objects for a wire
 * @param state
 */
Wire.prototype.createViewObjects = function(state){
    Edge.prototype.createViewObjects.call(this, state);
    if (!this.viewObjects["main"]) {
        if (this.geometry === Wire.WIRE_GEOMETRY.INVISIBLE)  { return; }
        let obj = Edge.prototype.getViewObject.call(this, state);
        obj.renderOrder = 10;  // Prevents visual glitches of dark lines on top of nodes by rendering them last
        obj.userData = this;   // Attach link data
        obj.visible = !this.inactive;
        this.viewObjects["main"] = obj;
    }
    if ( this.viewObjects["main"] ){
        this.viewObjects["main"].geometry.verticesNeedUpdate = true;
        this.viewObjects["main"].position.z = DIMENSIONS.WIRE_MIN_Z;
        this.viewObjects["main"].geometry.computeBoundingBox();
        this.viewObjects["main"].geometry.computeBoundingSphere();
    }
    this.createLabels();
};

Wire.prototype.getCurve = function(start, end){
    switch (this.geometry) {
        case Wire.WIRE_GEOMETRY.ELLIPSE:
            let c = extractCoords(this.arcCenter);
            return new THREE.EllipseCurve(c.x, c.y, this.radius.x, this.radius.y, 0, 2*Math.PI, false);
        default:
            return Edge.prototype.getCurve.call(this, start, end);
    }
};

Wire.prototype.relocate = function(delta, epsilon = 5){
    if (this.geometry === Wire.WIRE_GEOMETRY.LINK) {
        if (Math.abs(this.source.x - this.target.x) < epsilon) {
            delta.y = 0;
        } else {
            if (Math.abs(this.source.y - this.target.y) < epsilon) {
                delta.x = 0;
            }
        }
    }
    if (this.geometry === Wire.WIRE_GEOMETRY.ELLIPSE){
        this.radius.x = Math.max(10, this.radius.x + delta.x);
        this.radius.y = Math.max(10, this.radius.y + delta.y);
    } else {
        [$Field.source, $Field.target].forEach(prop => this[prop].relocate(delta));
    }
    this.updateViewObjects(this.state);
    return [this.source, this.target];
}

/**
 * Update visual objects for a wire
 */
Wire.prototype.updateViewObjects = function(state) {
    Edge.prototype.updateViewObjects.call(this, state);

    let start = extractCoords(this.source);
    let end   = extractCoords(this.target);
    let curve = this.getCurve(start, end);
    this.center = getPoint(curve, start, end, 0.5);
    this.points = curve.getPoints? curve.getPoints(this.pointLength): [start, end];

    if ([Wire.WIRE_GEOMETRY.ARC, Wire.WIRE_GEOMETRY.ELLIPSE].includes(this.geometry)){
        this.points = this.points.map(p => new THREE.Vector3(p.x, p.y, 0));
    }

    (this.hostedAnchors||[]).forEach((anchor, i) => {
        let d_i = anchor.offset !== undefined? anchor.offset : (i + 1) / (this.hostedAnchors.length + 1);
        let pos = getPoint(curve, start, end, d_i);
        pos = new THREE.Vector3(pos.x, pos.y, 0); //Arc wires are rendered in 2d
        copyCoords(anchor, pos);
        if (anchor.viewObjects["main"]) {
            copyCoords(anchor.viewObjects["main"].position, anchor);
            anchor.updateLabels(anchor.viewObjects["main"].position.clone().addScalar(this.state.labelOffset.Vertice));
        }
        //When hosted anchor is repositioned, the wires that end in it should be updated too
        (anchor.sourceOf||[]).forEach(w => w.updateViewObjects(state));
        (anchor.targetOf||[]).forEach(w => w.updateViewObjects(state));

    });

    this.updateLabels(this.viewObjects["main"].position.clone().addScalar(this.state.labelOffset.Edge));

    if (this.geometry === Wire.WIRE_GEOMETRY.INVISIBLE)  { return; }

    const obj = this.viewObjects["main"];
    if (obj) {
        if (this.stroke === Wire.EDGE_STROKE.THICK){
            let coordArray = [];
            this.points.forEach(p => coordArray.push(p.x, p.y, p.z));
            obj.geometry.setPositions(coordArray);
            obj.computeLineDistances();
        } else {
            if (obj && this.stroke === Wire.EDGE_STROKE.DASHED) {
                obj.geometry.setFromPoints(this.points);
                obj.geometry.verticesNeedUpdate = true;
                obj.computeLineDistances();
            } else {
                let linkPos = obj.geometry.attributes && obj.geometry.attributes.position;
                if (linkPos) {
                    this.points.forEach((p, i) => p && ["x", "y", "z"].forEach((dim,j) => linkPos.array[3 * i + j] = p[dim]));
                    linkPos.needsUpdate = true;
                    obj.geometry.computeBoundingSphere();
                }
            }
        }
        obj.visible = !this.inactive;
    }
};

Object.defineProperty(Wire.prototype, "polygonOffsetFactor", {
    get: function() {
        return Math.min(...["source", "target"].map(prop => this[prop]?
            (this[prop].polygonOffsetFactor || 0) - 1: 0));
    }
});