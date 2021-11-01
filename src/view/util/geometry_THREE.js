// import '../lines/LineSegments2'
// import '../lines/Line2'
// import '../lines/LineGeometry'  

export class geometry_THREE {
  static createArrowHelper(normalize, targetCoords, arrowLength, colorHex) { 
    return new THREE.ArrowHelper(normalize
    , targetCoords
    , arrowLength
    , colorHex
    , arrowLength
    , arrowLength * 0.75);
  }
  static createCatmullRomCurve3(path) { 
    return new THREE.CatmullRomCurve3(path);
  }
  static createCubicBezierCurve3(start, p0, p1, end ) { 
    return new THREE.CubicBezierCurve3(start
      , p0
      , p1
      , end);
  }
  static createCurvePath(paths ) { 
    let path = THREE.CurvePath()
    params.paths.forEach((p)=>{
      path.add(p);
    });
    return path;
  }
  static createCylinderGeometry(thickness, a, height, radiusSegments, heightSegments) { 
    return new THREE.CylinderGeometry(thickness
      , thickness
      , a * height
      , radiusSegments
      , heightSegments)
  }
  static createEllipseCurve(aX, aY, xRadius, yRadius, aStartAngle, aEndAngle, aClockwise, aRotation ) { 
    return new THREE.EllipseCurve(
      aX, aY,
      xRadius, yRadius,
      aStartAngle, aEndAngle,  // aStartAngle, aEndAngle
      aClockwise,               // aClockwise
      aRotation // aRotation
    );
  }
  static createLineCurve3(p0, p1 ) {
    return new THREE.LineCurve3(p0, p1);
  }
  static createLine(geometry, material ) { 
    return new THREE.Line(geometry, material);
  }
  static createLine2(geometry, material ) { 
    return new THREE.Line2(geometry, material);
  }
  static createLine3(start, end) { 
    return new THREE.Line3(start, end);
  }
  static createLineGeometry(params = {}) { 
    return new THREE.LineGeometry(params);
  }
  static createLineBasicMaterial(params = {}) { 
    return new THREE.LineBasicMaterial(params);
  }
  static createLineMaterial(params = {}) { 
    return new THREE.LineMaterial(params);
  }
  static createLineSegments2(params = {}) { 
    return new THREE.LineSegments2(params);
  }
  static createMesh(geometry, material) { 
    return new THREE.Mesh(geometry, material)
  }
  static createMeshBasicMaterial(params = {}) { 
    return new THREE.MeshBasicMaterial(params);
  }
  static createQuadraticBezierCurve(start, control, end ) {
    return new THREE.QuadraticBezierCurve(start, control, end);
  }
  static createQuadraticBezierCurve3(start, control, end ) { 
    return new THREE.QuadraticBezierCurve3(start
                                          ,control
                                          ,end)
  }
  static createShape(pieces ) { 
    return new THREE.Shape(pieces);
  }
  static createSphereGeometry(verticeRelSize, verticeResolution) {
    return new THREE.SphereGeometry(verticeRelSize,
                                    verticeResolution,
                                    verticeResolution);
  }
  static createVector2(x, y) { 
    return new THREE.Vector2(x, y);
  }
  static createVector3(x = 0, y = 0, z = 0) { 
    return new THREE.Vector3(x, y, z);
  }
  static createBufferAttribute(numbers, itemSize) {
    return new THREE.BufferAttribute(numbers, itemSize);
  }
  static createBufferGeometry() { 
    return new THREE.BufferGeometry();
  }
  static createGeometry() { 
    return new THREE.Geometry();
  }

  static createLineDashedMaterial(params = {}) { 
    return new THREE.LineDashedMaterial(params);
  }

  static createMeshBasicMaterial(params = {}) { 
    return new THREE.MeshBasicMaterial(params);
  }
  static createMeshLambertMaterial(params = {}) { 
    return new THREE.MeshLambertMaterial(params);
  }
}