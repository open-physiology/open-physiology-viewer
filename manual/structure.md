# Project Structure

The ApiNATOMY lyph viewer is organized into several functional modules that separate data modeling, visual representation, and user interface logic.

## Core Modules

### 1. Data Model (`src/model/`)
This module defines the internal representation of ApiNATOMY resources. It handles parsing, validation, and the logical relationships between biological entities.
* **`resourceModel.js`**: The base class for all model elements.
* **`lyphModel.js`**: Logic for lyphs, including layers and internal structures.
* **`graphModel.js`**: Manages the connectivity graph (nodes and links).
* **`scaffoldModel.js`**: Handles 2D and 3D scaffold structures used for anchoring models.
* **`groupModel.js`**: Manages collections of resources and their visibility.

### 2. View Engine (`src/view/`)
The view engine is responsible for the 3D rendering of the model using [Three.js](https://threejs.org/). It maps logical resources to their visual counterparts.
* **`modelView.js`**: The main entry point for the 3D scene, coordinating the rendering of all components.
* **`lyphView.js`**: Visual representation of lyphs, including their 3D geometry and layer stacks.
* **`linkView.js` & `verticeView.js`**: Rendering of graph edges and nodes.
* **`threeForceGraph.js`**: Integration with the force-directed layout engine.

### 3. User Interface Components (`src/components/`)
The UI is built with components that provide interactive tools for model exploration and editing.
* **Panels (`src/components/panels/`)**: Lateral panels for settings, resource inspection (LyphPanel), and AI assistance (AssistantPanel).
* **Editors (`src/components/editors/`)**: Specialized views for modifying model properties (e.g., LyphEditor, ChainEditor).
* **Dialogs (`src/components/dialogs/`)**: Modal windows for data import, export, and complex configuration tasks.
* **WebGL Scene**: The core canvas where the 3D model is displayed.

### 4. External APIs (`src/api/`)
Handles communication with external services as detailed in the [Architecture](./architecture.html) guide.
* **`github.js`**: Interface for importing models from GitHub.
* **`openai.js`**: Integration with GPT models for AI assistance.
* **`googleCloud.js`**: Google Cloud Storage and Spreadsheet integration.

## Support Modules

* **`src/services/`**: Cross-cutting services such as the `errorHandler` and `loggerService`.
* **`src/layouts/`**: Layout definitions for the application's UI structure.
* **`src/common/`**: Shared assets, styles, and utility functions.
* **`src/version/`**: Environment configuration and version tracking.

## Application Entry Points
The project supports multiple build configurations for different use cases (e.g., standard viewer, HubMAP integration, demo application), managed via Webpack and found in `src/index.js` and specialized app folders.
