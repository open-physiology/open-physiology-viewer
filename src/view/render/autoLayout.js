const LYPH_H_PERCENT_MARGIN = 0.1 ;
const LYPH_V_PERCENT_MARGIN = 0.1 ;

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

function trasverseHosts(graphData, dict, hostedBy) {
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
        if (val.children)
          _trasverseHosts(val.children, hostKey);
      })
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
        if (val.children)
          _trasverseHosts(val.children, hostKey);
      })
    }
  })
}

function getBoundingBoxSize(obj)
{
  return isGroup(obj) ? getGroupBoundingBoxSize(obj) : getMeshBoundingBoxSize(obj);
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

function fitToTargetRegion(target, source) {
  const targetSize = getBoundingBoxSize(target);
  const sourceSize = getBoundingBoxSize(source);
  const sx = targetSize.x / sourceSize.x ;
  const sy = targetSize.y / sourceSize.y ;
  source.scale.setX(sx);
  source.scale.setY(sy);
} 

function getTargetWorldPosition(scene, obj)
{
  scene.updateMatrixWorld(true);
  var position = new THREE.Vector3();
  position.getPositionFromMatrix( obj.matrixWorld );
  return position ;
}

function getCenterPoint(mesh) {
  var middle = new THREE.Vector3();
  var geometry = mesh.geometry;

  geometry.computeBoundingBox();

  middle.x = (geometry.boundingBox.max.x + geometry.boundingBox.min.x) / 2;
  middle.y = (geometry.boundingBox.max.y + geometry.boundingBox.min.y) / 2;
  middle.z = (geometry.boundingBox.max.z + geometry.boundingBox.min.z) / 2;

  mesh.localToWorld( middle );
  return middle;
}

function translateToOrigin(obj) {
  obj.position.x = 0 ;
  obj.position.y = 0 ;
}

function removeEntity(scene, obj) {
  var selectedObject = scene.getObjectByName(obj.name);
  scene.remove( selectedObject );
}

function translateToTarget(scene, target, obj) {
  const targetPos = getCenterPoint(target);
  const objSize = getBoundingBoxSize(target);
  obj.position.x = targetPos.x - ( objSize.x * 0.5 );
  obj.position.y = targetPos.y ;
}

function arrangeLyphsGrid(lyphs, h, v) {
  let group = new THREE.Group();
  const refLyph = lyphs[0];
  let refPosition = refLyph.position ;
  let refSize = getBoundingBoxSize(refLyph);

  let ix = 0 ;
  let targetX = 0 ;
  let targetY = 0;
  
  for ( let actualV = 0 ; actualV < h ; actualV++)
  {
    for ( let actualH = 0 ; actualH < v; actualH++)
    {
      if ( ix < lyphs.length )
      {
        targetX = refPosition.x + refSize.x * lyphs[ix].scale.x * actualH * ( 1 + LYPH_H_PERCENT_MARGIN );
        targetY = refPosition.y + refSize.y * lyphs[ix].scale.y * actualV * ( 1 + LYPH_V_PERCENT_MARGIN );
        lyphs[ix].position.x = targetX ;
        lyphs[ix].position.y = targetY ;
        group.add(lyphs[ix]);
        ix++;
      }
    }
  }
  return group ;
}

function layoutLyphs(scene, hostLyphDic)
{
  let all = [];
  let kapsuleChildren = scene.children ;
  trasverseSceneChildren(kapsuleChildren, all);
  let lyphs = getSceneObjectByModelClass(all, 'Lyph');
  Object.keys(hostLyphDic).forEach((hostKey) => {
    //get target aspect ratio
    let host = all.find((c)=> c.userData.id == hostKey );
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
            hostedLyphs.forEach((l)=> {
              fitToTargetRegion(host, l);
              translateToOrigin(l);
            });
            const g = arrangeLyphsGrid(hostedLyphs, hn, vn);
            hostedLyphs.forEach((l)=> {
              removeEntity(scene, l);
            });
            scene.add(g);
            fitToTargetRegion(host, g);
            translateToTarget(scene, host, g);
          }
        }
      }
    }
  })
}

export function removeDisconnectedObjects(model, joinModel) {

  let connected = joinModel.chains
                  .map((c) => c.wiredTo)
                  .concat(model.anchors
                  .map((c) => c.hostedBy))
                  .concat(joinModel.chains
                  .map((c) => c.hostedBy))
                  .filter((c) => c !== undefined); 
                  

    return Object.assign(model, 
        { 
            regions: model.regions.filter((r) => connected.indexOf(r.id) > -1 )
            , wires: model.wires.filter((r) => connected.indexOf(r.id) > -1 )
        }
    );

}

export function autoLayout(scene, graphData) {
  preventZFighting(scene);

  const hostLyphDic = {};
  trasverseHosts(graphData, hostLyphDic, scene.regions);

  layoutLyphs(scene, hostLyphDic);
}