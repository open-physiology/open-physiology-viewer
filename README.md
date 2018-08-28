# open-physiology-viewer  

## Overview
Physiology deals with the body in terms of anatomical compartments that delineate portions of  interest. The compartments can be defined at various anatomical scales, from organs to cells.  Clinical and bioengineering experts are interested to see records of physical measurements  associated with certain anatomical compartments.  

[_ApiNATOMY_](http://open-physiology.org/apinatomy-toolkit/index.html) is a methodology to coherently manage knowledge about the scale, parthood and connectivity of anatomical compartments as well as to represent and analyse process mechanisms and associated measurements. It consists of   
* a knowledge model about biophysical entities, and   
* a method to build knowledge representations of physiology processes in terms of  biophysical entities and physical operations over these entities.

The current project visualizes 3d ApiNATOMY models as part of the [NIH-SPARC](https://commonfund.nih.gov/sparc) [MAP-CORE](https://projectreporter.nih.gov/project_info_description.cfm?aid=9538432) toolset.
The tool accepts as input a JSON file with model specification and generates a force-directed graph layout. The input model should satisfy the [ApiNATOMY JSON Schema](schema/index.html) specification.

## Build instructions
* Install  [Node.js](https://nodejs.org/).    
* Clone (or download and unzip) the project to your file system: `git clone https://github.com/open-physiology/open-physiology-viewer.git`
* Go into the project directory: `cd ./open-physiology-viewer`
* Install build dependencies: `npm install`
* Run the build script: `npm run build`

The compiled code is in the `open-physiology/dist/` folder. After that you should be able to open a demo app `test-app/index.html` in your browser.
