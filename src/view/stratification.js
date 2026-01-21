import {modelClasses} from "../model";
import {THREE} from "./utils";

const {Stratification, VisualResource} = modelClasses;

/**
 * Update visual objects for a stratification
 */
Stratification.prototype.updateViewObjects = function(state) {
};

// Stratification creates visual objects but does not add them to the scheme
// Multiple copies of these are added in StratifiedRegion
Stratification.prototype.createViewObjects = function(state) {
    VisualResource.prototype.createViewObjects.call(this, state);

    // Parent group for all strata rectangles
    const group = new THREE.Group();
    group.userData = this;

    const strata = this.strata || [];
    const n = Math.max(1, strata.length);

    // Determine total visual dimensions relative to conveying link if present
    const link = this.conveys;
    const totalWidth = 20; // fixed visual width in world units (simplified)
    const totalHeight = link && link.length ? Math.max(20, link.length * 0.6) : 60; // proportional to link length if available

    // Create equal-height rectangles stacked along Y (height split), same width for all
    const rectWidth = totalWidth;
    const rectHeight = totalHeight / n;

    for (let i = 0; i < n; i++) {
        const mat = strata[i];
        const color = (mat && mat.color) ? mat.color : "#cccccc";
        const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthTest: true });
        const geometry = new THREE.PlaneGeometry(rectWidth, rectHeight);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData = { host: this, stratum: mat };
        // Position each rectangle so the stack is centered vertically around origin
        mesh.position.y = (i + 0.5) * rectHeight - totalHeight / 2;
        // Border (optional): simple line outline using EdgesGeometry
        const edgeGeo = new THREE.EdgesGeometry(geometry);
        const edgeMat = new THREE.LineBasicMaterial({ color: "#333333" });
        const edges = new THREE.LineSegments(edgeGeo, edgeMat);
        mesh.add(edges);
        group.add(mesh);
    }
    return group;
};
