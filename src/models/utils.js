import { Node }   from './nodeModel';
import { Border } from './borderModel';
import { Lyph }   from './lyphModel';
import { Link }   from './linkModel';
import { Group }  from './groupModel';
import { Tree }   from './treeModel';
import { Graph }  from './graphModel';
import { Material } from './materialModel';

export const modelClasses = {
    "Node"  : Node,
    "Link"  : Link,
    "Material": Material,
    "Lyph"  : Lyph,
    "Border": Border,
    "Group" : Group,
    "Tree"  : Tree,
    "Graph" : Graph
};


/**
 * Temporary - push a point to a rectangle (not tilted)
 * @param point
 * @param center
 * @param width
 * @param height
 */
export function boundToRectangle(point, center, width, height){
    point.x = Math.max(Math.min(point.x, center.x + width/2) , center.x - width/2 );
    point.y = Math.max(Math.min(point.y, center.y + height/2), center.y - height/2);
}

/**
 * Force link ends to stay inside a polygon
 * @param link
 * @param boundaryLinks
 */
export function boundToPolygon(link, boundaryLinks){
    let sourceIn = pointInPolygon(link.source, boundaryLinks);
    let targetIn = pointInPolygon(link.target, boundaryLinks);
    if (!sourceIn || !targetIn) {
        let res = getBoundaryPoint(link, boundaryLinks);
        if (res){
            if (!sourceIn){
                //We first drag the source node to the rectangle,
                //The target node should be dragged to it by the link force
                link.source.x = res.x;
                link.source.y = res.y;
            }
            else {
                //If we place both source and target to the same point, they will repel
                //So we push the target node to the rectangle only after the source node is already there
                //I think it helps to reduce edge jumping, but optionally  we can remove the above 'else' statement
                if (!targetIn){
                    link.target.x = res.x;
                    link.target.y = res.y;
                }
            }
        }
    }
}

/**
 * Checks whether the point is in a polygon
 * @param point
 * @param boundaryLinks
 * @returns {boolean}
 */
function pointInPolygon (point, boundaryLinks) {
    let x = point.x, y = point.y, inside = false;
    boundaryLinks.forEach(line2 => {
        let xi = line2.source.x, yi = line2.source.y,
            xj = line2.target.x, yj = line2.target.y;
        let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) { inside = !inside; }
    });
    return inside;
}

/**
 * Find intersection with polygon
 * @param line
 * @param boundaryLinks
 * @returns {null}
 */
function getBoundaryPoint (line, boundaryLinks){
    for (let i = 0; i < boundaryLinks.length; i++){
        let res = getLineIntersection(line, boundaryLinks[i]);
        if (res){ return res; }
    }
}

/**
 * Find intersection point of two lines
 * @param line1
 * @param line2
 * @returns {{x: null, y: null, onLine1: boolean, onLine2: boolean}} -
 *  coordinates of the intersection point and whether the point is on the first or second line
 */
function getLineIntersection(line1, line2) {
    let denominator, a, b, numerator1;//, numerator2;
    denominator = ((line2.target.y - line2.source.y) * (line1.target.x - line1.source.x)) - ((line2.target.x - line2.source.x) * (line1.target.y - line1.source.y));
    if (denominator === 0) { return }
    a = line1.source.y - line2.source.y;
    b = line1.source.x - line2.source.x;
    numerator1 = ((line2.target.x - line2.source.x) * a) - ((line2.target.y - line2.source.y) * b);
    a = numerator1 / denominator;
    //numerator2 = ((line1.target.x - line1.source.x) * a) - ((line1.target.y - line1.source.y) * b);
    //b = numerator2 / denominator;
    return {
        x: line1.source.x + (a * (line1.target.x - line1.source.x)),
        y: line1.source.y + (a * (line1.target.y - line1.source.y))
    };
}

/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
export function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
export function mergeDeep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, { [key]: {} });
                mergeDeep(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }

    return mergeDeep(target, ...sources);
}







