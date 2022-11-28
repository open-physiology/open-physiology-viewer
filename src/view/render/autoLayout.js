import {
 getDefaultControlPoint
} from "../utils";

import { getSceneObjectByModelClass
  , getHostParentForLyph
  , getBoundingBoxSize
  , getNumberOfHorizontalLyphs
  , getBoundingBox
  , getMeshBoundingBoxSize
  , getWorldPosition
  , setMeshPos } from "./autoLayout/objects";

import { trasverseHostedBy
  , trasverseSceneChildren
  , trasverseInternalLyphs
  , traverseMeshParent } from "./autoLayout/trasverse";

import { rotateAroundCenter
  , translateMeshToTarget
  , translateGroupToTarget   } from "./autoLayout/transform";

export const LYPH_H_PERCENT_MARGIN = 0.10;
export const LYPH_V_PERCENT_MARGIN = 0.10;
export const MAX_LYPH_WIDTH = 100;
export const MIN_LYPH_WIDTH = 50;
export const MIN_INNER_LYPH_WIDTH = 50;
const LYPH_LINK_SIZE_PROPORTION = 0.75;
const DENDRYTE = "dend";
const AXON = "axon";
const MAX_POINTS = 100;
const AXON_SIZE = .45;
const DENDRYTE_SIZE = .3;

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

export function fitToTargetRegion(target, source, lyphInLyph) {
  let targetSize =  getBoundingBoxSize(target);
  let sourceSize =  getBoundingBoxSize(source);

  let sx = 1, sy = 1, sz = 1;

  //Handle size for internal lyphs
  if ( lyphInLyph ) {
    let idealSize = maxLyphSize(target);

    if ( idealSize < MIN_INNER_LYPH_WIDTH ){
      idealSize = MIN_INNER_LYPH_WIDTH 
    }
    
    sx = ( idealSize / sourceSize.x ) * ( 1 - LYPH_H_PERCENT_MARGIN);
    sy = ( idealSize / sourceSize.y ) * ( 1 - LYPH_V_PERCENT_MARGIN);
    sz = ( idealSize / sourceSize.z ) ;
  } else {
    let idealSize = maxLyphSize(target);

    sx = idealSize / sourceSize.x;
    sy = idealSize / sourceSize.y;
    sz = idealSize / sourceSize.z;
  }

  source.scale.setX(sx);
  source.scale.setY(sy);


  let parent = traverseMeshParent(target);
  rotateAroundCenter(source
                  , parent.rotation.x
                  , parent.rotation.y
                  , parent.rotation.z);  
}

