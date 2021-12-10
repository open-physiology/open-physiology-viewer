const LYPH_H_PERCENT_MARGIN = 0.10;
const LYPH_V_PERCENT_MARGIN = 0.10;
const MAX_LYPH_WIDTH = 100;

function trasverseSceneChildren(children, all) {
  children.forEach((c)=>{
    all.push(c);
    if (c.children?.length > 0)
      trasverseSceneChildren(c.children, all);
  });
}

function getSceneObjectByModelId(scene, userDataId) {
  return scene.children.find(c => c.userData.id === userDataId);
}

function getSceneObjectsByList(scene, ids) {
  return scene.children.find(c => ids.indexOf(c.userData.id) > -1);
}

function getSceneObjectByModelClass(all, className) {
  return all.filter(c => c.userData.class === className);
}

function preventZFighting(scene)
{ 
  const allRadius = scene.children.map( r => r.preComputedBoundingSphereRadius ).filter(r => r).map(r => Math.round(r));

  function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
  }
  const uniqueRadius = allRadius.filter(onlyUnique).sort(function(a, b) {
    return a - b;
  });

  scene.children.forEach((c)=>{
    if (c.preComputedBoundingSphereRadius)
      c.position.z = uniqueRadius.indexOf(Math.round(c.preComputedBoundingSphereRadius)) * -0.05;
  })
}

function trasverseHostedBy(graphData, dict) {
  Object.keys(graphData).forEach((k) => {
    const val = graphData[k];
    if (Array.isArray(val)) {
      val.forEach((child)=>{
        const hostKey = child.hostedBy?.id ;
        if (hostKey)
        {
          if (dict[hostKey])
            dict[hostKey].push(child.id)
          else
            dict[hostKey] = [child.id]; //init
        }
      })
    }
  })
}

// {
//   "id": "226",
//   "name": "Epiglottis",
//   "external": [
//       "UBERON:0000388",
//       "ILX:0103886"
//   ],
//   "layers": [
//       "115",
//       "114in226",
//       "103"
//   ]
// }

function findParentInnerLyph(lyphs, id)
{
  let parent = undefined ;
  lyphs.forEach((l) => {
    if (l.layers)
    {
      const internal = l.layers.find( (inner) => inner.id === id );
      if(internal)
        parent = l.id ;
    }
  });
  return parent ;
}

function trasverseInternalLyphs(lyphs, dict) {
  lyphs.forEach((l) => {
    if (l.internalLyphs?.length > 0)
    {
      dict[l.id] = l.internalLyphs.map((l) => l.id) ;
    }
  })
}

function trasverseAnchors(graphData, dict, hostedBy) {
  Object.keys(graphData).forEach((k) => {
    const val = graphData[k];
    if (Array.isArray(val)) {
      val.forEach((child)=>{
        const hostKey = child.hostedBy?.id || hostedBy ;
        if (hostKey)
        {
          if (dict[hostKey])
            dict[hostKey].push(child.id)
          else
            dict[hostKey] = [child.id]; //init
        }
        // if (val.children)
        //   _trasverseHosts(val.children, hostKey);
      })
    }
  })
}

function getBoundingBox(obj)
{
  return isGroup(obj) ? getGroupBoundingBox(obj) : getMeshBoundingBox(obj);
}

function getMeshBoundingBox(obj)
{
  obj.geometry.computeBoundingBox();
  return obj.geometry.boundingBox ;
}

function getGroupBoundingBox(group)
{
  return new THREE.Box3().setFromObject(group);
}

function getBoundingBoxSize(obj)
{
  return isGroup(obj) ? getGroupBoundingBoxSize(obj) : getMeshBoundingBoxSize(obj);
  //return isGroup(obj) ? calculateGroupBoundaries(obj) : getMeshBoundingBoxSize(obj);
}

function getMeshBoundingBoxSize(obj)
{
  obj.geometry.computeBoundingBox();
  const size = new THREE.Vector3();
  obj.geometry.boundingBox.getSize(size) ;
  return size ;
}

function getGroupBoundingBoxSize(group)
{
  let bb = new THREE.Box3().setFromObject(group);
  return bb.getSize(new THREE.Vector3());
}

function isGroup(obj)
{
  return obj.type == 'Group' ;
}

function isMesh(obj)
{
  return obj.type == 'Mesh' ;
}

