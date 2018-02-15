import * as three from 'three';
const THREE = window.THREE || three;

import { SpriteText2D } from 'three-text2d';
import {LINK_TYPES} from '../models/utils';
const NUM_CURVE_POINTS = 50;

import {
    forceSimulation,
    forceLink,
    forceManyBody,
    forceCollide
} from 'd3-force-3d';

import Kapsule from 'kapsule';
import qwest from 'qwest';
import accessorFn from 'accessor-fn';

import { autoColorObjects, bezierSemicircle, copyCoords, alignIcon } from './utils';
import { MaterialFactory } from './materialFactory';

//TODO handle drawing of domain-specific objects like omega trees outside
export default Kapsule({
    props: {
        jsonUrl: {},
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
                    //TODO Introduce 2.5d
                    nodes.filter(node => !node.coalescence).forEach(node => {
                        node[dim] = 0;          // position, set to 0 instead of deleting
                        delete node[`v${dim}`]; // velocity
                        //TODO - maybe also set velocity to 0?
                    });
                }
            }
        },
        nodeRelSize    : { default: 4 }, // volume per val unit
        nodeId         : { default: 'id' },
        nodeVal        : { default: 'val' },
        nodeResolution : { default: 8 }, // how many slice segments in the sphere's circumference
        nodeColor      : { default: 'color' },
        nodeAutoColorBy: {},
        nodeThreeObject: {},
        linkSource     : { default: 'source' },
        linkTarget     : { default: 'target' },
        linkColor      : { default: 'color' },
        nodeLabel      : { default: 'name'},
        linkLabel      : { default: 'name'},
        showNodeLabel  : { default: true},
        linkAutoColorBy: {},
        linkExtension  : {},
        linkExtensionParams: {},
        opacity        : { default: 0.5 },
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
        state.materialRepo = new MaterialFactory({
            opacity: state.opacity
        });
    },

    update(state) {
        state.onFrame = null; // Pause simulation
        state.onLoading();

        if (state.graphData.nodes.length || state.graphData.links.length) {
            console.info('force-graph loading', state.graphData.nodes.length + ' nodes', state.graphData.links.length + ' links');
        }

        if (!state.fetchingJson && state.jsonUrl && !state.graphData.nodes.length && !state.graphData.links.length) {
            // (Re-)load data
            state.fetchingJson = true;
            qwest.get(state.jsonUrl).then((_, json) => {
                state.fetchingJson = false;
                state.graphData = json;
                state._rerender();  // Force re-update
            });
        }

        if (state.nodeAutoColorBy !== null) {
            // Auto add color to uncolored nodes
            autoColorObjects(state.graphData.nodes, accessorFn(state.nodeAutoColorBy), state.nodeColor);
        }
        if (state.linkAutoColorBy !== null) {
            // Auto add color to uncolored links
            autoColorObjects(state.graphData.links, accessorFn(state.linkAutoColorBy), state.linkColor);
        }

        // parse links
        state.graphData.links.forEach(link => {
            link.source = link[state.linkSource];
            link.target = link[state.linkTarget];
        });

        // Add WebGL objects
        while (state.graphScene.children.length) { state.graphScene.remove(state.graphScene.children[0]) } // Clear the place

        const customNodeObjectAccessor = accessorFn(state.nodeThreeObject);
        const valAccessor = accessorFn(state.nodeVal);
        const colorAccessor = accessorFn(state.nodeColor);
        const sphereGeometries = {}; // indexed by node value

        state.graphData.nodes.forEach(node => {
            const customObj = customNodeObjectAccessor(node);

            let obj;
            if (customObj) {
                obj = customObj.clone();
            } else { // Default object (sphere mesh)
                const val = valAccessor(node) || 1;
                if (!sphereGeometries.hasOwnProperty(val)) {
                    sphereGeometries[val] = new THREE.SphereGeometry(Math.cbrt(val) * state.nodeRelSize, state.nodeResolution, state.nodeResolution);
                }
                const color = colorAccessor(node);
                obj = new THREE.Mesh(sphereGeometries[val], state.materialRepo.getMeshLambertMaterial(color));
            }

            obj.__graphObjType = 'node'; // Add object type
            obj.__data = node; // Attach node data
            state.graphScene.add(node.__threeObj = obj);

            let objLabel = new SpriteText2D(node[state.nodeLabel], { font: '12px Arial', fillStyle: '#888', antialias: true });
            state.graphScene.add(node.__threeObjLabel = objLabel);
        });

        const edgeColorAccessor = accessorFn(state.linkColor);

        state.graphData.links.forEach(link => {
            const color = edgeColorAccessor(link);
            let geometry, edgeMaterial;

            if (link.type === LINK_TYPES.AXIS){
                geometry = new THREE.Geometry();
                edgeMaterial = state.materialRepo.getLineDashedMaterial(color);
                geometry.vertices = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];
            } else {
                geometry = new THREE.BufferGeometry();
                edgeMaterial = state.materialRepo.getLineBasicMaterial(color);
                if (link.type === LINK_TYPES.PATH){
                    geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(NUM_CURVE_POINTS * 3), 3));
                } else {
                    if (link.type !== LINK_TYPES.COALESCENCE) {
                        geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(2 * 3), 3));
                    }
                }
            }

            let edge = new THREE.Line(geometry, edgeMaterial);
            edge.__graphObjType = 'link'; // Add object type
            edge.__data = link;    // Attach link data
            edge.renderOrder = 10; // Prevent visual glitches of dark lines on top of nodes by rendering them last
            state.graphScene.add(link.__edgeObj = edge);

            //Add lyphs and edge text
            if (state.linkExtension){
                let linkIcon = state.linkExtension(link, state.linkExtensionParams);
                if (linkIcon){
                    state.graphScene.add(link.__linkIconObj = linkIcon);
                }
            }
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

        function drawSolidLine(link){
            const edge = link.__edgeObj;
            if (!edge) return;
            const start = link['source'], end = link['target'],
                edgePos = edge.geometry.attributes.position;
            if (!edgePos) return;

            //adjust coordinates for correct computations in 2d and 1d
            const _start = new THREE.Vector3(start.x, start.y, start.z || 0);
            const _end   = new THREE.Vector3(end.x, end.y, end.z || 0);

            let points, middle;

            if (link.type === LINK_TYPES.PATH) {
                const curve = bezierSemicircle(_start, _end);
                middle = curve.getPoint(0.5);
                points = curve.getPoints(NUM_CURVE_POINTS - 1);

                //Position omega tree roots
                let hostedNodes = state.graphData.nodes.filter(node => (node.host === edge.__data.id) && node.isRoot);
                if (hostedNodes.length > 0) {
                    const delta = ((hostedNodes.length % 2) === 1) ? 0.4 : 0;
                    const offset = 1 / (hostedNodes.length + 1 + delta);
                    hostedNodes.forEach((root, i) => {
                        const rootObj = root.__threeObj;
                        if (!rootObj) {
                            return;
                        }
                        const pos = curve.getPoint(offset * (i + 1));
                        copyCoords(rootObj.position, pos);
                        copyCoords(root, pos);
                    });
                }
            } else {
                points = [_start, _end];
                middle = _start.clone().add(_end).multiplyScalar(0.5);
            }

            for (let i = 0; i < points.length; i++){
                edgePos.array[3*i  ] = points[i].x;
                edgePos.array[3*i+1] = points[i].y;
                edgePos.array[3*i+2] = points[i].z;
            }

            const icon = link.__linkIconObj;
            if (icon){
                copyCoords(icon.position, middle);
                alignIcon(icon, link);
            }

            edgePos.needsUpdate = true;
            edge.geometry.computeBoundingSphere();
        }

        function layoutTick() {
            if (++cntTicks > state.cooldownTicks || (new Date()) - startTickTime > state.cooldownTime) {
                state.onFrame = null; // Stop ticking graph
            } else {
                layout['tick'](); // Tick it
            }

            // Update nodes position
            state.graphData.nodes.forEach(node => {
                const obj = node.__threeObj;
                if (!obj) return;
                copyCoords(obj.position, node);

                const objLabel = node.__threeObjLabel;
                if (objLabel) {
                    objLabel.visible = state.showNodeLabel;
                    copyCoords(objLabel.position, obj.position);
                    objLabel.position.addScalar(15); //TODO replace to node radius
                }
            });

            // Update links position for paths, compute positions of omega nodes
            state.graphData.links.filter(link => link.type === LINK_TYPES.PATH).forEach(link => {
                drawSolidLine(link);
            });

            // Update links position for straight solid links
            state.graphData.links.filter(link => link.type === LINK_TYPES.LINK).forEach(link => {
                drawSolidLine(link);
            });

            //Update axis
            state.graphData.links.filter(link => link.type === LINK_TYPES.AXIS).forEach(link => {
                const edge = link.__edgeObj;
                if (!edge) return;
                copyCoords(edge.geometry.vertices[0], link['source']);
                copyCoords(edge.geometry.vertices[1], link['target']);
                edge.geometry.verticesNeedUpdate = true;
                edge.geometry.computeLineDistances();
            });
        }
    }
});




