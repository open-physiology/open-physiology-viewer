import { dia, shapes, g } from 'jointjs';
import { getWorldPosition } from "./autoLayout/objects";
import _ from 'lodash';

const MOVE_SEGMENT_THRESHOLD = 10 ;

function extractVerticesFromPath(path)
{
  const vertices = [];
  path.forEach(function(path) {
    const d = path.toString.attr('d');
    const matches = d.match(/L\s*([\d.-]+)\s*,\s*([\d.-]+)/ig);

    if (matches) {
      matches.forEach(function(match) {
        const values = match.replace(/L\s*/i, '').split(/,\s*/);
        const vertex = { x: parseFloat(values[0]), y: parseFloat(values[1]) };
        vertices.push(vertex);
      });
    }
  });
  return vertices ;
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

function exportToSVG(graphJSONCells, jointGraph, paper, paperWidth, paperHeight) {
  // Create an SVG element for the exported content
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', paperWidth);
  svg.setAttribute('height', paperHeight);
  const deltaX = paperWidth ;

  // Iterate through all the elements in the JointJS graph
  graphJSONCells.forEach((cellData) => {
    const cell = jointGraph.getCell(cellData.id);

    if (cellData.type === 'standard.Rectangle') {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', cellData.position.x + deltaX);
      rect.setAttribute('y', cellData.position.y);
      rect.setAttribute('width', cellData.size.width);
      rect.setAttribute('height', cellData.size.height);
      rect.setAttribute('fill', "blue");
      rect.setAttribute('stroke', "blue");
      rect.setAttribute('stroke-width', 1);

      svg.appendChild(rect);
    } else if (cellData.type === 'standard.Link') {
      const link = paper.findViewByModel(cell);
      const points = link.path.toPoints();
      const pathData = pointsToSVGPath(points[0], deltaX);

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'red');
      path.setAttribute('stroke-width', 1);

      svg.appendChild(path);
    }
  });

  // Serialize the SVG content to a string
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);

  // Return the serialized SVG string
  return svgString;
}

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

export function orthogonalLayout(links, nodes, left, top, canvasWidth, canvasHeight, debug = false)
{
  const graph = new dia.Graph();
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
  el.style.width = canvasWidth * 2 + 'px';
  el.style.height = canvasHeight *  2 + 'px';

  const linkNodeSide = 25 ;

  if (debug)
  {
    el.style.cssText = 'position:absolute;opacity:0.3;z-index:100;background:#000;';
    document.body.appendChild(el);
  }

  const paper = new dia.Paper({
    el: el,
    width: canvasWidth,
    height: canvasHeight,
    gridSize: 1,
    drawGrid: true,
    defaultRouter: { name: 'manhattan' }, // use the manhattan router
    model: graph,
    interactive: true
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

  links.forEach( link => {

    if (link.points?.length > 0)
    {
      const sx = link.points[0].x ; //+ canvasWidth;
      const sy = link.points[0].y ;
      const tx = link.points[link.points.length-1].x ; //+ canvasWidth ;
      const ty = link.points[link.points.length-1].y ;

      const sourceNode = new shapes.standard.Rectangle({
        id: link.id + '-source',
        position: { 
            x: sx //- linkNodeSide * 0.5
          , y: sy //- linkNodeSide * 0.5
        },
        size: { 
          width: linkNodeSide
          , height: linkNodeSide
        }
      });

      const targetNode = new shapes.standard.Rectangle({
        id: link.id + '-target',
        position: { 
            x: tx //- linkNodeSide * 0.5
          , y: ty //- linkNodeSide * 0.5
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
    }
  })

  graph.addCells(obstacles).addCells(linkNodes).addCells(connections);

  graph.on('change:position', function(cell) {

    // has an obstacle been moved? Then reroute the link.
    if (obstacles.indexOf(cell) > -1) {
        //link.findView(paper).requestConnectionUpdate();
        const json = graph.toJSON();
        json.cells.forEach(cell => {
          if (cell.type == 'standard.Link') {
            const linkModel = graph.getCell(cell.id);
            const newLinkView = paper.findViewByModel(linkModel);
            
            if (newLinkView) {
              newLinkView.requestConnectionUpdate();
            }
          }
        });
    }
});


  // Wait for the routing update to complete
  const json = graph.toJSON();
  json.cells.forEach(cell => {
    if (cell.type == 'standard.Link') {
      const linkModel = graph.getCell(cell.id);
      const newLinkView = paper.findViewByModel(linkModel);
      if (newLinkView) {
        newLinkView.requestConnectionUpdate();
        const vertices = newLinkView.path.toPoints();
        linkVertices[cell.id] = vertices ;
      }
    }
  });

  fixOverlappingLinks(linkVertices); //in place on dictionary
    
  if (debug)
  {
    const svg = exportToSVG(json.cells, graph, paper, canvasWidth, canvasHeight);
    console.log(svg);  
  }
  return linkVertices ;
}