function getNumberOfHorizontalLyphs(ar, total)
{
  return Math.floor(total / (ar + 1));  
}

function cloneTargetRotation(target, source) {
  const r = target.rotation.clone();
  source.setRotationFromEuler(r);
}

function cloneTargetGeometry(target, source) {
  const g = target.geometry.clone();
  source.geometry = g ;
}

function rotateAroundCenter(target, rx, ry, rz) {
  if (target.geometry)
  {
    target.geometry.center();
    target.rotation.x = rx;
    target.rotation.y = ry;
    target.rotation.z = rz;
  }
}

function fitToTargetRegion(target, source, lyphInLyph) {
  const targetSize = getBoundingBoxSize(target);
  const sourceSize = getBoundingBoxSize(source);

  let sx = 0, sy = 0, sz = 0;

  //Handle size for internal lyphs
  if ( lyphInLyph ) {
    let minD = targetSize.x < targetSize.y ? targetSize.x : targetSize.y;
  
    sx = ( minD / sourceSize.x ) * ( 1 - LYPH_H_PERCENT_MARGIN) ;
    sy = ( minD / sourceSize.y ) * ( 1 - LYPH_V_PERCENT_MARGIN) ;
    sz = ( targetSize.z / sourceSize.z ) ;
  } else {
    sx = ( targetSize.x / sourceSize.x ) * ( 1 - LYPH_H_PERCENT_MARGIN) ;
    sy = ( targetSize.y / sourceSize.y ) * ( 1 - LYPH_V_PERCENT_MARGIN) ;
    sz = ( targetSize.z / sourceSize.z ) ;
  }

  source.scale.setX(sx);
  source.scale.setY(sy);

  let parent = target;
  while ( parent.parent ){
    if ( parent.parent.type == "Mesh" )
      parent = parent.parent;
    else
      break;
  }

  rotateAroundCenter(source
                  , parent.rotation.x
                  , parent.rotation.y
                  , parent.rotation.z);
  
  //source.scale.setY(sz);
} 

function getWorldPosition(scene, obj)
{
  scene.updateMatrixWorld(true);
  var position = new THREE.Vector3();
  position.getPositionFromMatrix( obj.matrixWorld );
  return position ;
}

function getMiddle(object)
{
  var middle = new THREE.Vector3();
  object.geometry.computeBoundingBox();
  const boundingBox = getBoundingBox(object);
  middle.x = (boundingBox.max.x + boundingBox.min.x) / 2;
  middle.y = (boundingBox.max.y + boundingBox.min.y) / 2;
  middle.z = (boundingBox.max.z + boundingBox.min.z) / 2;
  return middle ;
}

function getCenterPoint(mesh) {

  const middle = getMiddle(mesh);
  mesh.localToWorld( middle );

  return middle;
}

function translateGroupToOrigin(group) {
  const groupPos  = computeGroupCenter(group);
  group.translateX(- groupPos.x) ; //- ( objSize.x * 0.5 * 0 );
  group.translateY(- groupPos.y) ; //- ( objSize.y * 0.5 * 0);
}

function removeEntity(scene, obj) {
  var selectedObject = scene.getObjectByName(obj.name);
  scene.remove( selectedObject );
}

function setMeshPos(obj, x, y)
{
  obj.position.x = x ;
  obj.position.y = y ;
}

function translateMeshToTarget(target, mesh)
{
  const targetPos = getCenterPoint(target);
  setMeshPos(mesh, targetPos.x, targetPos.y)
}

function translateGroupToTarget(target, group) {
  //const targetPos = computeGroupCenter(target);
  const groupPos  = computeGroupCenter(group);
  const targetPos = getCenterPoint(target);
  group.translateX(targetPos.x - groupPos.x) ; //- ( objSize.x * 0.5 * 0 );
  group.translateY(targetPos.y - groupPos.y) ; //- ( objSize.y * 0.5 * 0);
}

function preventMaxSizeLyph() {
  let all = [];
  let kapsuleChildren = scene.children ;
  trasverseSceneChildren(kapsuleChildren, all);
  let lyphs = getSceneObjectByModelClass(all, 'Lyph');
  lyphs.forEach((l)=>{
    checkMaxLyphSize(l);
  })
}

