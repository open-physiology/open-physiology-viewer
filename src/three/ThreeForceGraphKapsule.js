import * as THREE from 'three';
import { MeshText2D} from 'three-text2d'

const three = window.THREE
    ? window.THREE // Prefer consumption from global THREE, if exists
    : THREE;

import {
    forceSimulation,
    forceLink,
    forceManyBody,
    forceCenter,
    forceX,
    forceY
} from 'd3-force-3d';

import Kapsule from 'kapsule';
import qwest from 'qwest';
import accessorFn from 'accessor-fn';

import { autoColorObjects, colorStr2Hex } from './utils';

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
                if (numDim < 2) { eraseDimension(state.graphData.nodes, 'y'); }

                function eraseDimension(nodes, dim) {
                    nodes.forEach(d => {
                        delete d[dim];       // position
                        delete d[`v${dim}`]; // velocity
                    });
                }
            }
        },
        nodeRelSize: { default: 4 }, // volume per val unit
        nodeId: { default: 'id' },
        nodeVal: { default: 'val' },
        nodeResolution: { default: 8 }, // how many slice segments in the sphere's circumference
        nodeColor: { default: 'color' },
        nodeAutoColorBy: {},
        nodeThreeObject: {},
        linkSource: { default: 'source' },
        linkTarget: { default: 'target' },
        linkColor:  { default: 'color' },
        nodeLabel:  { default: 'name'},
        linkLabel:  { default: 'name'},
        linkAutoColorBy: {},
        linkOpacity: { default: 0.5 },
        axis: {default: 300},
        forceEngine: { default: 'd3' }, // d3
        d3AlphaDecay: { default: 0.0228 },
        d3VelocityDecay: { default: 0.4 },
        warmupTicks: { default: 0 }, // how many times to tick the force engine at init before starting to render
        cooldownTicks: { default: Infinity },
        cooldownTime: { default: 15000 }, // ms
        onLoading: { default: () => {}, triggerUpdate: false },
        onFinishLoading: { default: () => {}, triggerUpdate: false }
    },

    methods: {
        // Expose d3 forces for external manipulation
        d3Force: function(state, forceName, forceFn) {
            if (forceFn === undefined) {
                return state.d3ForceLayout.force(forceName); // Force getter
            }
            state.d3ForceLayout.force(forceName, forceFn); // Force setter
            return this;
        },
        tickFrame: function(state) {
            if(state.onFrame) state.onFrame();
            return this;
        }
    },

    stateInit: () => ({
        d3ForceLayout: forceSimulation()
            .force('link', forceLink())
            .force('charge', forceManyBody())
            .force('center', forceCenter()) //TODO check if we need to set center explicitly
        .stop()
    }),

    init(threeObj, state) {
        // Main three object to manipulate
        state.graphScene = threeObj;
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
        const sphereMaterials = {};  // indexed by color
        state.graphData.nodes.forEach(node => {
            const customObj = customNodeObjectAccessor(node);

            let obj;
            if (customObj) {
                obj = customObj.clone();
            } else { // Default object (sphere mesh)
                const val = valAccessor(node) || 1;
                if (!sphereGeometries.hasOwnProperty(val)) {
                    sphereGeometries[val] = new three.SphereGeometry(Math.cbrt(val) * state.nodeRelSize, state.nodeResolution, state.nodeResolution);
                }

                const color = colorAccessor(node);
                if (!sphereMaterials.hasOwnProperty(color)) {
                    sphereMaterials[color] = new three.MeshLambertMaterial({
                        color: colorStr2Hex(color || '#ffffaa'),
                        transparent: true,
                        opacity: 0.75
                    });
                }

                obj = new three.Mesh(sphereGeometries[val], sphereMaterials[color]);
            }

            obj.__graphObjType = 'node'; // Add object type
            obj.__data = node; // Attach node data

            state.graphScene.add(node.__threeObj = obj);

            //TODO replace label with name accessor
            let objLabel = new MeshText2D(node.name, { font: '12px Arial', fillStyle: '#000000', antialias: true });
            objLabel.parent = obj;
            state.graphScene.add(node.__threeObjLabel = objLabel);
        });

        const edgeColorAccessor = accessorFn(state.linkColor);

        const edgeMaterials = {}; // indexed by color

        state.graphData.links.forEach(link => {
            const color = edgeColorAccessor(link);
            if (!edgeMaterials.hasOwnProperty(color)) {
                edgeMaterials[color] = new three.LineBasicMaterial({
                    color: colorStr2Hex(color || '#f0f0f0'),
                    transparent: true,
                    opacity: state.linkOpacity
                });
            }

            let geometry = new three.BufferGeometry();
            if (link.type === "path"){
                geometry.addAttribute('position', new three.BufferAttribute(new Float32Array(50 * 3), 3));
            } else {
                if (link.type === "link"){
                    geometry.addAttribute('position', new three.BufferAttribute(new Float32Array(2 * 3), 3));
                }
            }

            const edgeMaterial = edgeMaterials[color];
            let edge = new three.Line(geometry, edgeMaterial);
            edge.__graphObjType = 'link'; // Add object type
            edge.renderOrder = 10; // Prevent visual glitches of dark lines on top of nodes by rendering them last
            edge.__data = link;    // Attach link data
            state.graphScene.add(link.__edgeObj = edge);

            //Add lyphs and edge text
            if (link.lyph){
                let lyphGeometry1 = new THREE.PlaneGeometry( 20, 10, 8 );
                let lyphMaterial1 = new THREE.MeshBasicMaterial( {color: 0x00ff00, side: THREE.DoubleSide} );
                let lyph = new THREE.Mesh( lyphGeometry1, lyphMaterial1 );
                state.graphScene.add(link.__lyphObj = lyph);
            }
        });

        // Feed data to force-directed layout
        let layout;
        // D3-force
        (layout = state.d3ForceLayout)
            .stop()
            .alpha(1)// re-heat the simulation
            .alphaDecay(state.d3AlphaDecay)
            .velocityDecay(state.d3VelocityDecay)
            .numDimensions(state.numDimensions)
            .nodes(state.graphData.nodes)
            .force('link')
            .id(d => d[state.nodeId])
            .links(state.graphData.links);


        layout
            .force("y", forceY().y(d => (d.type === "-y")? -state.axis
                : (d.type === "+y")? state.axis : 0))
            .force("x", forceX().x(d => (d.type === "-x")? -state.axis
                : (d.type === "+x")? state.axis : 0))
            .force('link').distance(d =>  0.01 * d.length * (2 * state.axis)).strength(0.9);

        // Initial ticks before starting to render
        for (let i=0; i < state.warmupTicks; i++) {
            layout['tick']();
        }

        let cntTicks = 0;
        const startTickTime = new Date();
        state.onFrame = layoutTick;
        state.onFinishLoading();

        //TODO replace with circle passing via start, stop with center in (stop - start) / 2
        //TODO change to vector arithmetics to work correctly for any position of end points (now only works for X axis)
        function getBezierCircle(startV, endV){

            let edgeV   = endV.clone().sub(startV);
            let pEdgeV  = edgeV.clone().applyAxisAngle( new THREE.Vector3( 0, 0, 1 ), Math.PI / 2);
            let insetV  = edgeV.multiplyScalar(0.05);
            let offsetV = pEdgeV.multiplyScalar(2/3);

            return new THREE.CubicBezierCurve3(
                startV.clone(),
                startV.clone().add(insetV).add(offsetV),
                endV.clone().sub(insetV).add(offsetV),
                endV.clone());
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
                const pos = node;

                obj.position.x = pos.x;
                obj.position.y = pos.y || 0;
                obj.position.z = pos.z || 0;


                const objLabel = node.__threeObjLabel;
                if (objLabel) {

                    let radius = Math.cbrt(node.val) * state.nodeRelSize;
                    objLabel.position.x = obj.position.x + 1.2 * radius;
                    objLabel.position.y = obj.position.y + 1.2 * radius;
                    objLabel.position.z = obj.position.z;
                }
            });

            // Update links position
            state.graphData.links.forEach(link => {
                const edge = link.__edgeObj;
                if (!edge) return;

                const pos = link,
                    start = pos['source'],
                      end = pos['target'],
                  edgePos = edge.geometry.attributes.position;

                if (!edgePos) return;

                //adjust coordinates for correct computations in 2d and 1d
                let _start = new THREE.Vector3(start.x, start.y || 0, start.z || 0);
                let _end   = new THREE.Vector3(end.x, end.y || 0, end.z || 0);

                let points = [];
                let middle;
                if (edge.__data.type === "path") {
                    let curve = getBezierCircle(_start, _end);
                    middle = curve.getPoint(0.5);
                    points = curve.getPoints( 49 );
                } else {
                    if (edge.__data.type === "link") {
                        points.push(_start);
                        points.push(_end);
                        middle = _start.clone().add(_end).multiplyScalar(0.5);
                    }
                }
                for (let i = 0; i < points.length; i++){
                    edgePos.array[3*i] = points[i].x;
                    edgePos.array[3*i+1] = points[i].y;
                    edgePos.array[3*i+2] = points[i].z;
                }

                const lyph = link.__lyphObj;
                if (lyph){
                    lyph.position.x = middle.x;
                    lyph.position.y = middle.y;
                    lyph.position.z = middle.z;

                }

                edgePos.needsUpdate = true;
                edge.geometry.computeBoundingSphere();

            });
        }
    }
});




