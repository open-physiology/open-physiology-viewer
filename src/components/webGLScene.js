import { NgModule, Component, ViewChild, ElementRef, Input, Output, EventEmitter } from '@angular/core';
import { StopPropagation } from './stopPropagation';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import * as THREE from 'three';

const OrbitControls = require('three-orbit-controls')(THREE);

import ThreeForceGraph from '../three/threeForceGraph';
import { forceX, forceY, forceZ } from 'd3-force-3d';

const WindowResize = require('three-window-resize');
import { LINK_TYPES } from '../models/linkModel';
import { NODE_TYPES } from "../models/nodeModel";
import { GraphModel} from "../models/graphModel";
import { modelClasses } from "../models/utils";

import { Lyph } from "../models/lyphModel";


import { ModelInfoPanel } from './gui/modelInfo';
import { SelectNameSearchBar } from './gui/selectNameSearchBar';


@Component({
  selector: 'webGLScene',
  template: `
        <section id="viewPanel" class="w3-row">
            <section id="canvasContainer" class="w3-twothird">
                <section class="w3-padding-right">
                    <canvas #canvas class="w3-card w3-round"></canvas>
                </section>
            </section>
            <section id="settingsPanel" stop-propagation class="w3-third">
                <section class="w3-padding">
                    <section class="w3-bar w3-grey">
                        <span class="w3-bar-item">Control Panel</span>
                        <button class="w3-bar-item w3-right w3-button w3-hover-light-grey" (click)="update()">
                            <i class="fa fa-refresh"></i>
                        </button>
                    </section>
                    <fieldset class="w3-card w3-round w3-margin">
                        <legend>Labels</legend>
                        <input type="checkbox" class="w3-check" name="node_label" (change)="toggleNodeLabels()" checked/> Node
                        <input type="checkbox" class="w3-check" name="link_label" (change)="toggleLinkLabels()"/> Link
                        <input type="checkbox" class="w3-check" name="lyph_label" (change)="toggleLyphLabels()"/> Lyph
                        <fieldset *ngIf="_showNodeLabels" class="w3-round">
                            <legend>Node label</legend>
                            <input type="radio" class="w3-radio" name="node_label"
                                   (change)="updateLabelContent('node', 'id')" checked/> Id
                            <input type="radio" class="w3-radio" name="node_label"
                                   (change)="updateLabelContent('node', 'name')"/> Name
                            <input type="radio" class="w3-radio" name="node_label"
                                   (change)="updateLabelContent('node', 'external')"/> External
                        </fieldset>
                        <fieldset *ngIf="_showLinkLabels" class="w3-round">
                            <legend>Link label</legend>
                            <input type="radio" class="w3-radio" name="link_label"
                                   (change)="updateLabelContent('link', 'id')" checked/> Id
                            <input type="radio" class="w3-radio" name="link_label"
                                   (change)="updateLabelContent('link', 'name')"/> Name
                            <input type="radio" class="w3-radio" name="link_label"
                                   (change)="updateLabelContent('link', 'external')"/> External
                        </fieldset>
                        <fieldset *ngIf="_showLyphLabels" class="w3-round">
                            <legend>Lyph label</legend>
                            <input type="radio" class="w3-radio" name="lyph_label"
                                   (change)="updateLabelContent('lyph', 'id')" checked/> Id
                            <input type="radio" class="w3-radio" name="lyph_label"
                                   (change)="updateLabelContent('lyph', 'name')"/> Name
                            <input type="radio" class="w3-radio" name="lyph_label"
                                   (change)="updateLabelContent('lyph', 'external')"/> External
                        </fieldset>
                    </fieldset>
                    <fieldset class="w3-card w3-round w3-margin">
                        <legend>Layout</legend>
                        <input type="checkbox" class="w3-check" name="lyphs" (change)="toggleLyphs()" checked/> Lyphs
                        <span *ngIf="_showLyphs" >
                            <input type="checkbox" class="w3-check" name="layers" (change)="toggleLayers()"
                                   [checked]="_showLayers"/> Layers
                        </span>
                        <br/>
                        <input type="checkbox" name="switch" class="w3-check" (change)="toggleGroup('hideTrees')"/> Omega trees
                        <input type="checkbox" name="switch" class="w3-check" (change)="toggleGroup('hideCoalescences')"/> Coalescences
                        <br/>
                        <input type="checkbox" name="switch" class="w3-check" (change)="toggleGroup('hideContainers')"/> Container lyphs
                        <br/>
                        <input type="checkbox" name="switch" class="w3-check" (change)="toggleNeuralLyphs('hideNeural')"/> Neural system
                        <input type="checkbox" name="switch" class="w3-check" (change)="toggleGroup('hideNeurons')"/> Neurons
                    </fieldset>
                    <fieldset class="w3-card w3-round w3-margin">
                        <legend>Helpers</legend>
                        <input type="checkbox" name="planes"  class="w3-check" (change)="togglePlanes(['x-y'])"/> Grid x-y
                        <input type="checkbox" name="planes"  class="w3-check" (change)="togglePlanes(['x-z'])"/> Grid x-z
                        <input type="checkbox" name="planes"  class="w3-check" (change)="togglePlanes(['axis'])"/> Axis
                    </fieldset>
                    <fieldset class="w3-card w3-round w3-margin">
                        <legend>Select Name</legend>
                        <selectNameSearchBar [selectedName]="_selectedName" [namesAvailable]="_namesAvailable" (selectedBySearchEvent)="handleSelectedLyphEvent($event)" (highlightedByHoverEvent)="handleSearchHover($event)" (unhighlightedByUnhoverEvent)="handleSearchRemoveHover($event)"></selectNameSearchBar>
                    </fieldset>
                    <modelInfoPanel *ngIf="!!_highlighted && !!_highlighted.__data" [model] = _highlighted.__data></modelInfoPanel>
                </section>
            </section>
        </section>
    `,
  styles: [`
        #viewPanel{
          z-index: 5;
        }

        :host >>> fieldset {
            border:1px solid grey;
            margin: 2px;
        }

        :host >>> legend {
            padding: 0.2em 0.5em;
            border:1px solid grey;
            color:grey;
            font-size:90%;
            text-align:right;
        }
        button:focus {outline:0 !important;}
    `]
})
export class WebGLSceneComponent {
  @ViewChild('canvas') canvas: ElementRef;
  scene;
  camera;
  renderer;
  canvasContainer;
  controls;
  mouse;
  windowResize;
  width;
  height;
  _highlighted;
  _namesAvailable;
  _selectedName;

