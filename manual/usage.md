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
  * `DataService` - a class that prepares the user input in the form of a serialized JSON file to be used by the lyph viewer. Here we auto-create entities for shorthand models that were not defined explicitly, expand lyph templates, process JSONPath queries and replace all IDs with object references.
  * `WebGLSceneModule` - the module that provides the Angular2 component `WebGLSceneComponent`. The component currently accepts 3 parameters: 
    - `graphData` - an ApiNATOMY model in the deserialized JSON format (as returned by the `DataService`).
    - `highlighted` - a reference to a graphical object to highlight. Each graphical object can be accessed from the ApiNATOMY entity object via its property `viewObjects['main']` which returns a reference to a WebGL object that represents this entity in the viewer.
    - `selected` - a reference to a graphical object to be selected. 
  
  