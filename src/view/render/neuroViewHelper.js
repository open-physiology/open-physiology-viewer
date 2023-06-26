import { dia, shapes } from 'jointjs';
import { getWorldPosition } from "./autoLayout/objects";

function fixOverlappingSegments(link1, link2, threshold) {
  const segments1 = getSegments(link1);
  const segments2 = getSegments(link2);
  for (let i = 0; i < segments1.length; i ++) {
    for (let j = 0; j < segments2.length; j ++) {
      const segment1 = segments1[i];
      const segment2 = segments2[j];
      const overlapX =
        segment1[0].x >= segment2[0].x &&
        segment1[0].x <= segment2[1].x &&
        (Math.abs(segment1[0].y - segment2[0].y) <= threshold ||
          Math.abs(segment1[0].y - segment2[1].y) <= threshold);
      const overlapY =
        segment1[0].y >= segment2[0].y &&
        segment1[0].y <= segment2[1].y &&
        (Math.abs(segment1[0].x - segment2[0].x) <= threshold ||
          Math.abs(segment1[0].x - segment2[1].x) <= threshold);
      if (overlapX)
      {
        segment1[0].y += threshold ;
        segment1[1].y += threshold ;
        if (i > 0)
        {
          const prevSegment = segments1[i-1]
          prevSegment[0].y += threshold ;
          prevSegment[1].y += threshold ;
        }
        if ( i < segments1.length -1 ) 
        {
          const nextSegment = segments1[i+1];
          nextSegment[0].y += threshold ;
          nextSegment[1].y += threshold ;
        }
      }
      if (overlapY)
      {
        segment1[0].x += threshold ;
        segment1[1].x += threshold ;
        if (i > 0)
        {
          const prevSegment = segments1[i-1];
          prevSegment[0].x += threshold ;
          prevSegment[1].x += threshold ;
        }
        if ( i < segments1.length -1 )
        {
          const nextSegment = segments1[i+1] ;
          nextSegment[0].x += threshold ;
          nextSegment[1].x += threshold ;
        }
      }
    }
  }
  return { segments1, segments2 }
}
// Helper function to get segments from link points
function getSegments(points) {
  const segments = [];
  for (let i = 0; i < points.length - 1; i++) {
    const segment = [points[i], points[i + 1]];
    segments.push(segment);
  }
  return segments;
}
function spreadSegmentsToPoints(segments) {
  const points = [];
  for (const segment of segments) {
    points.push(segment[0]); // Add the start point of the segment
    if (segment.length > 1) {
      points.push(segment[1]); // Add the end point of the segment
    }
  }
  return points;
}
// Function to find pairs of overlapping links within the given set
function fixOverlappingLinks(links) {
  // Get the link IDs
  const linkIds = Object.keys(links);
  // Iterate over each link ID to check for overlaps
  for (let i = 0; i < linkIds.length; i++) {
    const link1 = links[linkIds[i]][0];
    for (let j = i + 1; j < linkIds.length; j++) {
      const link2 = links[linkIds[j]][0];
      const { segments1, segments2 } = fixOverlappingSegments(link1, link2, 2);
      //fix the first one only by now, leave the other one in place
      links[linkIds[i]][0] = spreadSegmentsToPoints(segments1);
    }
  }
}

function pointsToSVGPath(points, deltaX) {
  if (!points || points.length === 0) {
    return '';
  }

  const pathCommands = [];

  // Move to the first point
  const firstPoint = points[0];
  pathCommands.push(`M ${firstPoint.x + deltaX} ${firstPoint.y}`);

  // Create line commands for the rest of the points
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    pathCommands.push(`L ${point.x+deltaX} ${point.y}`);
  }

  // Join the commands into a single string
  const pathData = pathCommands.join(' ');

  return pathData;
}