export function maxLyphSize(target) {
  let targetSize =  getBoundingBoxSize(target);

  let hostMaxSize = Math.max(targetSize.x, targetSize.y)* ( 1 - LYPH_H_PERCENT_MARGIN);
  let hostMinSize = Math.min(targetSize.x, targetSize.y)* ( 1 - LYPH_H_PERCENT_MARGIN);
  let idealSize = (hostMaxSize / target?.userData?.hostedLyphs?.filter( l => !l.hidden )?.length) * ( 1 - LYPH_H_PERCENT_MARGIN);
  if ( idealSize > hostMinSize ){
    idealSize = hostMinSize;
  }

  return idealSize;
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

function isContainedByParent(lyphId, hostLyphLyphDic) {
  let contained = false ;
  Object.keys(hostLyphLyphDic).forEach((parentId) => {
    const children = hostLyphLyphDic[parentId];
    if (children.indexOf(lyphId) > -1 )
      contained = true ;
  });
  return contained ;
}

function autoSizeLyphs(scene, hostLyphLyphDic) {
  let all = [];
  let kapsuleChildren = scene.children ;
  trasverseSceneChildren(kapsuleChildren, all);
  let lyphs = getSceneObjectByModelClass(all, 'Lyph');
  lyphs.forEach((l)=>{
    if (!isContainedByParent(l.userData.id,hostLyphLyphDic )) //avoid auto size to link
      autoSizeLyph(l);
  })
}

export function autoSizeLyph(lyph) {
  if (lyph)
  {
    
    let lyphSize = getBoundingBox(lyph);
    let lyphWidth = lyphSize.max.x - lyphSize.min.x ;
    let f = 1.0 ;
    //check chain link proportion
    //NK I removed inChain from properties as I am working on a refactoring that allows one lyph to be shared by several chains
    //A link that the lyph conveys is shared by all chains, so this should work for you too
    const link = lyph.userData?.conveys;
    const layerIn = lyph?.userData?.layerIn;
    if (link && !layerIn)//any link should be good enough as they are of the same size
    {
      const linkWidth = link.length * LYPH_LINK_SIZE_PROPORTION * 0.5;
      if (lyphWidth < linkWidth && lyphWidth < MAX_LYPH_WIDTH)
      {
        f = linkWidth / lyphWidth ;
        lyph.scale.setX(f);
        lyph.scale.setY(f);
      }
      //reassign for max size check 
      lyphWidth = linkWidth ;
    }
    //prevent max size
    if (lyphWidth > MAX_LYPH_WIDTH && !layerIn)
    {
      f = MAX_LYPH_WIDTH / lyphWidth ;
      lyph.scale.setX(f);
      lyph.scale.setY(f);
    }
  }
}

export function arrangeLyphsGrid(lyphs, h, v) {
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

function avg(a,b)
{
  return (a+b)/2;
}

export function lyphsInHost(host, hostedLyphs) {
  const hostDim = getBoundingBoxSize(host);
  const AR = hostDim.x / hostDim.y;
  //get number of lyhps
  if (hostedLyphs.length > 0) {
    let hn = getNumberOfHorizontalLyphs(AR, hostedLyphs.length);
    let vn = hostedLyphs.length - hn;

    if (hn == 0) hn = 1;

    if (hn > 0 && vn > 0) {
      if (lyphInLyph) {
        hostedLyphs.forEach((l) => {
          fitToTargetRegion(host, l, lyphInLyph);
          translateMeshToTarget(host, l);
        });
      } else {
        const g = arrangeLyphsGrid(hostedLyphs, hn, vn);
        fitToTargetRegion(host, g, lyphInLyph);
        translateGroupToTarget(host, g);
        scene.add(g);
      }
    }
  }
}

function layoutLyphs(scene, hostLyphDic, lyphDic, lyphInLyph)
{
  let all = [];
  let kapsuleChildren = scene.children ;
  trasverseSceneChildren(kapsuleChildren, all);
  let lyphs = getSceneObjectByModelClass(all, 'Lyph');
  //clearByObjectType(scene, 'Node');
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
              hostedLyphs.forEach((lyph)=> {
                lyph ? lyphDic[host.id] = lyphDic[host.userData.id] ? lyphDic[host.userData.id].lyphs.push(lyph) : lyphDic[host.userData.id] = { host : host, lyphs : [lyph] } : null;
              });
              const g = arrangeLyphsGrid(hostedLyphs, hn, vn);
              fitToTargetRegion(host, g, lyphInLyph);
              translateGroupToTarget(host, g);
              scene.add(g);
            }
          }
        }
      }
    }
  })
}

function layoutChainLyph(host, lyph, middle, ratio){
  if ( lyph ){
    fitToTargetRegion(host, lyph, true);
    setMeshPos(lyph, middle.x, middle.y, middle.z + 1);
    lyph?.scale?.setX(lyph?.scale?.x * ratio);
    lyph?.scale?.setY(lyph?.scale?.y * ratio);
    lyph?.scale?.setZ(lyph?.scale?.z * ratio);
    lyph.modified = true;
  }
  
  // change color if it matches host color
  if ( host?.material?.color?.equals(lyph?.material?.color) ){
    lyph.material.color.r = lyph?.material?.color.r/2;
    lyph.material.color.g = lyph?.material?.color.g/2;
    lyph.material.color.b = lyph?.material?.color.b/2;
  }
}

