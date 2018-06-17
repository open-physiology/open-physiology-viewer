import {
    forceSimulation,
    forceLink,
    forceManyBody,
    forceCollide
} from 'd3-force-3d';

import Kapsule from 'kapsule';
import { MaterialFactory } from './materialFactory';

import {Graph} from '../models/graphModel';

export default Kapsule({
    props: {
        graphData: {
            default: Graph.fromJSON({nodes: [], links: []}),
            onChange(_, state) { state.onFrame = null; } // Pause simulation
        },
        numDimensions: {
            default: 3,
            onChange(numDim, state) {
                if (numDim < 3) { eraseDimension(state.graphData.nodes, 'z'); }

                function eraseDimension(nodes, dim) {
                    nodes.forEach(node => {
                        node[dim] = 0;          // position, set to 0 instead of deleting
                        delete node[`v${dim}`]; // velocity
                    });
                }
            }
        },
        nodeRelSize    : { default: 3 },   // volume per val unit
        nodeId         : { default: 'id' },
        nodeResolution : { default: 16 },  // how many slice segments in the sphere's circumference
        linkResolution : { default: 50 },  // number of points on semicircle link
        linkMethod     : { default: 'Line2'}, //link rendering method
        showLyphs      : { default: true},
        showLayers     : { default: true},
        method         : { default: '2d'},
        showLabels     : { default: {Node: true}},
        labels         : { default: {Node: 'id', Link: 'id', Lyph: 'id'}},
        fontParams     : { default: {
            font: '12px Arial', fillStyle: '#000', antialias: true }
        },
        opacity        : { default: 0.6 },
        d3AlphaDecay   : { default: 0.045 },
        d3VelocityDecay: { default: 0.45 },
        warmupTicks    : { default: 0 }, // how many times to tick the force engine at init before starting to render
        cooldownTicks  : { default: 1000 },
        cooldownTime   : { default: 2000 }, // in milliseconds. Graph UI Events  need wait for this period of time before  webgl interaction is processed. (E.g. hideHighlighted() in WebGLComponent.)
        onLoading      : { default: () => {}, triggerUpdate: false },
        onFinishLoading: { default: () => {}, triggerUpdate: false }
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
            .force('charge', forceManyBody(d => d.charge? d.charge: 0))
            .force('collide', forceCollide(d => d.collide? d.collide: 0))
        .stop()
    }),

    init(threeObj, state) {
        // Main three object to manipulate
        state.graphScene = threeObj;
        state.materialRepo = new MaterialFactory({ transparent: true, opacity: state.opacity });
    },

    update(state) {
        state.onFrame = null; // Pause simulation
        state.onLoading();

        if (state.graphData.nodes.length || state.graphData.links.length) {
            console.info('force-graph loading', state.graphData.nodes.length + ' nodes', state.graphData.links.length + ' links');
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
            .nodes(state.graphData.nodes);

        layout.force('link')
            .id(d => d[state.nodeId])
            .links(state.graphData.links);

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