function checkMaxLyphSize(target) {
  if (target)
  {
    const targetSize = getBoundingBox(target);
    const width = targetSize.max.x - targetSize.min.x ;
    if (width > MAX_LYPH_WIDTH)
    {
      const f = MAX_LYPH_WIDTH / width ;
      target.scale.setX(f);
      target.scale.setY(f);
    }
  }
}

function arrangeLyphsGrid(lyphs, h, v) {
  let group = new THREE.Group();
  const refLyph = lyphs[0];
  let refPosition = refLyph.position ;
  let refSize = getBoundingBoxSize(refLyph);

  let ix = 0 ;
  let targetX = 0 ;
  let targetY = 0;

  //starts building on 0,0

  const refWidth  = refSize.x * refLyph.scale.x ;
  const refHeight = refSize.y * refLyph.scale.y ;

  const refPaddingX = refWidth * LYPH_H_PERCENT_MARGIN * 0.5 ;
  const refPaddingY = refHeight * LYPH_V_PERCENT_MARGIN * 0.5 ;

  let maxX = 0 ;
  let maxY = 0 ;
  
  for ( let actualV = 0 ; actualV < h ; actualV++)
  {
    for ( let actualH = 0 ; actualH < v; actualH++)
    {
      if ( ix < lyphs.length )
      {
        targetX = refPaddingX + refWidth * actualH + ( 2 * refPaddingX * actualH);
        targetY = refPaddingY + refHeight * actualV + ( 2 * refPaddingY * actualV);
        lyphs[ix].position.x = targetX ;
        lyphs[ix].position.y = targetY ;
        group.add(lyphs[ix]);
        if (targetX > maxX)
          maxX = targetX ;
        if (targetY > maxY)
          maxY = targetY ;
        ix++;
      }
    }
  }

  group.translateX( maxX / -2);
  group.translateY( maxY / -2);

  return group ;
}

function reCenter(obj)
{
  const boxSize = getBoundingBoxSize(obj);
  const deltaX = - boxSize.x /2;
  const deltaY = - boxSize.y /2;
  obj.translateX(deltaX);
  //obj.translateY(deltaY);
}

function putDebugObjectInPosition(scene, position)
{
  const geometry = new THREE.SphereGeometry(50);
  const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
  const sphere = new THREE.Mesh( geometry, material );
  sphere.position.set(position);
  scene.add(sphere);
}

function avg(a,b)
{
  return (a+b)/2;
}

function calculateGroupCenter(obj)
{
  let minX = 0 ;
  let maxX = 0 ;
  let minY = 0 ;
  let maxY = 0 ;
  let minZ = 0 ;
  let maxZ = 0 ;
  obj.children.forEach((c) => {
    // if (isMesh(c))
    // {
    //   if (!c.geometry.boundingBox)
    //     c.geometry.computeBoundingBox();
      if ( c.geometry.boundingBox.min.x < minX ) minX = c.geometry.boundingBox.min.x ;
      if ( c.geometry.boundingBox.max.x > maxX ) maxX = c.geometry.boundingBox.max.x ;
      if ( c.geometry.boundingBox.min.y < minY ) minY = c.geometry.boundingBox.min.y ;
      if ( c.geometry.boundingBox.max.y > maxY ) maxY = c.geometry.boundingBox.max.y ;
      if ( c.geometry.boundingBox.min.z < minZ ) minZ = c.geometry.boundingBox.min.z ;
      if ( c.geometry.boundingBox.max.z > maxZ ) maxZ = c.geometry.boundingBox.max.z ;
    //}
  });

  return new THREE.Vector3(avg(minX, maxX), avg(minY, maxY), avg(minZ, maxZ));
}

function getBorder(target)
{
  //add border bounding for debugging
  let bxbb = getBoundingBoxSize(target);

  var bx = new THREE.Mesh(
    new THREE.BoxGeometry(bxbb.x, bxbb.y, bxbb.z),
    new THREE.LineBasicMaterial( {
      color: 0xffffff,
      linewidth: 1,
      linecap: 'round', //ignored by WebGLRenderer
      linejoin:  'round' //ignored by WebGLRenderer
    } ));

  return bx ;
}

// lyphs within lyph are hosted by layers, extract layers from the parent and not the layer

// {
//   "id": "226",
//   "name": "Epiglottis",
//   "external": [
//       "UBERON:0000388",
//       "ILX:0103886"
//   ],
//   "layers": [
//       "115",
//       "114in226",
//       "103"
//   ]
// }