function layoutChains(scene, hostChainDic, links)
{
  let all = [];
  let kapsuleChildren = scene.children ;
  trasverseSceneChildren(kapsuleChildren, all);
  let lyphs = getSceneObjectByModelClass(all, 'Lyph');

  Object.keys(hostChainDic).forEach((hostKey) => {    
      //Position lyph at one of the end points of the chain
      const startLyph = hostChainDic[hostKey]["lyphs"][0]?.viewObjects["main"];
      let linkStartPosition = startLyph ? getWorldPosition(startLyph) : null;
      
      //Position lyph at one of the end points of the chain
      const endLyph = hostChainDic[hostKey]["lyphs"][1]?.viewObjects["main"];
      let linkEndPosition = endLyph ? getWorldPosition(endLyph) : null;

      if ( endLyph?.geometry && startLyph?.geometry ){
        const chainLyphs = hostChainDic[hostKey]["lyphs"];
        let lastPoint = linkEndPosition;
        chainLyphs?.forEach( (lyph, index) => { 
            let lyphObject = lyph.viewObjects["main"];
            
            // Reposition links
            if (lyphObject  ) {
              let link = links.find( link => link.userData.id === lyphObject.userData.conveys.id);
              let curvature = link?.curvature ? link.curvature : 10;
              let points = [lastPoint, getDefaultControlPoint(lastPoint, getWorldPosition(lyphObject), curvature),getWorldPosition(lyphObject)];
              const curve = new THREE.SplineCurve( points);
              points = curve.getPoints( MAX_POINTS );
              const geometry = new THREE.BufferGeometry().setFromPoints( points );
              
              const material = new THREE.LineBasicMaterial( { color : 0x36454F, linewidth: 1 } );
              
              // Create the final object to add to the scene
              const line = new THREE.Line( geometry, material );
              if ( link ) {
                line?.geometry?.computeBoundingBox();
                line.userData = link.userData;
                line.position.z = 4;
                scene.remove(link);
                line.modifiedChain = true;
                scene.add(line);
              }
              lastPoint = getWorldPosition(lyphObject);
            }
        });
      }
  });
}

export function removeDisconnectedObjects(model, joinModel) {

  const wiredTo = (joinModel.chains||[]).map((c) => c.wiredTo);
  const hostedBy = (joinModel.chains||[]).map((c) => c.hostedBy);

  const connected = wiredTo
                  .concat((model.anchors||[])
                  .map((c) => c.hostedBy))
                  .concat(hostedBy)
                  .filter((c) => c !== undefined);

  // All cardinal nodes
  const anchorsUsed = [];
  (model.anchors||[]).forEach( anchor => {
      anchor.cardinalNode ? anchorsUsed.push(anchor.id) : null
  });
  
  //Wires of F and D, the outer layers of the TOO map
  //NK: FIXME We cannot rely on model fixed IDs in code
  const outerWireComponent = (model.components||[]).find( c => c.id === "wires-f");
  if (outerWireComponent){
    outerWireComponent.wires.concat((model.components || []).find(wire => wire.id === "wires-d")).wires;
    outerWireComponent.wires = outerWireComponent.wires.filter(wireId => {
      const foundWire = model.wires.find(w => w.id === wireId);
      return anchorsUsed.indexOf(foundWire?.source) > -1 && anchorsUsed.indexOf(foundWire?.target) > -1
    });
  }

  const connectedWires = wiredTo.concat(hostedBy);
  // Other anchors used by the connectivity model lyphs and chains
  connectedWires.forEach( wireId => {
     if ( wireId !== undefined ){
      const wire = (model.wires||[]).find( wire => wireId === wire.id );
      if ( wire ) {
        if ( anchorsUsed.indexOf(wire.source) === -1 ){
            anchorsUsed.push(wire.source);
        }
        if ( anchorsUsed.indexOf(wire.target) === -1 ){
            anchorsUsed.push(wire.target);
        }
      }
    }
  });

  return Object.assign(model,
      { 
          regions: (model.regions||[]).filter((r) => connected.indexOf(r.id) > -1 ),
          wires  : (model.wires||[]).filter((r) => connected.indexOf(r.id) > -1 || (outerWireComponent && (outerWireComponent.wires||[]).indexOf(r.id) > -1)),
          anchors: (model.anchors||[]).filter((r) => (anchorsUsed.indexOf(r.id) > -1 ))
      }
  );
}

