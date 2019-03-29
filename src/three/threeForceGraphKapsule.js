import {
    forceSimulation,
    forceLink,
    forceManyBody,
    forceCollide
} from 'd3-force-3d';

import Kapsule from 'kapsule';
import {Graph} from '../model/graphModel';
import {modelClasses} from "../model/modelClasses";
import './modelView';

/**
 * A closure-based component for the force-directed 3d graph layout
 */
export default Kapsule({
    props: {
        graphData: {
            default: Graph.fromJSON({}, modelClasses),
            onChange(_, state) { state.onFrame = null; } // Pause simulation
        },
        numDimensions: {
            default: 3,
            onChange(numDim, state) {
                if (numDim < 3) { eraseDimension(state.graphData.visibleNodes, 'z'); }

                function eraseDimension(nodes, dim) {
                    nodes.forEach(node => {
                        node[dim] = 0;          // position, set to 0 instead of deleting
                        delete node[`v${dim}`]; // velocity
                    });
                }
            }
        },
        nodeRelSize      : { default: 3  },     // volume per val unit //TODO replace with scaleFactor?
        nodeResolution   : { default: 16 },     // how many slice segments in the sphere's circumference

        linkResolution   : { default: 30 },     // number of points on curved link
        arrowLength      : {default: 40 },      // arrow length for directed links

        showLyphs        : { default: true},
        showLyphs3d      : { default: false},
        showLayers       : { default: true},
        showCoalescences : { default: true},
        showLabels       : { default: {Node: true}},

        labels           : { default: {Node: 'id', Link: 'id', Lyph: 'id', Region: 'id'}},
        labelRelSize     : { default: 0.1},
        labelOffset      : { default: {Node: 5, Link: 5, Lyph: 0, Region: 0}},
        fontParams       : { default: { font: '24px Arial', fillStyle: '#000', antialias: true }},

        d3AlphaDecay     : { default: 0.045 },
        d3VelocityDecay  : { default: 0.45 },
        warmupTicks      : { default: 0 }, // how many times to tick the force engine at init before starting to render
        cooldownTicks    : { default: 1000 },
        cooldownTime     : { default: 2000 }, // in milliseconds. Graph UI Events  need wait for this period of time before  webgl interaction is processed. (E.g. hideHighlighted() in WebGLComponent.)
        onLoading        : { default: () => {}, triggerUpdate: false },
        onFinishLoading  : { default: () => {}, triggerUpdate: false }
    },

    methods: {
        // Expose d3 forces for external manipulation
        d3Force: function(state, forceName, forceFn) {
            if (forceFn === undefined) {
                return state.simulation.force(forceName); // Force getter
            }
            state.simulation.force(forceName, forceFn); // Force setter
            return this;
        },
        tickFrame: function(state) {
            if (state.onFrame) {
                state.onFrame();
            }
            return this;
        }
    },

    stateInit: () => ({
        simulation: forceSimulation()
            .force('link', forceLink())
            .force('charge', forceManyBody(d => d.charge || 0))
            .force('collide', forceCollide(d => d.collide || 0))
        .stop()
    }),

    init(threeObj, state) {
        // Main three object to manipulate
        state.graphScene = threeObj;
    },

    update(state) {
        state.onFrame = null; // Pause simulation
        state.onLoading();

        if (state.graphData.visibleNodes.length || state.graphData.visibleLinks.length) {

            console.info('force-graph loading',
                state.graphData.visibleNodes.length + ' nodes',
                state.graphData.visibleLinks.length + ' links');
        }

        while (state.graphScene.children.length) { state.graphScene.remove(state.graphScene.children[0]) } // Clear the place

        // Add WebGL objects
        state.graphData.createViewObjects(state);

        // Feed data to force-directed layout
        let layout;
        // D3-force
        (layout = state.simulation)
            .stop()
            .alpha(1)// re-heat the simulation
            .alphaDecay(state.d3AlphaDecay)
            .velocityDecay(state.d3VelocityDecay)
            .numDimensions(state.numDimensions)
            .nodes(state.graphData.visibleNodes);

        layout.force('link').id(d => d.id).links(state.graphData.visibleLinks);

        // Initial ticks before starting to render
        for (let i = 0; i < state.warmupTicks; i++) { layout['tick'](); }

        let cntTicks = 0;
        const startTickTime = new Date();
        state.onFrame = layoutTick;
        state.onFinishLoading();

        function layoutTick() {
            if (++cntTicks > state.cooldownTicks || (new Date()) - startTickTime > state.cooldownTime) {
                // Stop ticking graph
                state.onFrame = null;
            } else { layout['tick'](); }

            state.graphData.updateViewObjects(state);
        }
    }
});
