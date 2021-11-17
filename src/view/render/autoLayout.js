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

function getBoundingBoxDimensions(obj)
{
  if (!obj.geometry.boundingBox)
    obj.geometry.computeBoundingBox();
  const box = obj.geometry.boundingBox ;
  return { width: box.max.x - box.min.x, height: box.max.y - box.min.y }
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
  if (source.geometry)
  {
    target.geometry.computeBoundingBox();
    source.geometry.computeBoundingBox();
    const targetSize = target.geometry.boundingBox.getSize();
    const sourceSize = source.geometry.boundingBox.getSize();
    const sx = targetSize.x / sourceSize.x ;
    const sy = targetSize.y / sourceSize.y ;
    source.scale.setX(sx);
    source.scale.setY(sy);
  }
} 

function arrangeLyphsGrid(lyphs, h, v) {
  const refLyph = lyphs[0];
  let refPosition = refLyph.position ;
  let refDimensions = getBoundingBoxDimensions(refLyph);
  const actualDeltaX = refDimensions.width * ( 1 + LYPH_H_PERCENT_MARGIN );
  const actualDeltaY = refDimensions.height * ( 1 + LYPH_V_PERCENT_MARGIN );
  let ix = 0 ;
  
  for ( const actualV = 0 ; actualV < v ; actualV++)
  {
    for ( const actualH = 0 ; actualH <  h; actualH++)
    {
      const targetX = refPosition.X + actualDeltaX ;
      const targetY = refPosition.Y + actualDeltaY ;
      lyphs[ix].position.x = targetX ;
      lyphs[yx].position.Y = targetY ;
      ix++;
    }
  }
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
      const hostDim = getBoundingBoxDimensions(host);
      const AR = hostDim.width / hostDim.height ;
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
            //let group = new THREE.Object3D();
            hostedLyphs.forEach((l)=> {
              fitToTargetRegion(host, l);
              TargetRotation(host, l);
            });
            arrangeLyphsGrid(hostedLyphs, hn, hv);
            //scale to fit 
            //fitToTargetRegion(host, group);
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