function autoLayoutChains(scene, graphData, links){
  let chainedLyphs = {};
  if( graphData.chains ) {
    parent.geometry?.computeBoundingBox();
    graphData.chains.forEach( chain => { 
      if ( chain.wiredTo === undefined && chain.hostedBy === undefined ){
        chainedLyphs[chain.id] = {lyphs : {}};
        chainedLyphs[chain.id]["lyphs"] = chain.levels?.map( link => link.conveyingLyph );
        chainedLyphs[chain.id]["chain"] = chain;
        if ( chainedLyphs[chain.id]["lyphs"]?.length > 1 ) {
          layoutChains(scene, chainedLyphs, links);
        }
        chainedLyphs = {};
      }
    });
  }
}

export function autoLayout(scene, graphData) {

  let lyphs = {};
  scene.children.forEach( child => {
    if ( lyphs[child.userData?.id] ){
      //removeEntity(scene, lyphs[child.userData?.id]);
    } else {
      lyphs[child.userData?.id] = child;
    }
  });

  preventZFighting(scene);
  //clearByObjectType(scene, "Node");
  let hostLyphRegionDic = {}, lyphDic = {};
  trasverseHostedBy(graphData, hostLyphRegionDic);
  layoutLyphs(scene, hostLyphRegionDic, lyphDic, false);
  trasverseHostedBy(graphData, hostLyphRegionDic);
  layoutLyphs(scene, hostLyphRegionDic,lyphDic, false);
  
  let hostLyphLyphDic = {};
  if(graphData.lyphs)
  {
    trasverseInternalLyphs(graphData.lyphs, hostLyphLyphDic);
    layoutLyphs(scene, hostLyphLyphDic,lyphDic, true);
  }

  autoSizeLyphs(scene, hostLyphLyphDic);
  lyphDic = {};
  let links = getSceneObjectByModelClass(scene.children, "Link");
  graphData?.chains?.forEach( chain => { 
      chain.levels?.map( link => { 
          let host = link?.conveyingLyph?.conveys?.fasciculatesIn?.viewObjects["main"];
          if ( host === undefined ) {
            host = link?.conveyingLyph?.conveys?.endsIn?.viewObjects["main"];
          }
          host = host ? traverseMeshParent(host) : host;
          link?.conveyingLyph && lyphDic[host?.userData?.id] ? lyphDic[host?.userData?.id].lyphs.push(link?.conveyingLyph?.viewObjects["main"]) : lyphDic[host?.userData?.id] = { host : host, lyphs : [link?.conveyingLyph?.viewObjects["main"]] };
      });
  });

  Object.keys(lyphDic).forEach( dic => {
    let host = lyphDic[dic]["host"];
    if ( host?.type == "Mesh" ){
      let lyphs = lyphDic[dic]["lyphs"];
      let size = host?.geometry ? getMeshBoundingBoxSize(host) : null;
      const targetSize = host?.geometry ? new THREE.Box3().setFromObject(host)?.getSize() : null;
      const width = targetSize?.x;
      const height = targetSize?.y;
      const middle = host ? getWorldPosition(host) : null;
      middle ? middle.x = middle.x - (width/2) : null;
      middle ? middle.z = middle.z + 1 : null;
      lyphs?.forEach( lyph => {
        if ( lyph?.userData?.supertype?.id?.includes(DENDRYTE) && middle){
          middle.x = middle.x + ((width/lyphs.length)/2);
          (host && lyph) && layoutChainLyph(host, lyph, middle, DENDRYTE_SIZE);
        } else if ( lyph?.userData?.supertype?.id?.includes(AXON) && middle){
          middle.x = middle.x + ((width/lyphs.length)/2);
          (host && lyph) && layoutChainLyph(host, lyph, middle, AXON_SIZE);
        }
        middle ? middle.x = middle.x + ((width/lyphs.length)/2) : null;
        middle ? middle.y = middle.y - ( targetSize?.y/6) : null;
      });
    }
  });
}

export function pointAlongLine(pointA, pointB, percentage) {
  let dir = pointB.clone().sub(pointA);
  let len = dir.length();
  dir = dir.normalize().multiplyScalar(len * percentage);
  return pointA.clone().add(dir);
}

export const DIMENSIONS =  {
  SHAPE_MIN_Z : 15,
  EDGE_MIN_Z : 20,
  WIRE_MIN_Z : 10
}