# open-physiology-viewer  

## Overview
Physiology deals with the body in terms of anatomical compartments that delineate portions of  interest. The compartments can be defined at various anatomical scales, from organs to cells.  Clinical and bioengineering experts are interested to see records of physical measurements  associated with certain anatomical compartments.  

[_ApiNATOMY_](https://youtu.be/unSw6VcIOHw) is a methodology to coherently manage knowledge about the scale, parthood and connectivity of anatomical compartments as well as to represent and analyse process mechanisms and associated measurements. It consists of
* a knowledge model about biophysical entities, and   
* a method to build knowledge representations of physiology processes in terms of  biophysical entities and physical operations over these entities.

The current project visualizes 3d ApiNATOMY models as part of the [NIH-SPARC](https://commonfund.nih.gov/sparc) [MAP-CORE](https://projectreporter.nih.gov/project_info_description.cfm?aid=9538432) toolset.
The main component in the current project accepts as input a JSON model and generates
a force-directed graph layout satisfying relational constraints among model resources.
The input model format is defined in the ApiNATOMY JSON Schema specification, check project [documentation](http://open-physiology-viewer-docs.surge.sh) for more detail.
Live demonstration of this application can be found [here](http://open-physiology-viewer.surge.sh).

## Build instructions
* Install  [Node.js](https://nodejs.org/).    
* Clone (or download and unzip) the project to your file system: `git clone https://github.com/metacell/open-physiology-viewer.git`
* Go into the project directory: `cd ./open-physiology-viewer`
* Install build dependencies: `npm install`
* Run the build script: `npm run build`

## Developer Run instructions
* Install  [Node.js](https://nodejs.org/).    
* Clone (or download and unzip) the project to your file system: `git clone https://github.com/metacell/open-physiology-viewer.git`
* Go into the project directory: `cd ./open-physiology-viewer`
* Install build dependencies: `npm install`
* Run the start script: `yarn start`
* Go to http://localhost:8081/test-app/

The compiled code is in the `open-physiology/dist/` folder. After that you should be able to open a demo app `test-app/index.html` in your browser.

## Google Chrome flags
* enable GPU rasterization see chrome://flags/#enable-gpu-rasterization
