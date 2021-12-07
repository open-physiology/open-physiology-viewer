import {
    forceSimulation,
    forceLink,
    forceManyBody,
    forceCollide
} from 'd3-force-3d';

import Kapsule from 'kapsule';
import { MaterialFactory } from './materialFactory';

import {GraphModel} from '../models/graphModel';
import { modelClasses } from '../models/utils';

export default Kapsule({
    props: {
        graphData: {
            default: GraphModel.fromJSON({nodes: [], links: []}, modelClasses),
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
        nodeRelSize    : { default: 3 }, // volume per val unit
        nodeId         : { default: 'id' },
        nodeResolution : { default: 8 }, // how many slice segments in the sphere's circumference
        linkResolution : { default: 50},
        showLyphs      : { default: true},
        showLayers     : { default: false}, //TODO replace with true
        method         : { default: '2d'},
        showNodeLabel  : { default: true},
        showLinkLabel  : { default: false},
        showLyphLabel  : { default: false},
        nodeLabel      : { default: 'id'},
        linkLabel      : { default: 'id'},
        linkGeometry   : { default: 'TUBE'},
        iconLabel      : { default: 'id'},
        fontParams     : { default: {
            font: '10px Arial', fillStyle: '#888', antialias: true }
        },
        opacity        : { default: 0.3 },
        d3AlphaDecay   : { default: 0.045 },
        d3VelocityDecay: { default: 0.45 },
        warmupTicks    : { default: 0 }, // how many times to tick the force engine at init before starting to render
        cooldownTicks  : { default: Infinity },
        cooldownTime   : { default: 20000 }, // ms
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
            if (state.onFrame) { state.onFrame(); }
            return this;
        }
    },

    stateInit: () => ({
        simulation: forceSimulation()
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
        let layout = state.simulation;

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
