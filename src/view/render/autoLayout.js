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

function layoutLyphs(scene, hostLyphDic)
{
  let all = [];
  const kapsuleChildren = scene.children[scene.children.length-1].children ;
  trasverseSceneChildren(kapsuleChildren, all);
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
        const hostedLyphs = all.filter((l) => hostedElements.indexOf(l.userData.id) > -1);
        if (hostedLyphs.length > 0)
        {
          let hn = getNumberOfHorizontalLyphs(AR, hostedLyphs.length);
          let vn = hostedLyphs.length - hn ;

          if (hn == 0)
            hn = 1 ;
  
          if ( hn > 0 && vn > 0 )
          {
            //get width and height
            const lyphTargetWidth  = hostDim.width  / hn ;
            const lyphTargetHeight = hostDim.height / vn ;
  
            const lyphActualWidth = lyphTargetWidth   * ( 1 - 2*LYPH_H_PERCENT_MARGIN );
            const lyphActualHeight = lyphTargetHeight * ( 1 - 2*LYPH_V_PERCENT_MARGIN );
  
            hostedLyphs.forEach((l)=> {
              const lyphDims = getBoundingBoxDimensions(l);
              const xs = lyphActualWidth / lyphDims.width ; 
              const ys = lyphActualHeight / lyphDims.height ;
              l.scale.set( xs, ys, 1);
              // const center = host.geometry.boundingBox.center() ;
              // l.translateX(center.X);
              // l.translateY(center.Y);
              // l.translateZ(center.Z);
            })
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