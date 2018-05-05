# open-physiology-viewer  

## Project
Physiology deals with the body in terms of anatomical compartments that delineate portions of  interest. The compartments can be defined at various anatomical scales, from organs to cells.  Clinical and bioengineering experts are interested to see records of physical measurements  associated with certain anatomical compartments.  

[_ApiNATOMY_](http://open-physiology.org/apinatomy-toolkit/index.html) is a methodology to coherently manage knowledge about the scale, parthood and connectivity of anatomical compartments as well as to represent and analyse process mechanisms and associated measurements. It consists of   
* a knowledge model about biophysical entities, and   
* a method to build knowledge representations of physiology processes in terms of  biophysical entities and physical operations over these entities.

The current project aims at visualizing ApiNATOMY schematic physiology processes in 3d. It will provide a lyph-based graph viewer that will become part of the [NIH-SPARC](https://commonfund.nih.gov/sparc) [MAP-CORE](https://projectreporter.nih.gov/project_info_description.cfm?aid=9538432) toolset.
This [demo](http://open-physiology.org/demo/open-physiology-viewer/kidney/app/index.html) shows 
an early prototype featuring a Kidney Lobus scenario (presented at the [SPARC Annual Awardee Meeting](https://ww2.eventrebels.com/er/EventHomePage/CustomPage.jsp?ActivityID=24712&ItemID=86668) in April 5-7, 2018).
A more elaborated [demo](http://open-physiology.org/demo/open-physiology-viewer/neural/index.html)
displays parts of neural system (May 3, 2018). 

## Build instructions
* Install  [Node.js](https://nodejs.org/).    
* Clone (or download and unzip) the project to your file system: `git clone https://github.com/open-physiology/open-physiology-viewer.git`
* Go into the project directory: `cd ./open-physiology-viewer`
* Install build dependencies: `npm install`
* Run the build script: `npm run build`

The compiled code is in the `open-physiology/dist/` folder. After that you should be able to open a demo app `test-app/index.html` in your browser.