function getHostParentForLyph(all, hostId)
{
  return all.find((c)=> c.userData.id == hostId )
}

function computeGroupCenter(group)
{
  let box = new THREE.Box3().setFromObject(group)
  return box.center();
}

function layoutLyphs(scene, hostLyphDic, lyphInLyph)
{
  let all = [];
  let kapsuleChildren = scene.children ;
  trasverseSceneChildren(kapsuleChildren, all);
  let lyphs = getSceneObjectByModelClass(all, 'Lyph');
  clearByObjectType(scene, 'Lyph');
  Object.keys(hostLyphDic).forEach((hostKey) => {
    //get target aspect ratio
    const host = getHostParentForLyph(all, hostKey) ;
    if (host) 
    {
      const hostDim = getBoundingBoxSize(host);
      const AR = hostDim.x / hostDim.y ;
      const hostedElements = hostLyphDic[hostKey];
      if (hostedElements)
      {
        //get number of lyhps
        const hostedLyphs = lyphs.filter((l) => hostedElements.indexOf(l.userData.id) > -1);
        if (hostedLyphs.length > 0)
        {
          let hn = getNumberOfHorizontalLyphs(AR, hostedLyphs.length);
          let vn = hostedLyphs.length - hn ;

          if (hn == 0)
            hn = 1 ;
  
          if ( hn > 0 && vn > 0 )
          {
            if (lyphInLyph)
            {
              hostedLyphs.forEach((l)=> {
                fitToTargetRegion(host, l, lyphInLyph);
                translateMeshToTarget(host, l);
              });
            }
            else {
              hostedLyphs.forEach((l)=> {
                fitToTargetRegion(host, l, lyphInLyph);
              });
              const g = arrangeLyphsGrid(hostedLyphs, hn, vn);
              //putDebugObjectInPosition(scene, g.position);
              // hostedLyphs.forEach((l)=> {
              //   removeEntity(scene, l);
              // });
              //console.log(calculateGroupCenter(g));
              fitToTargetRegion(host, g, lyphInLyph);
              //translateGroupToTarget(host, g);
              //translateGroupToOrigin(g);
              translateGroupToTarget(host, g);
              scene.add(g);
            }
          }
        }
      }
    }
  })
}

function getPointInBetweenByPerc(pointA, pointB, percentage) {
    
  var dir = pointB.clone().sub(pointA);
  var len = dir.length();
  dir = dir.normalize().multiplyScalar(len*percentage);
  return pointA.clone().add(dir);
     
}

function layoutChains(scene, hostChainDic, hostedLyphs)
{
  let all = [];
  let kapsuleChildren = scene.children ;
  trasverseSceneChildren(kapsuleChildren, all);
  let lyphs = getSceneObjectByModelClass(all, 'Lyph');
  clearByObjectType(scene, 'Lyph');
  Object.keys(hostChainDic).forEach((hostKey) => {
    //get target aspect ratio
    const leaf = lyphs.find( lyph => lyph.userData.id === hostChainDic[hostKey]["leaf"]["parent"]);
    if (leaf?.geometry ) 
    {
      const lyph = lyphs.find( lyph => lyph.userData.id === hostChainDic[hostKey]["leaf"]["id"]);
      var middle = getCenterPoint(leaf);
      lyph && setMeshPos(lyph, middle.x, middle.y); }

    const root = lyphs.find( lyph => lyph.userData.id === hostChainDic[hostKey]["root"]["parent"]);
    if (root?.geometry ) 
    {
      const lyph = lyphs.find( lyph => lyph.userData.id === hostChainDic[hostKey]["root"]["id"]);
      var middle = getCenterPoint(root);
      lyph && setMeshPos(lyph, boundingBox.x, boundingBox.y);
    }

    if ( root?.geometry && leaf?.geometry ){
      const chainLyphs = hostChainDic[hostKey]["lyphs"];
      chainLyphs?.forEach( (lyphId, index) => { 
        if ( hostedLyphs.indexOf(lyphId) == -1) {
          const lyph = lyphs.find( lyph => lyph.userData.id === lyphId );
          const newPoint = getPointInBetweenByPerc(root.position, leaf.position, .5);
          (lyph ) && setMeshPos(lyph, newPoint.x, newPoint.y);
        }
      });
    }
  });
}

