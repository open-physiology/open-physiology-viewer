# Usage

## Build instructions
   * Install  [Node.js](https://nodejs.org/).    
   * Clone (or download and unzip) the project to your file system: `git clone https://github.com/open-physiology/open-physiology-viewer.git`
   * Go into the project directory: `cd ./open-physiology-viewer`
   * Install build dependencies: `npm install`
   * Run the build script: `npm run build`
   
   The compiled code is in the `open-physiology/dist/` folder. After that you should be able to open a demo app `test-app/index.html` in your browser.

## Lyph viewer as a widget
 A lyph viewer is available as a stand-alone module that can be used in other applications as a graphical widget. For integrating the viewer with other applications, include  `open-physiology-viewer.js` to your build and import:
  * `WebGLSceneModule` - the module that provides the Angular component `WebGLSceneComponent`. The component currently accepts 3 parameters:
    - `graphData` - an ApiNATOMY model in the deserialized JSON format (as returned by the `DataService`).
    - `highlighted` - a reference to a visual resource (e.g., node, link, lyph, region) to highlight.
    - `selected` - a reference to a visual resource to be selected.
  
  