export function orthogonalLayout(links, nodes, left, top, canvasWidth, canvasHeight, debug = false)
{
  var namespace = shapes;           

  var graph = new dia.Graph({}, { cellNamespace: namespace });

  const linkVertices = {};
  const obstacles = [];
  const connections = []; 
  const linkNodes = [];

  const elementToRemove = document.getElementById("orthogonalDiv");
  if (elementToRemove) {
    elementToRemove.remove();
  }

  const el = document.createElement('div');
  el.id = "orthogonalDiv";

  const linkNodeSide = 5 ;

  var paper = new dia.Paper({
    el: el,
    model: graph,
    width: canvasWidth,
    height: canvasHeight, // height had to be increased
    gridSize: 10,
    drawGrid: true,
    defaultRouter: { name: 'manhattan' }, // use the manhattan router
    background: {
        color: 'rgba(0, 255, 0, 0.3)'
    },
    cellViewNamespace: namespace
});

  var style = document.createElement('style');
  style.type = 'text/css';

  // Define the CSS rules to customize the grid lines
  var css = 'path.joint-grid-line { stroke: blue; stroke-dasharray: 5, 5; }';

  // Add the CSS rules to the style element
  if (style.styleSheet) {
    // For IE8 and earlier versions
    style.styleSheet.cssText = css;
  } else {
    // For modern browsers
    style.appendChild(document.createTextNode(css));
  }

  // Add the style element to the paper element
  paper.$el.append(style);
  //obstacles, anything not a lyph and orphaned

  nodes.forEach( node => {
    const lyphMesh = node.state.graphScene.children.find( c => c.userData?.id == node.id)
    let scale = lyphMesh?.scale 
    scale === undefined ? scale = new THREE.Vector3(1,1,1) : null;
    const width = node.width * scale.x ;
    const height = node.height * scale.y
    const nodeModel = new shapes.standard.Rectangle({
      id: node.id,
      position: { 
        x: node.x - 0.5 * height + canvasWidth
      , y: node.y - 0.5 * width
      },
      size: { 
          width: height
        , height: width
      }
    });
    obstacles.push(nodeModel);
  });

  links.forEach( link => {
      let start = getWorldPosition(link.source.viewObjects["main"])
      let end   = getWorldPosition(link.target.viewObjects["main"])

      function fixPos(p) { return p } //> 0 ? p : p *-1 }

      const sx = fixPos(start.x) + canvasWidth;
      const sy = fixPos(start.y) ;
      const tx = fixPos(end.x) + canvasWidth;
      const ty = fixPos(end.y); 

      const sourceNode = new shapes.standard.Rectangle({
        id: link.id + '-source',
        position: { 
            x: sx
          , y: sy
        },
        size: { 
          width: linkNodeSide
          , height: linkNodeSide
        }
      });

      const targetNode = new shapes.standard.Rectangle({
        id: link.id + '-target',
        position: { 
            x: tx
          , y: ty
        },
        size: { 
            width: linkNodeSide
          , height: linkNodeSide
        }
      });
      linkNodes.push(sourceNode);
      linkNodes.push(targetNode);
      const connection = new shapes.standard.Link({
        id: link.id,
        source: { id: sourceNode.id },
        target: { id: targetNode.id }
      });
      connections.push(connection);
  })

  graph.addCells(obstacles).addCells(linkNodes).addCells(connections);

  // Wait for the routing update to complete
  const json = graph.toJSON();
  console.log(json);
  json.cells.forEach(cell => {
    if (cell.type == 'standard.Link') {
      const linkModel = graph.getCell(cell.id);
      const newLinkView = paper.findViewByModel(linkModel);
      if (newLinkView) {
        const connection = newLinkView.getConnection();
        let vertices = [];
        connection.segments.forEach( s=> {
          vertices.push([ s.end.x -canvasWidth, s.end.y ]);
        })
        linkVertices[cell.id] = [vertices] ;
      }
    }
  });

  //fixOverlappingLinks(linkVertices); //in place on dictionary

  return linkVertices ;
}
