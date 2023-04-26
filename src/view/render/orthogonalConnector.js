"use strict";

var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrthogonalConnector = void 0;
/**
 * Utility Point creator
 * @param x
 * @param y
 */
function makePt(x, y) {
    return { x: x, y: y };
}
/**
 * Computes distance between two points
 * @param a
 * @param b
 */
function distance(a, b) {
    return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}
/**
 * Abstracts a Rectangle and adds geometric utilities
 */
var Rectangle = /** @class */ (function () {
    function Rectangle(left, top, width, height) {
        this.left = left;
        this.top = top;
        this.width = width;
        this.height = height;
    }
    Object.defineProperty(Rectangle, "empty", {
        get: function () {
            return new Rectangle(0, 0, 0, 0);
        },
        enumerable: false,
        configurable: true
    });
    Rectangle.fromRect = function (r) {
        return new Rectangle(r.left, r.top, r.width, r.height);
    };
    Rectangle.fromLTRB = function (left, top, right, bottom) {
        return new Rectangle(left, top, right - left, bottom - top);
    };
    Rectangle.prototype.contains = function (p) {
        return p.x >= this.left && p.x <= this.right && p.y >= this.top && p.y <= this.bottom;
    };
    Rectangle.prototype.inflate = function (horizontal, vertical) {
        return Rectangle.fromLTRB(this.left - horizontal, this.top - vertical, this.right + horizontal, this.bottom + vertical);
    };
    Rectangle.prototype.intersects = function (rectangle) {
        var thisX = this.left;
        var thisY = this.top;
        var thisW = this.width;
        var thisH = this.height;
        var rectX = rectangle.left;
        var rectY = rectangle.top;
        var rectW = rectangle.width;
        var rectH = rectangle.height;
        return (rectX < thisX + thisW) && (thisX < (rectX + rectW)) && (rectY < thisY + thisH) && (thisY < rectY + rectH);
    };
    Rectangle.prototype.union = function (r) {
        var x = [this.left, this.right, r.left, r.right];
        var y = [this.top, this.bottom, r.top, r.bottom];
        return Rectangle.fromLTRB(Math.min.apply(Math, x), Math.min.apply(Math, y), Math.max.apply(Math, x), Math.max.apply(Math, y));
    };
    Object.defineProperty(Rectangle.prototype, "center", {
        get: function () {
            return {
                x: this.left + this.width / 2,
                y: this.top + this.height / 2
            };
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rectangle.prototype, "right", {
        get: function () {
            return this.left + this.width;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rectangle.prototype, "bottom", {
        get: function () {
            return this.top + this.height;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rectangle.prototype, "location", {
        get: function () {
            return makePt(this.left, this.top);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rectangle.prototype, "northEast", {
        get: function () {
            return { x: this.right, y: this.top };
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rectangle.prototype, "southEast", {
        get: function () {
            return { x: this.right, y: this.bottom };
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rectangle.prototype, "southWest", {
        get: function () {
            return { x: this.left, y: this.bottom };
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rectangle.prototype, "northWest", {
        get: function () {
            return { x: this.left, y: this.top };
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rectangle.prototype, "east", {
        get: function () {
            return makePt(this.right, this.center.y);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rectangle.prototype, "north", {
        get: function () {
            return makePt(this.center.x, this.top);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rectangle.prototype, "south", {
        get: function () {
            return makePt(this.center.x, this.bottom);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rectangle.prototype, "west", {
        get: function () {
            return makePt(this.left, this.center.y);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Rectangle.prototype, "size", {
        get: function () {
            return { width: this.width, height: this.height };
        },
        enumerable: false,
        configurable: true
    });
    return Rectangle;
}());
/**
 * Represents a node in a graph, whose data is a Point
 */
var PointNode = /** @class */ (function () {
    function PointNode(data) {
        this.data = data;
        this.distance = Number.MAX_SAFE_INTEGER;
        this.shortestPath = [];
        this.adjacentNodes = new Map();
    }
    return PointNode;
}());
/***
 * Represents a Graph of Point nodes
 */
var PointGraph = /** @class */ (function () {
    function PointGraph() {
        this.index = {};
    }
    PointGraph.prototype.add = function (p) {
        var x = p.x, y = p.y;
        var xs = x.toString(), ys = y.toString();
        if (!(xs in this.index)) {
            this.index[xs] = {};
        }
        if (!(ys in this.index[xs])) {
            this.index[xs][ys] = new PointNode(p);
        }
    };
    PointGraph.prototype.getLowestDistanceNode = function (unsettledNodes) {
        var lowestDistanceNode = null;
        var lowestDistance = Number.MAX_SAFE_INTEGER;
        for (var _i = 0, unsettledNodes_1 = unsettledNodes; _i < unsettledNodes_1.length; _i++) {
            var node = unsettledNodes_1[_i];
            var nodeDistance = node.distance;
            if (nodeDistance < lowestDistance) {
                lowestDistance = nodeDistance;
                lowestDistanceNode = node;
            }
        }
        return lowestDistanceNode;
    };
    PointGraph.prototype.inferPathDirection = function (node) {
        if (node.shortestPath.length == 0) {
            return null;
        }
        return this.directionOfNodes(node.shortestPath[node.shortestPath.length - 1], node);
    };
    PointGraph.prototype.calculateShortestPathFromSource = function (graph, source) {
        source.distance = 0;
        var settledNodes = new Set();
        var unsettledNodes = new Set();
        unsettledNodes.add(source);
        while (unsettledNodes.size != 0) {
            var currentNode = this.getLowestDistanceNode(unsettledNodes);
            unsettledNodes.delete(currentNode);
            for (var _i = 0, _a = currentNode.adjacentNodes; _i < _a.length; _i++) {
                var _b = _a[_i], adjacentNode = _b[0], edgeWeight = _b[1];
                if (!settledNodes.has(adjacentNode)) {
                    this.calculateMinimumDistance(adjacentNode, edgeWeight, currentNode);
                    unsettledNodes.add(adjacentNode);
                }
            }
            settledNodes.add(currentNode);
        }
        return graph;
    };
    PointGraph.prototype.calculateMinimumDistance = function (evaluationNode, edgeWeigh, sourceNode) {
        var sourceDistance = sourceNode.distance;
        var comingDirection = this.inferPathDirection(sourceNode);
        var goingDirection = this.directionOfNodes(sourceNode, evaluationNode);
        var changingDirection = comingDirection && goingDirection && comingDirection != goingDirection;
        var extraWeigh = changingDirection ? Math.pow(edgeWeigh + 1, 2) : 0;
        if (sourceDistance + edgeWeigh + extraWeigh < evaluationNode.distance) {
            evaluationNode.distance = sourceDistance + edgeWeigh + extraWeigh;
            var shortestPath_1 = __spreadArray([], sourceNode.shortestPath, true);
            shortestPath_1.push(sourceNode);
            evaluationNode.shortestPath = shortestPath_1;
        }
    };
    PointGraph.prototype.directionOf = function (a, b) {
        if (a.x === b.x) {
            return 'h';
        }
        else if (a.y === b.y) {
            return 'v';
        }
        else {
            return null;
        }
    };
    PointGraph.prototype.directionOfNodes = function (a, b) {
        return this.directionOf(a.data, b.data);
    };
    PointGraph.prototype.connect = function (a, b) {
        var nodeA = this.get(a);
        var nodeB = this.get(b);
        if (!nodeA || !nodeB) {
            throw new Error("A point was not found");
        }
        nodeA.adjacentNodes.set(nodeB, distance(a, b));
    };
    PointGraph.prototype.has = function (p) {
        var x = p.x, y = p.y;
        var xs = x.toString(), ys = y.toString();
        return xs in this.index && ys in this.index[xs];
    };
    PointGraph.prototype.get = function (p) {
        var x = p.x, y = p.y;
        var xs = x.toString(), ys = y.toString();
        if (xs in this.index && ys in this.index[xs]) {
            return this.index[xs][ys];
        }
        return null;
    };
    return PointGraph;
}());
/**
 * Gets the actual point of the connector based on the distance parameter
 * @param p
 */
function computePt(p) {
    var b = Rectangle.fromRect(p.shape);
    switch (p.side) {
        case "bottom": return makePt(b.left + b.width * p.distance, b.bottom);
        case "top": return makePt(b.left + b.width * p.distance, b.top);
        case "left": return makePt(b.left, b.top + b.height * p.distance);
        case "right": return makePt(b.right, b.top + b.height * p.distance);
    }
}
/**
 * Extrudes the connector point by margin depending on it's side
 * @param cp
 * @param margin
 */
function extrudeCp(cp, margin) {
    var _a = computePt(cp), x = _a.x, y = _a.y;
    switch (cp.side) {
        case "top": return makePt(x, y - margin);
        case "right": return makePt(x + margin, y);
        case "bottom": return makePt(x, y + margin);
        case "left": return makePt(x - margin, y);
    }
}
/**
 * Returns flag indicating if the side belongs on a vertical axis
 * @param side
 */
function isVerticalSide(side) {
    return side == "top" || side == "bottom";
}
/**
 * Creates a grid of rectangles from the specified set of rulers, contained on the specified bounds
 * @param verticals
 * @param horizontals
 * @param bounds
 */
function rulersToGrid(verticals, horizontals, bounds) {
    var result = new Grid;
    verticals.sort(function (a, b) { return a - b; });
    horizontals.sort(function (a, b) { return a - b; });
    var lastX = bounds.left;
    var lastY = bounds.top;
    var column = 0;
    var row = 0;
    for (var _i = 0, horizontals_1 = horizontals; _i < horizontals_1.length; _i++) {
        var y = horizontals_1[_i];
        for (var _a = 0, verticals_1 = verticals; _a < verticals_1.length; _a++) {
            var x = verticals_1[_a];
            result.set(row, column++, Rectangle.fromLTRB(lastX, lastY, x, y));
            lastX = x;
        }
        // Last cell of the row
        result.set(row, column, Rectangle.fromLTRB(lastX, lastY, bounds.right, y));
        lastX = bounds.left;
        lastY = y;
        column = 0;
        row++;
    }
    lastX = bounds.left;
    // Last fow of cells
    for (var _b = 0, verticals_2 = verticals; _b < verticals_2.length; _b++) {
        var x = verticals_2[_b];
        result.set(row, column++, Rectangle.fromLTRB(lastX, lastY, x, bounds.bottom));
        lastX = x;
    }
    // Last cell of last row
    result.set(row, column, Rectangle.fromLTRB(lastX, lastY, bounds.right, bounds.bottom));
    return result;
}
/**
 * Returns an array without repeated points
 * @param points
 */
function reducePoints(points) {
    var result = [];
    var map = new Map();
    points.forEach(function (p) {
        var x = p.x, y = p.y;
        var arr = map.get(y) || map.set(y, []).get(y);
        if (arr.indexOf(x) < 0) {
            arr.push(x);
        }
    });
    for (var _i = 0, map_1 = map; _i < map_1.length; _i++) {
        var _a = map_1[_i], y = _a[0], xs = _a[1];
        for (var _b = 0, xs_1 = xs; _b < xs_1.length; _b++) {
            var x = xs_1[_b];
            result.push(makePt(x, y));
        }
    }
    return result;
}
/**
 * Returns a set of spots generated from the grid, avoiding colliding spots with specified obstacles
 * @param grid
 * @param obstacles
 */
function gridToSpots(grid, obstacles) {
    var obstacleCollision = function (p) { return obstacles.filter(function (o) { return o.contains(p); }).length > 0; };
    var gridPoints = [];
    for (var _i = 0, _a = grid.data; _i < _a.length; _i++) {
        var _b = _a[_i], row = _b[0], data = _b[1];
        var firstRow = row == 0;
        var lastRow = row == grid.rows - 1;
        for (var _c = 0, data_1 = data; _c < data_1.length; _c++) {
            var _d = data_1[_c], col = _d[0], r = _d[1];
            var firstCol = col == 0;
            var lastCol = col == grid.columns - 1;
            var nw = firstCol && firstRow;
            var ne = firstRow && lastCol;
            var se = lastRow && lastCol;
            var sw = lastRow && firstCol;
            if (nw || ne || se || sw) {
                gridPoints.push(r.northWest, r.northEast, r.southWest, r.southEast);
            }
            else if (firstRow) {
                gridPoints.push(r.northWest, r.north, r.northEast);
            }
            else if (lastRow) {
                gridPoints.push(r.southEast, r.south, r.southWest);
            }
            else if (firstCol) {
                gridPoints.push(r.northWest, r.west, r.southWest);
            }
            else if (lastCol) {
                gridPoints.push(r.northEast, r.east, r.southEast);
            }
            else {
                gridPoints.push(r.northWest, r.north, r.northEast, r.east, r.southEast, r.south, r.southWest, r.west, r.center);
            }
        }
    }
    // for(const r of grid) {
    //     gridPoints.push(
    //         r.northWest, r.north, r.northEast, r.east,
    //         r.southEast, r.south, r.southWest, r.west, r.center);
    // }
    // Reduce repeated points and filter out those who touch shapes
    return reducePoints(gridPoints).filter(function (p) { return !obstacleCollision(p); });
}
/**
 * Creates a graph connecting the specified points orthogonally
 * @param spots
 */
function createGraph(spots) {
    var hotXs = [];
    var hotYs = [];
    var graph = new PointGraph();
    var connections = [];
    spots.forEach(function (p) {
        var x = p.x, y = p.y;
        if (hotXs.indexOf(x) < 0)
            hotXs.push(x);
        if (hotYs.indexOf(y) < 0)
            hotYs.push(y);
        graph.add(p);
    });
    hotXs.sort(function (a, b) { return a - b; });
    hotYs.sort(function (a, b) { return a - b; });
    var inHotIndex = function (p) { return graph.has(p); };
    for (var i = 0; i < hotYs.length; i++) {
        for (var j = 0; j < hotXs.length; j++) {
            var b = makePt(hotXs[j], hotYs[i]);
            if (!inHotIndex(b))
                continue;
            if (j > 0) {
                var a = makePt(hotXs[j - 1], hotYs[i]);
                if (inHotIndex(a)) {
                    graph.connect(a, b);
                    graph.connect(b, a);
                    connections.push({ a: a, b: b });
                }
            }
            if (i > 0) {
                var a = makePt(hotXs[j], hotYs[i - 1]);
                if (inHotIndex(a)) {
                    graph.connect(a, b);
                    graph.connect(b, a);
                    connections.push({ a: a, b: b });
                }
            }
        }
    }
    return { graph: graph, connections: connections };
}
/**
 * Solves the shotest path for the origin-destination path of the graph
 * @param graph
 * @param origin
 * @param destination
 */
function shortestPath(graph, origin, destination) {
    var originNode = graph.get(origin);
    var destinationNode = graph.get(destination);
    if (!originNode) {
        throw new Error("Origin node {".concat(origin.x, ",").concat(origin.y, "} not found"));
    }
    if (!destinationNode) {
        throw new Error("Origin node {".concat(origin.x, ",").concat(origin.y, "} not found"));
    }
    graph.calculateShortestPathFromSource(graph, originNode);
    return destinationNode.shortestPath.map(function (n) { return n.data; });
}
/**
 * Given two segments represented by 3 points,
 * determines if the second segment bends on an orthogonal direction or not, and which.
 *
 * @param a
 * @param b
 * @param c
 * @return Bend direction, unknown if not orthogonal or 'none' if straight line
 */
function getBend(a, b, c) {
    var equalX = a.x === b.x && b.x === c.x;
    var equalY = a.y === b.y && b.y === c.y;
    var segment1Horizontal = a.y === b.y;
    var segment1Vertical = a.x === b.x;
    var segment2Horizontal = b.y === c.y;
    var segment2Vertical = b.x === c.x;
    if (equalX || equalY) {
        return 'none';
    }
    if (!(segment1Vertical || segment1Horizontal) ||
        !(segment2Vertical || segment2Horizontal)) {
        return 'unknown';
    }
    if (segment1Horizontal && segment2Vertical) {
        return c.y > b.y ? 's' : 'n';
    }
    else if (segment1Vertical && segment2Horizontal) {
        return c.x > b.x ? 'e' : 'w';
    }
    throw new Error('Nope');
}
/**
 * Simplifies the path by removing unnecessary points, based on orthogonal pathways
 * @param points
 */
function simplifyPath(points) {
    if (points.length <= 2) {
        return points;
    }
    var r = [points[0]];
    for (var i = 1; i < points.length; i++) {
        var cur = points[i];
        if (i === (points.length - 1)) {
            r.push(cur);
            break;
        }
        var prev = points[i - 1];
        var next = points[i + 1];
        var bend = getBend(prev, cur, next);
        if (bend !== 'none') {
            r.push(cur);
        }
    }
    return r;
}
/**
 * Helps create the grid portion of the algorithm
 */
var Grid = /** @class */ (function () {
    function Grid() {
        this._rows = 0;
        this._cols = 0;
        this.data = new Map();
    }
    Grid.prototype.set = function (row, column, rectangle) {
        this._rows = Math.max(this.rows, row + 1);
        this._cols = Math.max(this.columns, column + 1);
        var rowMap = this.data.get(row) || this.data.set(row, new Map()).get(row);
        rowMap.set(column, rectangle);
    };
    Grid.prototype.get = function (row, column) {
        var rowMap = this.data.get(row);
        if (rowMap) {
            return rowMap.get(column) || null;
        }
        return null;
    };
    Grid.prototype.rectangles = function () {
        var r = [];
        for (var _i = 0, _a = this.data; _i < _a.length; _i++) {
            var _b = _a[_i], _ = _b[0], data = _b[1];
            for (var _c = 0, data_2 = data; _c < data_2.length; _c++) {
                var _d = data_2[_c], _1 = _d[0], rect = _d[1];
                r.push(rect);
            }
        }
        return r;
    };
    Object.defineProperty(Grid.prototype, "columns", {
        get: function () {
            return this._cols;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Grid.prototype, "rows", {
        get: function () {
            return this._rows;
        },
        enumerable: false,
        configurable: true
    });
    return Grid;
}());
/**
 * Main logic wrapped in a class to hold a space for potential future functionallity
 */
var OrthogonalConnector = /** @class */ (function () {
    function OrthogonalConnector() {
    }
    OrthogonalConnector.route = function (opts) {
        var pointA = opts.pointA, pointB = opts.pointB, globalBoundsMargin = opts.globalBoundsMargin;
        var spots = [];
        var verticals = [];
        var horizontals = [];
        var sideA = pointA.side, sideAVertical = isVerticalSide(sideA);
        var sideB = pointB.side, sideBVertical = isVerticalSide(sideB);
        var originA = computePt(pointA);
        var originB = computePt(pointB);
        var shapeA = Rectangle.fromRect(pointA.shape);
        var shapeB = Rectangle.fromRect(pointB.shape);
        var bigBounds = Rectangle.fromRect(opts.globalBounds);
        var shapeMargin = opts.shapeMargin;
        var inflatedA = shapeA.inflate(shapeMargin, shapeMargin);
        var inflatedB = shapeB.inflate(shapeMargin, shapeMargin);
        // Check bounding boxes collision
        if (inflatedA.intersects(inflatedB)) {
            shapeMargin = 0;
            inflatedA = shapeA;
            inflatedB = shapeB;
        }
        var inflatedBounds = inflatedA.union(inflatedB).inflate(globalBoundsMargin, globalBoundsMargin);
        // Curated bounds to stick to
        var bounds = Rectangle.fromLTRB(Math.max(inflatedBounds.left, bigBounds.left), Math.max(inflatedBounds.top, bigBounds.top), Math.min(inflatedBounds.right, bigBounds.right), Math.min(inflatedBounds.bottom, bigBounds.bottom));
        // Add edges to rulers
        for (var _i = 0, _a = [inflatedA, inflatedB]; _i < _a.length; _i++) {
            var b = _a[_i];
            verticals.push(b.left);
            verticals.push(b.right);
            horizontals.push(b.top);
            horizontals.push(b.bottom);
        }
        // Rulers at origins of shapes
        (sideAVertical ? verticals : horizontals).push(sideAVertical ? originA.x : originA.y);
        (sideBVertical ? verticals : horizontals).push(sideBVertical ? originB.x : originB.y);
        var _loop_1 = function (connectorPt) {
            var p = computePt(connectorPt);
            var add = function (dx, dy) { return spots.push(makePt(p.x + dx, p.y + dy)); };
            switch (connectorPt.side) {
                case "top":
                    add(0, -shapeMargin);
                    break;
                case "right":
                    add(shapeMargin, 0);
                    break;
                case "bottom":
                    add(0, shapeMargin);
                    break;
                case "left":
                    add(-shapeMargin, 0);
                    break;
            }
        };
        // Points of shape antennas
        for (var _b = 0, _c = [pointA, pointB]; _b < _c.length; _b++) {
            var connectorPt = _c[_b];
            _loop_1(connectorPt);
        }
        // Sort rulers
        verticals.sort(function (a, b) { return a - b; });
        horizontals.sort(function (a, b) { return a - b; });
        // Create grid
        var grid = rulersToGrid(verticals, horizontals, bounds);
        var gridPoints = gridToSpots(grid, [inflatedA, inflatedB]);
        // Add to spots
        spots.push.apply(spots, gridPoints);
        // Create graph
        var _d = createGraph(spots), graph = _d.graph, connections = _d.connections;
        // Origin and destination by extruding antennas
        var origin = extrudeCp(pointA, shapeMargin);
        var destination = extrudeCp(pointB, shapeMargin);
        var start = computePt(pointA);
        var end = computePt(pointB);
        this.byproduct.spots = spots;
        this.byproduct.vRulers = verticals;
        this.byproduct.hRulers = horizontals;
        this.byproduct.grid = grid.rectangles();
        this.byproduct.connections = connections;
        var path = shortestPath(graph, origin, destination);
        if (path.length > 0) {
            return simplifyPath(__spreadArray(__spreadArray([start], shortestPath(graph, origin, destination), true), [end], false));
        }
        else {
            return [];
        }
    };
    OrthogonalConnector.byproduct = {
        hRulers: [],
        vRulers: [],
        spots: [],
        grid: [],
        connections: [],
    };
    return OrthogonalConnector;
}());
exports.OrthogonalConnector = OrthogonalConnector;
