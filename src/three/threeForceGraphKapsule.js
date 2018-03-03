import {LINK_TYPES} from '../models/linkModel';
import {NODE_TYPES} from '../models/nodeModel';

import {
    forceSimulation,
    forceLink,
    forceManyBody,
    forceCollide
} from 'd3-force-3d';

import Kapsule from 'kapsule';
import { MaterialFactory } from './materialFactory';

//TODO handle drawing of domain-specific objects like omega trees outside
export default Kapsule({
    props: {
        graphData: {
            default: {
                nodes: [],
                links: []
            },
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
        nodeRelSize    : { default: 4 }, // volume per val unit
        nodeId         : { default: 'id' },
        nodeResolution : { default: 8 }, // how many slice segments in the sphere's circumference
        linkResolution : { default: 50},
        showLyphs      : { default: true},
        showLayers     : { default: true},
        method         : { default: '3d'},
        showNodeLabel  : { default: true},
        showLinkLabel  : { default: false},
        showLyphLabel  : { default: false},
        nodeLabel      : { default: 'id'},
        linkLabel      : { default: 'id'},
        iconLabel      : { default: 'id'},
        fontParams     : { default: {
            font: '10px Arial', fillStyle: '#888', antialias: true }
        },
        opacity        : { default: 0.3 },
        axisLength     : { default: 400 },
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
            if(state.onFrame) state.onFrame();
            return this;
        }
    },

    stateInit: () => ({
        simulation: forceSimulation()
            .force('link', forceLink())
            .force('charge', forceManyBody())
            .force('collide', forceCollide(15))
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

        // Add WebGL objects
        while (state.graphScene.children.length) { state.graphScene.remove(state.graphScene.children[0]) } // Clear the place

        //Draw all graph nodes, except for control nodes
        state.graphData.nodes.filter(node => node.type !== NODE_TYPES.CONTROL).forEach(node => {
            node.createViewObjects(state);
            Object.values(node.viewObjects).forEach(obj => state.graphScene.add(obj));
        });

        state.graphData.links.forEach(link => {
            link.createViewObjects(state);
            Object.values(link.viewObjects).forEach(obj=> state.graphScene.add(obj));
        });

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
        for (let i=0; i < state.warmupTicks; i++) { layout['tick'](); }

        let cntTicks = 0;
        const startTickTime = new Date();
        state.onFrame = layoutTick;
        state.onFinishLoading();

        function layoutTick() {
            if (++cntTicks > state.cooldownTicks || (new Date()) - startTickTime > state.cooldownTime) {
                // Stop ticking graph
                state.onFrame = null;
            } else { layout['tick'](); }

            // Update nodes position
            state.graphData.nodes.forEach(node => {
                node.updateViewObjects(state)
            });

            // Update links position for paths, compute positions of omega nodes
            state.graphData.links.filter(link => link.type === LINK_TYPES.PATH).forEach(link => {
                link.updateViewObjects(state)}
            );

            // Update links position for straight solid links
            state.graphData.links.filter(link => link.type === LINK_TYPES.LINK).forEach(link => {
                link.updateViewObjects(state)
            });

            //Update axis
            state.graphData.links.filter(link => link.type === LINK_TYPES.AXIS).forEach(link => {
                link.updateViewObjects(state)
            });

            //Update containers
            state.graphData.links.filter(link => link.type === LINK_TYPES.CONTAINER).forEach(link => {
                link.updateViewObjects(state)
            });
        }
    }
});