export function removeDisconnectedObjects(model, joinModel) {

  const wiredTo = joinModel.chains.map((c) => c.wiredTo);
  const hostedBy = joinModel.chains.map((c) => c.hostedBy);

  const connected = wiredTo
                  .concat(model.anchors
                  .map((c) => c.hostedBy))
                  .concat(hostedBy)
                  .filter((c) => c !== undefined);


  // All cardinal nodes
  const anchorsUsed = [];
  model.anchors.forEach( anchor => { 
      anchor.cardinalNode ? anchorsUsed.push(anchor.id) : null
  });
  
  // Wires of F and D, the outer layers of the TOO map
  const outerWires = model.components.find( wire => wire.id === "wires-f");
  outerWires.wires.concat(model.components.find( wire => wire.id === "wires-d")).wires;
  outerWires.wires = outerWires.wires.filter( wireId => {
      const foundWire = model.wires.find( w => w.id === wireId );
      return anchorsUsed.indexOf(foundWire?.source) > -1 && anchorsUsed.indexOf(foundWire?.target) > -1
  });

  const connectedWires = wiredTo.concat(hostedBy);
  // Other anchors used by the connectivity model lyphs and chains
  connectedWires.forEach( wireId => {
     if ( wireId !== undefined ){
      const wire = model.wires.find( wire => wireId === wire.id );
      if ( wire ) {
        if ( anchorsUsed.indexOf(wire.source) == -1 ){
            anchorsUsed.push(wire.source);
        }
        if ( anchorsUsed.indexOf(wire.target) == -1 ){
            anchorsUsed.push(wire.target);
        }
      }
    }
  });

  const updatedModel = Object.assign(model, 
      { 
          regions: model.regions.filter((r) => connected.indexOf(r.id) > -1 ),
          wires:  model.wires.filter((r) => connected.indexOf(r.id) > -1 || outerWires.wires.indexOf(r.id) > -1),
          anchors : model.anchors.filter((r) => (anchorsUsed.indexOf(r.id) > -1 ))
      }
  );

  return updatedModel;
}

export function autoLayout(scene, graphData) {

  preventZFighting(scene);

  const hostLyphRegionDic = {};
  trasverseHostedBy(graphData, hostLyphRegionDic);
  layoutLyphs(scene, hostLyphRegionDic, false);

  const hostLyphLyphDic = {};
  if(graphData.lyphs)
  {
    trasverseInternalLyphs(graphData.lyphs, hostLyphLyphDic);
    layoutLyphs(scene, hostLyphLyphDic, true);
  }

  let chainedLyphs = {};
  if( graphData.chains ) {
    parent.geometry?.computeBoundingBox();
    const hostedLyphs = [];
    graphData.chains.map( chain => { 
      chain.housingLyphs.map( hl => {
        if ( chain.hostedBy != undefined || chain.wiredTo != undefined  ){
          hostedLyphs.push(hl.id);
        }
      });
      chain.lyphs.map( hl => {
        if ( chain.hostedBy != undefined || chain.wiredTo != undefined  ){
          hostedLyphs.push(hl.id)
        }
      });
    });
    graphData.chains.forEach( chain => { 
      if ( chain.wiredTo === undefined && chain.hostedBy === undefined ){
      chainedLyphs[chain.id] = {leaf : {}, root : {}};
      chainedLyphs[chain.id]["leaf"]["id"] = chain.leaf?.id;
      chainedLyphs[chain.id]["leaf"]["parent"] = chain.leaf?.internalIn?.id;
      chainedLyphs[chain.id]["root"]["id"] = chain.root?.id
      chainedLyphs[chain.id]["root"]["parent"] = chain.root?.internalIn?.id
      chainedLyphs[chain.id]["lyphs"] = chain.housingLyphs?.map( c => c.id );
      if ( chainedLyphs[chain.id]["lyphs"] && chainedLyphs[chain.id]["leaf"] && chainedLyphs[chain.id]["root"] ) {
        layoutChains(scene, chainedLyphs, hostedLyphs);
        chainedLyphs = {};
      }
    }
    });
  }
  preventMaxSizeLyph();
}

export function clearByObjectType(scene, type) {
  const lyphs = getSceneObjectByModelClass(scene.children[5].children, type);
  lyphs.forEach((l)=> {
    removeEntity(scene, l);
  });
}