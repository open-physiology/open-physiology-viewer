import { getCenterPoint, setMeshPos, computeGroupCenter, getBoundingBoxSize } from "./objects";
import {  MIN_LYPH_WIDTH, DIMENSIONS } from "./../autoLayout";
import {
  copyCoords,
} from "./../../utils";

export function translateGroupToOrigin(group) {
  const groupPos  = computeGroupCenter(group);
  group.translateX(- groupPos.x) ; //- ( objSize.x * 0.5 * 0 );
  group.translateY(- groupPos.y) ; //- ( objSize.y * 0.5 * 0);
}

export function rotateAroundCenter(target, rx, ry, rz) {
  if (target.geometry)
  {
    target.geometry.center();
    target.rotation._x = rx;
    target.rotation._y = ry;
    target.rotation._z = rz;
    target.quaternion._x = rx;
    target.quaternion._y = ry;
    target.quaternion._z = rz;
  }
}

export function translateMeshToTarget(target, mesh)
{
  const targetPos = getCenterPoint(target);
  setMeshPos(mesh, targetPos.x, targetPos.y, targetPos.z + 1)
}

export function translateGroupToTarget(target, group) {
  //const targetPos = computeGroupCenter(target);
  const groupPos  = computeGroupCenter(group);
  const targetPos = getCenterPoint(target);
  group.translateX(targetPos.x - groupPos.x) ; //- ( objSize.x * 0.5 * 0 );
  group.translateY(targetPos.y - groupPos.y) ; //- ( objSize.y * 0.5 * 0);
  group.translateZ(3) ; 
}

export function setLyphPosition(lyph, host, position) {
  lyph.position.x = position.x ;
  lyph.position.y = position.y ;
  lyph.position.z = DIMENSIONS.SHAPE_MIN_Z;

  if ( host ) {
    rotateAroundCenter(lyph, host.rotation.x, host.rotation.y, host.rotation.z);
  }

  copyCoords(lyph?.userData, position);
}

export function setLyphScale(lyph) {
  const lyphDim = getBoundingBoxSize(lyph);
  const lyphMin = Math.min(lyphDim.x, lyphDim.y);

  if ( lyphMin < MIN_LYPH_WIDTH ){
      lyph.scale.setX(MIN_LYPH_WIDTH / lyphDim.x);
      lyph.scale.setY(MIN_LYPH_WIDTH / lyphDim.y);
      lyph.scale.setZ(DIMENSIONS.SHAPE_MIN_Z); 
  }
}