  graph;
  helpers = {};

  @Input('graphData') set graphData(newGraphData) {
    if (this._graphData !== newGraphData) {
      this._graphData = newGraphData;
      if (this.graph) {
        this.graph.graphData(this._graphData);
      }
    }
  }

  @Input('ontologyNames') set ontologyNames(newOntologyNames) {

    if (this._namesAvailable !== newOntologyNames) {
      this._namesAvailable = newOntologyNames.map(function(item) {
        return item.name;
      });
    }
    console.log("this._namesAvailable: ", this._namesAvailable);
  }

  @Output() selectedByClickEvent = new EventEmitter();


  /**
   * @emits highlightedItemChange - the highlighted item changed
   */
  @Output() highlightedItemChange = new EventEmitter();


  get graphData() {
    return this._graphData;
  }

  constructor() {
    this._showLyphs = true;
    this._showLayers = true;
    this._showNodeLabels = true;
    this._showLinkLabels = false;
    this._showLyphLabels = false;
    this._hideNeural = false;
    this._hideLinks = {
      hideTrees: true,
      hideCoalescences: true,
      hideContainers: true,
      hideNeurons: true
    };
    this._numDimensions = 3;
    this.mousedOverObj = null;
    this._highlighted = null;
    this._selectedName = "";
  }

