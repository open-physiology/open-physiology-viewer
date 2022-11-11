import { getCenterPoint, setMeshPos, computeGroupCenter } from "./objects";

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
    target.rotation.z = rz;
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