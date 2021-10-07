// import '../lines/LineSegments2'
// import '../lines/Line2'
// import '../lines/LineGeometry'  
import { geometry_THREE } from './geometry_THREE'

  export const geometryEngine = {
    renderer: 'THREE'
  }

  export const geometryEngineK = {
    CYLINDER_TA_START : 10,
    CYLINDER_TA_END : 4,
    BUFFER_ATTRIBUTE_LENGTH : 3
  }

class GeometryFactorySingleton {
  renderer = null ;

  constructor(engineType = geometryEngine.THREE ) {
    if (this.renderer == null) {
      if (engineType == geometryEngine.THREE)
        this.renderer = geometry_THREE ;
    }
  }
  
  engine() {
    return this.renderer;
  }
  
  createArrowHelper(normalize, targetCoords, arrowLength, colorHex) { 
      return this.renderer.createArrowHelper(normalize
      , targetCoords
      , arrowLength
      , colorHex
      , arrowLength
      , arrowLength * 0.75);
  }
  createCatmullRomCurve3(path) { 
    return this.renderer.createCatmullRomCurve3(path);
  }
  createCubicBezierCurve3(start, p0, p1, end ) { 
    return this.renderer.createCubicBezierCurve3(start
      , p0
      , p1
      , end);
  }
  createCurvePath(paths ) { 
    let path = this.renderer.createCurvePath()
    params.paths.forEach((p)=>{
      path.add(p);
    });
    return path;
  }
  createCylinderGeometry(thickness, a, height) { 
    return this.renderer.createCylinderGeometry(thickness
      , thickness
      , a * height
      , geometryEngineK.CYLINDER_TA_END
      , geometryEngineK.CYLINDER_TA_END)
  }
  createEllipseCurve(aX, aY, xRadius, yRadius, aStartAngle, aEndAngle, aClockwise, aRotation ) { 
    return this.renderer.createEllipseCurve(
      aX, aY,
      xRadius, yRadius,
      aStartAngle, aEndAngle,  // aStartAngle, aEndAngle
      aClockwise,               // aClockwise
      aRotation // aRotation
    );
  }
  createLineCurve3(p0, p1 ) {
    return this.renderer.createLineCurve3(p0, p1);
  }
  createLine2(geometry, material ) { 
    return this.renderer.createLine2(geometry, material);
  }
  createLine3(start, end) { 
    return this.renderer.createLine3(start, end);
  }
  createLineGeometry(params = {}) { 
    return this.renderer.createLineGeometry(params);
  }
  createLineBasicMaterial(params = {}) { 
    return this.renderer.createLineBasicMaterial(params);
  }
  createLineMaterial(params = {}) { 
    return this.renderer.createLineMaterial(params);
  }
  createLineSegments2(params = {}) { 
    return this.renderer.createLineSegments2(params);
  }
  createMesh(geometry, material) { 
    return this.renderer.createMesh(geometry, material)
  }
  createMeshBasicMaterial(params = {}) { 
    return this.renderer.createMeshBasicMaterial(params);
  }
  createQuadraticBezierCurve(start, control, end ) {
    return this.renderer.createQuadraticBezierCurve(start, control, end);
  }
  createQuadraticBezierCurve3(start, control, end ) { 
      return this.renderer.createQuadraticBezierCurve3(start
                                            ,control
                                            ,end)
  }
  createShape(pieces ) { 
      return this.renderer.createShape(pieces);
  }
  createSphereGeometry(verticeRelSize, verticeResolution) {
    return this.renderer.createSphereGeometry(verticeRelSize,
                                    verticeResolution,
                                    verticeResolution);
  }
  createVector2(x, y) { 
    return this.renderer.createVector2(x, y);
  }
  createVector3(x, y, z) { 
    return this.renderer.createVector3(x, y, z);
  }
  createBufferAttribute(pointLength) {
    return this.renderer.createBufferAttribute(new Float32Array(pointLength * geometryEngineK.BUFFER_ATTRIBUTE_LENGTH)
                                                      , geometryEngineK.BUFFER_ATTRIBUTE_LENGTH)
  }
  createBufferGeometry() { 
      return this.renderer.createBufferGeometry();
  }
  createGeometry() { 
    return this.renderer.createGeometry();
  }
  createLineDashedMaterial(params = {}) { 
    return this.renderer.createLineDashedMaterial(params);
  }
  createMeshBasicMaterial(params = {}) { 
    return this.renderer.createMeshBasicMaterial(params);
  }
  createMeshLambertMaterial(params = {}) { 
    return this.renderer.createMeshLambertMaterial(params);
  }
}

export class GeometryFactory {
  static _instance = new GeometryFactorySingleton();
  static instance() { return this._instance; }
}