  ngAfterViewInit() {
    if (this.renderer) {
      return;
    } //already initialized
    //We start from switched off omega threes and container lyphs
    this._graphData.toggleLinks(this._hideLinks);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas.nativeElement
    });
    this.renderer.setClearColor(0xffffff);

    this.canvasContainer = document.getElementById('canvasContainer');
    this.width = this.canvasContainer.clientWidth;
    this.height = this.canvasContainer.clientHeight;

    this.camera = new THREE.PerspectiveCamera(70, this.width / this.height, 100);
    this.camera.position.set(0, 100, 500);
    this.camera.aspect = this.width / this.height;

    //this.controls = new TrackballControls(this.camera, container);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera.updateProjectionMatrix();

    // For resizing

    // Lights
    const ambientLight = new THREE.AmbientLight(0xcccccc);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff);
    pointLight.position.set(300, 0, 300);
    this.scene.add(pointLight);

    this.mouse = new THREE.Vector2(0, 0);
    this.createEventListeners(); // keyboard / mouse events
    this.resizeCanvasToDisplaySize();
    this.createHelpers();
    this.createGraph();
    this.animate();
  }

  createEventListeners() {
    window.addEventListener('mousemove', evt => this.onMouseMove(evt), false);
    window.addEventListener('mousedown', evt => this.onMouseDown(evt), false);
    window.addEventListener('keydown', evt => this.onKeyDown(evt), false);
  }

  resizeCanvasToDisplaySize(force) {

    const canvas = this.renderer.domElement;
    const width = this.canvasContainer.clientWidth;
    const height = this.canvasContainer.clientHeight;

    const dimension = function() {
      return {
        width,
        height
      }
    };

    if (force || canvas.width !== width || canvas.height !== height) {
      this.windowResize = new WindowResize(this.renderer, this.camera, dimension);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.width = this.canvasContainer.clientWidth;
      this.height = this.canvasContainer.clientHeight;
      window.dispatchEvent(new Event('resize'));
    }
  }

  animate() {
    this.resizeCanvasToDisplaySize();
    if (this.graph) {
      this.graph.tickFrame();
    }
    this.controls.update();

    this.renderer.render(this.scene, this.camera);
    window.requestAnimationFrame(_ => this.animate());
  }

  createHelpers() {
    let gridColor = new THREE.Color(0xcccccc);
    let axisColor = new THREE.Color(0xaaaaaa);

    // x-y plane
    let gridHelper1 = new THREE.GridHelper(1000, 10, axisColor, gridColor);
    gridHelper1.geometry.rotateX(Math.PI / 2);
    this.scene.add(gridHelper1);
    this.helpers["x-y"] = gridHelper1;

    // x-z plane
    let gridHelper2 = new THREE.GridHelper(1000, 10, axisColor, gridColor);
    this.scene.add(gridHelper2);
    this.helpers["x-z"] = gridHelper2;

    let axisHelper = new THREE.AxisHelper(510);
    this.scene.add(axisHelper);
    this.helpers["axis"] = axisHelper;

    this.togglePlanes(["x-y", "x-z", "axis"]);
  }

  createGraph() {
    //Create
    this.graph = new ThreeForceGraph()
      .graphData(this._graphData || {});

    this.graph.d3Force("x", forceX().x(d => ('x' in d.layout) ? d.layout.x : 0)
      .strength(d => ('x' in d.layout) ? ((d.type === NODE_TYPES.CORE) ? 1 : 0.5) : 0)
    );

    this.graph.d3Force("y", forceY().y(d => ('y' in d.layout) ? d.layout.y : 0)
      .strength(d => ('y' in d.layout) ? ((d.type === NODE_TYPES.CORE) ? 1 : 0.5) : 0)
    );

    this.graph.d3Force("z", forceZ().z(d => ('z' in d.layout) ? d.layout.z : 0)
      .strength(d => ('z' in d.layout) ? ((d.type === NODE_TYPES.CORE) ? 1 : 0.5) : 0)
    );

    this.graph.d3Force("link")
      .distance(d => d.length)
      .strength(d => (d.strength ? d.strength :
        (d.type === LINK_TYPES.CONTAINER) ? 0 : 1));

    // this.graph.d3Force("radial", forceRadial( d => {
    //     return (('r' in d.layout)? d.layout.r: 0);
    // }).strength(d => ('r' in d.layout)? 5: 0));
    this.scene.add(this.graph);
    this.toggleNeuralLyphs();
  }

  update() {
    this.graph.numDimensions(this._numDimensions);
  }


  // Handle incoming Events
  // after selecting a 'name' from drop bar -- find in graph and highlight
  handleSelectedLyphEvent(namedItem) {
    let lyphToHighlight = this.getLyphObjByName(namedItem);
    if (namedItem != this._selectedName) {
      if (lyphToHighlight) {
        this._selectedName = namedItem
        this._selectedLyph = lyphToHighlight;
        this.unhighlightThenHighlight(lyphToHighlight);
      }
    }
  }

  handleSearchRemoveHover(hoveredName) {
    let ObjToUnhighlight = this.getLyphObjByName(hoveredName);

    if (ObjToUnhighlight) {
      this.unhighlightObj(ObjToUnhighlight);
    }

  }

  handleSearchHover(unhoveredName) {
    if (unhoveredName != this.highlightedName) {
      let highlightColor = 0xff0000;
      let objToHighlight = this.getLyphObjByName(unhoveredName);

      if (objToHighlight) {  this.highlightObj(objToHighlight, highlightColor);  }
    }

  }

  // Get lyph view object from graph.
  // TODO for Terry: THIS SHOULD NOT BE HERE!
  // @NK: Where does this belong? It needs to access the viewObjects from this.graph.children (I think)
  getLyphObjByName(name) {
    let useLayer; // in the instance the sought lyph is a layer
    let lyphToSelect = this.graph.children.filter(child => {
      if (child.__data) {
        if (child.__data.constructor.name === Lyph.name) {
          if (child.__data.name === name) {
            return child;
          } else {
            if (child.__data.layers) {
              child.__data.layers.forEach(layer => {
                if (layer.viewObjects.lyphs["2d"].__data.name === name) {  useLayer = layer.viewObjects.lyphs["2d"]; }
              });
            }
          }
        }
      }
    });
    if (lyphToSelect[0]) return lyphToSelect[0]; // return lyph if it was a whole lyph

    if (useLayer) return useLayer; // return lyph if it was a layer

    return undefined;
  }

  getMousedOverObj() {
    let mousedOverObj = null;
    let vector = new THREE.Vector3( this.mouse.x, this.mouse.y, 1 );
    vector.unproject(this.camera);

    let ray = new THREE.Raycaster(this.camera.position, vector.sub(this.camera.position).normalize());

    let intersects = ray.intersectObjects(this.graph.children);

    if (intersects.length > 0) {
      if (!intersects[0].object.__data || intersects[0].object.__data.inactive) {
        return;
      }

      // store reference to closest Obj as current intersection Obj
      mousedOverObj = intersects[0].object;

      if (mousedOverObj.__data) {

        // store reference to Obj type to check for highlight type. E.g. Lyph.name
        mousedOverObj.objName = mousedOverObj.__data.constructor.name;

        // Also search internally for internal layers
        // check if lyphmodel, then make highlight Obj a layer
        if (mousedOverObj.objName === Lyph.name) {
          let layerMeshes = [];
          // Get layer meshes within lyph
          if (intersects[0].object.__data.layers) {
            intersects[0].object.__data.layers.forEach(layer => {
              layerMeshes.push(layer.viewObjects.lyphs["2d"])
            });

            // Find layer with which mouse is hovering over.
            let layerIntersects = ray.intersectObjects(layerMeshes);

            // If layer was found, make it the mousedOverObj item
            if (layerIntersects.length > 0) {
              mousedOverObj = layerIntersects[0].object;
            }
          }
        }
      }
    }
    return mousedOverObj;
  }


  getLyphObjClickedOn() {
    let lyphClickedOn;
    if (this._highlighted) {
      if (this._highlighted.__data.constructor.name === Lyph.name) {
        if (this._highlighted.__data.name) {
          lyphClickedOn = this._highlighted.__data.name;
          this._selectedLyph = this._highlighted;
          this.unhighlightThenHighlight(this._selectedLyph);
        }
      }
    }
    return lyphClickedOn;
  }


  // Highlight a webgl Obj
  highlightObj(ObjToHighlight, highlightColor) {

    // store color of closest Obj (for later restoration)
    if (ObjToHighlight) {
      if (ObjToHighlight.__data) {
        if (ObjToHighlight.__data.name != this._selectedName) {
          ObjToHighlight.currentHex = ObjToHighlight.material.color.getHex();
          (ObjToHighlight.children || []).forEach(child => {
            // if (child.visible && child.material){    ||| not sure if the visible part is necessary
            if (child.material) { child.currentHex = child.material.color.getHex();   }
          });
        }
      }
    }


    // set a new color for closest Obj
    ObjToHighlight.material.color.setHex(highlightColor);
    (ObjToHighlight.children || []).forEach(child => {

      // if (child.visible && child.material){    ||| not sure if the visible part is necessary
      if (child.material) {
        child.material.color.setHex(highlightColor);
      }
    });

    this.highlightedItemChange.emit(ObjToHighlight);

    this.highlightedName = ObjToHighlight.__data.name;

    return ObjToHighlight;

  }

  // Unhighlight a webgl Obj
  unhighlightObj(ObjToUnhighlight) {
    // restore previous intersection Obj (if it exists) to its original color
    if (ObjToUnhighlight) {
      ObjToUnhighlight.material.color.setHex(ObjToUnhighlight.currentHex);
      (ObjToUnhighlight.children || []).forEach(child => {
        if (child.material) {
          child.material.color.setHex(child.currentHex);
        }
      })
    }
    ObjToUnhighlight = null;
    this.highlightedItemChange.emit(ObjToUnhighlight);

    return ObjToUnhighlight;
  }


  // hideHighlighted()
  // {
  //   if (this._highlighted){
  //       (this._highlighted.children || []).forEach(child => {
  //           child.visible = false;
  //           // console.log("hiding child: ", child);
  //       });
  //
  //       // console.log("hiding parent: ", this._highlighted);
  //       this._highlighted.visible = false;
  //     }
  // }



  // handle unhighlighting and highlighting
  unhighlightThenHighlight(objToHighlight) {
    let highlightColor = 0xff0000;

    // First unhighlight previously highlighted
    if (this._highlighted) {
      if (this._highlighted.__data) {
        if (this._highlighted.__data.name != this._selectedName) {
          // unhighlight selected
          this._highlighted = this.unhighlightObj(this._highlighted);

        }
      } else {
        this._highlighted = this.unhighlightObj(this._highlighted);
      }
    }

    // Highlight Obj
    if (objToHighlight) {
      this._highlighted = this.unhighlightObj(this._highlighted);

      // To handle "selected" lyphs green colouring
      // check whether we have a 'selected item' and change highlight color accordingly.
      if (this._selectedLyph && objToHighlight.__data) {
        if (this._selectedLyph.__data) {
          if (this._selectedLyph.__data.name === objToHighlight.__data.name) {
            highlightColor = 0x00ff00;
          }
        }
      }

      this._highlighted = this.highlightObj(objToHighlight, highlightColor);
    }
  }

  // Handle user input controls, eg, keyboard and mouse events
  // Handle mouse move
  onMouseMove(evt) {
    // calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    let rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((evt.clientX - rect.left) / (rect.width - rect.left)) * 2 - 1;
    this.mouse.y = -((evt.clientY - rect.top) / (rect.bottom - rect.top)) * 2 + 1;

    this.mousedOverObj = this.getMousedOverObj();

    // handle highlighting
    this.unhighlightThenHighlight(this.mousedOverObj);

  }




  // Handle mouse click
  onMouseDown(evt) {

    // Check if a lyph is being selected.
    let lyphClickedOn = this.getLyphObjClickedOn();
    if (lyphClickedOn) {
      this._selectedName = lyphClickedOn;
    }
  }

  onKeyDown(evt) {

    let keyCode = evt.which;
    if (evt.ctrlKey) {
      evt.preventDefault();
      switch (keyCode) {
        case 37: // Left arrow
          break;
        case 39: // Right arrow
          break;
        case 40: // Down arrow
          this.zoom(-10);
          break;
        case 38: // Up arrow
          this.zoom(10);
      }
    } else {
      if (evt.shiftKey) {
        // I comment this out so that I can do cmd+shft+R (Hard refresh) during coding
        // evt.preventDefault();
        switch (keyCode) {
          case 37: // Left arrow
            this.rotateScene(-10, 0);
            break;
          case 39: // Right arrow
            this.rotateScene(10, 0);
            break;
          case 40: // Down arrow
            this.rotateScene(0, 10);
            break;
          case 38: // Up arrow
            this.rotateScene(0, -10);
        }
      }
    }

  }

  zoom(delta) {
    this.camera.position.z += delta;
    this.camera.lookAt(this.scene.position);
  }

  rotateScene(deltaX, deltaY) {
    this.camera.position.x += deltaX;
    this.camera.position.y += deltaY;
    this.camera.lookAt(this.scene.position);
  }

  //Toggle scene elements

  togglePlanes(keys) {
    keys.filter(key => this.helpers[key]).forEach(key => {
      this.helpers[key].visible = !this.helpers[key].visible
    });
  }

  toggleLyphs() {
    this._showLyphs = !this._showLyphs;
    this.graph.showLyphs(this._showLyphs);
  }

  toggleLayers() {
    this._showLayers = !this._showLayers;
    this.graph.showLayers(this._showLayers);
  }

  toggleLyphIcon(value) {
    this.graph.method(value);
  }

  toggleNodeLabels() {
    this._showNodeLabels = !this._showNodeLabels;
    this.graph.showNodeLabel(this._showNodeLabels);
  }

  toggleLinkLabels() {
    this._showLinkLabels = !this._showLinkLabels;
    this.graph.showLinkLabel(this._showLinkLabels);
  }

  toggleLyphLabels() {
    this._showLyphLabels = !this._showLyphLabels;
    this.graph.showLyphLabel(this._showLyphLabels);
  }

  toggleDimensions(numDimensions) {
    this._numDimensions = numDimensions;
    this.graph.numDimensions(numDimensions);
  };

  toggleGroup(hideGroup) {
    this._hideLinks[hideGroup] = !this._hideLinks[hideGroup];
    this._graphData.toggleLinks(this._hideLinks);
    if (this.graph) {
      this.graph.graphData(this._graphData);
    }
  }

  toggleNeuralLyphs() {
    this._hideNeural = !this._hideNeural;
    this._graphData.links.filter(link => link.name === "Ependymal")
      .forEach(link => link.conveyingLyph.hidden = this._hideNeural);
    if (this.graph) {
      this.graph.graphData(this._graphData);
    }
  }

  updateLabelContent(target, property) {
    switch (target) {
      case 'node':
        {
          this.graph.nodeLabel(property);
          return;
        }
      case 'link':
        {
          this.graph.linkLabel(property);
          return;
        }
      case 'lyph':
        {
          this.graph.iconLabel(property);
        }
    }
  }
}

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  // I comment out stop propagation so that I can do cmd+shft+R (Hard refresh) during coding
  // declarations: [ WebGLSceneComponent, ModelInfoPanel, SelectNameSearchBar, StopPropagation ],
  declarations: [WebGLSceneComponent, ModelInfoPanel, SelectNameSearchBar],
  exports: [WebGLSceneComponent]
})
export class WebGLSceneModule {}
