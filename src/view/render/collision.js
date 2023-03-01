function checkCollide(a, b) {
  const collideX = ( ( b.position.x > a.position.x - a.width / 2 ) && (b.position.x < a.position.x + a.width / 2) ) ;
  const collideY = ( ( b.position.y > a.position.y - a.height / 2 ) && (b.position.y < a.position.y + a.height / 2) ) ;
  return collideX && collideY ;
}

function getSpaceBox(meshes)  {
  return calculateSpace(meshes);
}
function getSpacePartitions(spaceBox, n)
{
  const spaceBoxSize = spaceBox.getSize();
  const widthSize = Math.floor(spaceBoxSize.x / n) ;
  const heightSize = Math.floor(spaceBoxSize.y / n);
  const startX = spaceBox.min.x ;
  const startY = spaceBox.min.y ;
  let partitions = [];

  for (var i = 0; i < n; i++)
  {
    for (var j = 0; j < n; j++)
    { 
      const minX = startX + widthSize* i ;
      const maxX = startX + widthSize*(i+1);
      const minY = startY + heightSize* j;
      const maxY = startY + heightSize*(j+1);

      partitions.push(new THREE.Box3(new THREE.Vector3(minX,minY,1)
                                   , new THREE.Vector3(maxX,maxY,1)))
    }
  }

  return partitions ;
}

function checkClose(first, second)
{
  return first.position.distanceTo(second.position) < LABEL_CLOSE_ENOUGH_DISTANCE ;
}

function createLineBetweenVectors(start, end)
{
  start.z = 0 ; //force matching plane
  const points = [];
  points.push( start );
  points.push( end );

  const geometry = new THREE.BufferGeometry().setFromPoints( points );
  var lineMesh=new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({color:0x0000ff})//basic blue color as material
  );
  lineMesh['userData']['linePosData'] = true ;
  scene.add(lineMesh);
}

function removeLinePosData()
{
  const linePosData = scene.children.filter((m)=>m['userData']['linePosData'] );
  linePosData.forEach((m)=> scene.remove(m));
}

function arrangeObjectsWithinPartition(partition, meshes, incZ)
{
  const inPartitionMeshes = getMeshesWithinPartition(partition, meshes);
  const alreadyProcessed = [];

  //arrange within partition
  if (inPartitionMeshes.length > 0)
  {
    //const radius = inPartitionMeshes.length * LABEL_SPACE_ARM_LENGTH ;//arm length is a fixed value taken as delta radius from the center of the partition
                                                                        //the larger ammount of meshes within the partition, the larger the arm
                                                                        //so it results in a "explode from center" kind of effect

                                                                        //for circle, need to implement this, no time
                                                                        //https://planetcalc.com/8943/
                                                                        //giving the upper/down positions for each index

    const total = inPartitionMeshes.length ;

    for ( var i = 0 ; i < total ; i++ )
    {
      for ( var j = i ; j < total ; j++ )
      {
        if (i!=j) // overlap with itself
        {
          const first = inPartitionMeshes[i];
          const second = inPartitionMeshes[j];
          if ( checkClose(first, second) )
          //if (checkCollide(first, second))
          {
            //move away in Y axis
            if ( ( alreadyProcessed.indexOf(first.id) == -1 ) && ( alreadyProcessed.indexOf(second.id) == -1 ) )
            {
              const firstPos    = first.position.clone() ;
              const secondPos   = second.position.clone() ;

              //shaking
              first.position.y  -= first.height ; 
              second.position.y += second.height ;
              first.position.x  -= first.width ;
              second.position.x += second.width ;
              second.position.z = incZ ;

              first.userData.initialPos = firstPos ;
              second.userData.initialPos = secondPos ;

              alreadyProcessed.push(first.id);
              alreadyProcessed.push(second.id);
            }
          }
        }
      } 
    }
  }
}
function getMeshesWithinPartition(partition, meshes)
{
  return meshes.filter((m)=> m.position.x > partition.min.x &&  m.position.x < partition.max.x && m.position.y > partition.min.y &&  m.position.y < partition.max.y)
}
function createLinksToOrigin(labels)
{
  labels.forEach((l)=>{
    if( l.userData.initialPos && l.userData.viewPosition && l.visible && l.text.length > 0 )
      createLineBetweenVectors(l.userData.viewPosition, l.position);
  })
}
//space partitioning ordering algorithm
export function layoutLabelCollide(scene, showLabelWires) {
  const labels = getSceneObjectByModelClass(scene.children, "Label");
  if (labels.length > 0)
  {
    const spaceBox = getSpaceBox(labels);
    if (DEBUG)
    {
      const debugBox = debugMeshFromBox(spaceBox);
      //scene.add(debugBox);
    }
    const spacePartitionBoxes = getSpacePartitions(spaceBox, LABEL_SPACE_PARTITION_NUM);
    for (var i = 0; i < spacePartitionBoxes.length ; i ++)
    {      
      arrangeLabelsWithinPartition(spacePartitionBoxes[i], labels, LABEL_ELEVATION, showLabelWires);
      //arrangeLabelsWithinPartition(spacePartitionBoxes[i], labels, LABEL_ELEVATION, showLabelWires);
      // arrangeLabelsWithinPartition(spacePartitionBoxes[i], labels, 250);
      if (DEBUG)
      {
        let innerDebugBox = debugMeshFromBox(spacePartitionBoxes[i]);
        scene.add(innerDebugBox);
      }
    }
    removeLinePosData();
    if (showLabelWires)
      createLinksToOrigin(labels);
  }
}