 import {
    forceSimulation,
    forceLink,
    forceManyBody,
    //forceRadial,
    forceCollide
} from 'd3-force-3d';
import {select as d3Select } from 'd3-selection';
import {drag as d3Drag } from 'd3-drag';

import Kapsule from 'kapsule';
import {generateFromJSON, modelClasses} from '../model/index';
import './modelView';
import {extractCoords} from './utils';
import { autoLayout } from './render/autoLayout'

const {Graph} = modelClasses;

/**
 * A closure-based component for the force-directed 3d graph layout
 */
export default Kapsule({
    props: {
        graphData: {
            default: Graph.fromJSON({"id":"Empty"}, modelClasses),
            onChange(value, state) {
                state.onFrame = null;
            }
        },
        numDimensions: {
            default: 3,
            onChange(numDim, state) {
                if (numDim < 3) {
                    eraseDimension(state.graphData.visibleNodes||[], 'z');
                }

                function eraseDimension(nodes, dim) {
                    (nodes||[]).forEach(node => {
                        node[dim] = 0;          // position, set to 0 instead of deleting
                        delete node[`v${dim}`]; // velocity
                    });
                }
            }
        },
        scaleFactor: { default: 10 },
        canvas: {
            default: undefined,
            triggerUpdate: false,
            onChange(canvas, state){
                state.canvas = canvas;
                if (!state.canvas){ return;}

                state.toolTipElem = document.createElement('div');
                state.toolTipElem.classList.add('graph-tooltip');

                const container = canvas.parentNode;
                if (container) {
                    container.classList.add('force-graph-container');
                    container.style.position = 'relative';
                    container.appendChild(state.toolTipElem);
                }

                d3Select(state.canvas).call(
                    d3Drag()
                        .subject(() => {
                            return state.hoverObj && state.hoverObj.__isDraggable ? state.hoverObj : null;
                        })
                        .on('start', ev => {
                            const obj = ev.subject;
                            if (!obj){ return; }
                            obj.__initialDragPos = extractCoords(ev);
                            state.canvas.classList.add('grabbable');
                        })
                        .on('drag', ev => {
                            const obj = ev.subject;
                            if (!obj){ return; }
                            const currentPos = extractCoords(ev);
                            const translate = currentPos.clone().sub(obj.__initialDragPos);
                            translate.y = -translate.y;

                            const fn = state[`on${obj.userData.class}Drag`];
                            fn && fn(obj, translate);

                            obj.__dragged = true;
                        })
                        .on('end', ev => {
                            const obj = ev.subject;
                            if (!obj){ return; }
                            const currentPos = extractCoords(ev);
                            const translate = currentPos.clone().sub(obj.__initialDragPos);
                            translate.y = -translate.y;

                            if (obj.__dragged) {
                                const fn = state[`on${obj.userData.class}DragEnd`];
                                fn && fn(obj, translate);
                                delete(obj.__dragged);
                            }
                            state.canvas.classList.remove('grabbable');
                            state.isPointerDragging = false;
                        })
                );

                const pointerPos = {x: 0, y: 0};
                ['pointermove', 'pointerdown'].forEach(evType =>
                    state.canvas.addEventListener(evType, ev => {
                        !state.isPointerDragging && ev.type === 'pointermove'
                        && ev.pressure > 0 && [ev.movementX, ev.movementY].some(m => Math.abs(m) > (ev.pointerType === 'touch' ? 1 : 0))
                        && (state.isPointerDragging = true);

                        const offset = getOffset(state.canvas);
                        pointerPos.x = ev.pageX - offset.left;
                        pointerPos.y = ev.pageY - offset.top;

                        // Move tooltip
                        state.toolTipElem.style.top = `${pointerPos.y}px`;
                        state.toolTipElem.style.left = `${pointerPos.x}px`;

                        function getOffset(el) {
                            const rect = el.getBoundingClientRect(),
                                scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
                                scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                            return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
                        }
                    }, { passive: true })
                );

                state.canvas.addEventListener('pointerup', ev => {
                    if (state.isPointerDragging) {
                        state.isPointerDragging = false;
                        return;
                    }
                    requestAnimationFrame(() => {
                        if (ev.button === 0) {
                            if (state.hoverObj) {
                                const fn = state[`on${state.hoverObj.class}Click`];
                                fn && fn(state.hoverObj.userData, ev);
                            } else {
                                state.onBackgroundClick(ev);
                            }
                        }

                        if (ev.button === 2) { // mouse right-click
                            if (state.hoverObj) {
                                const fn = state[`on${state.hoverObj.class}RightClick`];
                                fn && fn(state.hoverObj.userData, ev);
                            } else {
                                state.onBackgroundRightClick && state.onBackgroundRightClick(ev);
                            }
                        }
                    });
                }, { passive: true });
            }
        },
        select: {
            default: undefined,
            triggerUpdate: false,
            onChange(obj, state){
                if (state.hoverObj) {
                    delete state.hoverObj.__isDraggable;
                }
                state.hoverObj = obj;
                obj && (obj.__isDraggable = state.enableDrag && obj && (
                        obj.userData instanceof modelClasses.Anchor ||
                        obj.userData instanceof modelClasses.Wire ||
                        obj.userData instanceof modelClasses.Region));
                state.canvas && (state.canvas.style.cursor = obj && obj.__isDraggable? 'pointer' : null);
                const tooltipContent = obj? obj.userData.id + "-" + (obj.userData.name || '?') : '';
                if (state.toolTipElem ) {
                    state.toolTipElem.style.visibility = tooltipContent && obj?.visible ? 'visible' : 'hidden';
                    state.toolTipElem.innerHTML = tooltipContent;
                }
            }
        },

        verticeRelSize   : { default: 4 },     // volume per val unit
        verticeResolution: { default: 8 },     // how many slice segments in the sphere's circumference

        nodeVal          : { default: 2 },
        anchorVal        : { default: 3 },

        edgeResolution   : { default: 32 },     // number of points on curved link
        arrowLength      : { default: 40 },     // arrow length for directed links

        showLyphs        : { default: true},
        showLayers       : { default: true},
        showLyphs3d      : { default: false},
        showCoalescences : { default: false},
        showLabels       : { default: {}},

        labels           : { default: {Anchor: 'id', Wire: 'id', Node: 'id', Link: 'id', Lyph: 'id', Region: 'id'}},
        labelRelSize     : { default: 0.1},
        labelOffset      : { default: {Vertice: 10, Edge: 5, Lyph: 0, Region: 0}},
        fontParams       : { default: { font: '24px Arial', fillStyle: '#000', antialias: true}},

        d3AlphaDecay     : { default: 0.045}, //triggerUpdate: false, onChange(alphaDecay, state) { state.simulation.alphaDecay(alphaDecay) }},
        d3AlphaTarget    : { default: 0}, //triggerUpdate: false, onChange(alphaTarget, state) { state.simulation.alphaTarget(alphaTarget) }},
        d3VelocityDecay  : { default: 0.45}, //triggerUpdate: false, onChange(velocityDecay, state) { state.simulation.velocityDecay(velocityDecay) } },

        warmupTicks      : { default: 10 }, // how many times to tick the force engine at init before starting to render
        cooldownTicks    : { default: 10 },
        cooldownTime     : { default: 1000 }, // in milliseconds. Graph UI Events  need wait for this period of time before  webgl interaction is processed. (E.g. hideHighlighted() in WebGLComponent.)
        onLoading        : { default: () => {}, triggerUpdate: false },
        onFinishLoading  : { default: () => {}, triggerUpdate: false },

        neuroviewEnabled      : { default: false},

        enablePointerInteraction: {
            default: true,
            onChange(_, state) {
                state.hoverObj = null;
            },
            triggerUpdate: false
        },

        enableDrag        : { default: true, triggerUpdate: false },

        onAnchorDrag      : { default: () => {}, triggerUpdate: false },
        onAnchorDragEnd   : { default: () => {}, triggerUpdate: false },
        onAnchorClick     : { default: () => {}, triggerUpdate: false },
        onAnchorRightClick: { default: () => {}, triggerUpdate: false },

        onWireDrag        : { default: () => {}, triggerUpdate: false },
        onWireDragEnd     : { default: () => {}, triggerUpdate: false },
        onWireClick       : { default: () => {}, triggerUpdate: false },
        onWireRightClick  : { default: () => {}, triggerUpdate: false },

        onRegionDrag       : { default: () => {}, triggerUpdate: false },
        onRegionDragEnd    : { default: () => {}, triggerUpdate: false },
        onRegionClick      : { default: () => {}, triggerUpdate: false },
        onRegionRightClick : { default: () => {}, triggerUpdate: false },

        onBackgroundClick : { default: () => {}, triggerUpdate: false },
        onBackgroundRightClick: { triggerUpdate: false }
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
        },
        // reset cooldown state
        resetCountdown: function(state) {
            state.cntTicks = 0;
            state.startTickTime = new Date();
            state.engineRunning = true;
            return this;
        }
    },

    stateInit: () => ({
        simulation: forceSimulation()
            .force('link', forceLink())
            //.force('radial', forceRadial(100))
            .force('charge', forceManyBody(d => d.charge || 0))
            .force('collide', forceCollide(d => d.collide || 0))
        .stop()
    }),

    init(threeObj, state) {
        state.graphScene = threeObj;
    },

    update(state) {
        state.onFrame = null; // Pause simulation
        state.onLoading();

        if (state.graphData.visibleNodes || state.graphData.visibleLinks) {
            console.info('force-graph loading',
                (state.graphData.visibleNodes||[]).length + ' nodes',
                (state.graphData.visibleLinks||[]).length + ' links');
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
            .nodes(state.graphData.visibleNodes||[]);

        layout.force('link').id(d => d.id).links(state.graphData.visibleLinks||[]);

        // Initial ticks before starting to render
        for (let i = 0; i < state.warmupTicks; i++) { layout['tick'](); }

        state.cntTicks = 0;
        const startTickTime = new Date();
        state.onFrame = layoutTick;
        state.onFinishLoading();

        function layoutTick() {
          if (++state.cntTicks > state.cooldownTicks) {
              // Stop ticking graph
              state.onFrame = null;
              const event = new CustomEvent('doneUpdating');
              window.dispatchEvent(event);
          } else { layout['tick'](); }

          state.graphData.updateViewObjects(state);
          const event2 = new CustomEvent('doneUpdating');
          window.dispatchEvent(event2);
          //autoLayout(state.graphScene, state.graphData);
        }
    }
});
