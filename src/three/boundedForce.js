function constant (x) { return x; }

/**
 * Force to keep nodes within
 * @param radius
 * @param x
 * @param y
 * @param z
 * @returns {force}
 */
export default function(radius, x, y, z) {
    let nodes,
        nDim,
        strength = constant(0.1),
        strengths,
        radiuses;

    if (typeof radius !== "function") radius = constant(+radius);
    if (x === null) {x = 0;}
    if (y === null) {y = 0;}
    if (z === null) {z = 0;}

    function force(alpha) {
        for (let i = 0, n = nodes.length; i < n; ++i) {
            //TODO pick up random point within the rectangle and make the node attract to it?
            let node = nodes[i],
                dx = node.x - x || 1e-6,
                dy = (node.y || 0) - y || 1e-6,
                dz = (node.z || 0) - z || 1e-6,
                //Manhattan distance
                r = Math.abs(dx) + Math.abs(dy) + Math.abs(dz),
                k = (radiuses[i] - r) * strengths[i] * alpha / r;
            node.vx += dx * k;
            if (nDim > 1) { node.vy += dy * k; }
            if (nDim > 2) { node.vz += dz * k; }
        }
    }

    function initialize() {
        if (!nodes) return;
        let i, n = nodes.length;
        strengths = new Array(n);
        radiuses = new Array(n);
        for (i = 0; i < n; ++i) {
            radiuses[i] = +radius(nodes[i], i, nodes);
            strengths[i] = isNaN(radiuses[i]) ? 0 : +strength(nodes[i], i, nodes);
        }
    }

    force.initialize = function(initNodes, numDimensions) {
        nodes = initNodes;
        nDim = numDimensions;
        initialize();
    };

    force.strength = function(_) {
        return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength;
    };

    force.radius = function(_) {
        return arguments.length ? (radius = typeof _ === "function" ? _ : constant(+_), initialize(), force) : radius;
    };

    force.x = function(_) {
        return arguments.length ? (x = +_, force) : x;
    };

    force.y = function(_) {
        return arguments.length ? (y = +_, force) : y;
    };

    force.z = function(_) {
        return arguments.length ? (z = +_, force) : z;
    };

    return force;
}
