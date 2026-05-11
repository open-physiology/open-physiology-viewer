# Toolset Architecture

The ApiNATOMY lyph viewer is a core component of the [NIH-SPARC](https://commonfund.nih.gov/sparc) toolset, designed for the visualization and management of multi-scale physiology models. Its architecture emphasizes interoperability with external semantic services, cloud storage, and AI assistance.

## System Overview

The application is built as a web-based tool using [Three.js](https://threejs.org/) for 3D rendering and [Angular](https://angular.io/) for the user interface. It follows a decoupled architecture where the visual representation is driven by an underlying data model that can be synchronized with various external sources.

## External Integrations

ApiNATOMY relies on several external APIs and services to enrich models and facilitate collaborative development.

### AI Assistance
The viewer integrates with **OpenAI's GPT models** (via `openai.js`) to provide intelligent modeling assistance.
* **Contextual Analysis**: The system extracts the current model state and passes it as context to the AI.
* **Interaction**: A dedicated Assistant Panel allows users to query the AI about model structure, best practices, or automated model generation.
* **Authentication**: Requires a valid `OPENAI_API_KEY` provided via environment variables.

### Semantic Annotation Services
To ensure biological accuracy and interoperability, ApiNATOMY integrates with semantic services:
* **SciGraph**: The tool communicates with [SciGraph](https://github.com/SciCrunch/SciGraph) REST endpoints (e.g., `sparc-data.scicrunch.io`) to execute Cypher queries. This is used to map resources to standardized ontologies and identify relationships between biological entities.
* **HubMAP Annotations**: Integrates with [HubMAP](https://hubmapconsortium.org/) data for anatomical structures and spatial annotations, allowing users to browse and select annotated regions within the viewer.

### Data Integrations and Import
Model data can be imported from various collaborative platforms:
* **GitHub Model Import**: The viewer can fetch model definitions directly from GitHub repositories (primarily `open-physiology/apinatomy-models`). It uses the GitHub REST API to browse repository contents and retrieve JSON model files.
* **Google Spreadsheets**: A specialized importer allows loading models defined in Google Sheets. The viewer fetches the spreadsheet via the Google Docs export API and parses it into the internal ApiNATOMY format.

### Cloud Storage
For persistent storage of assets and model snapshots, the tool utilizes **Google Cloud Storage (GCS)**.
* **Image Hosting**: Model-related images and thumbnails are stored in a dedicated GCS bucket (`apinatomy-models`).
* **Content Management**: The `GCSClient` handles authenticated uploads and retrievals using JWT-based OAuth2 authentication.

## API Communication

All external communications are performed via asynchronous HTTP requests (using the `fetch` API). The architecture employs specialized helper modules (`github.js`, `openai.js`, `googleCloud.js`) to encapsulate authentication logic, header management, and error handling for each respective service.
