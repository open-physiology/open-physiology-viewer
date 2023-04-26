import orthogonalConnector2 from "./orthogonalConnector2";
import { dia, shapes } from 'jointjs';
import { combineLatestAll, generate } from "rxjs";
import {
  extractCoords
} from "./../utils";
import { getBoundingBoxSize, getWorldPosition } from "./autoLayout/objects";

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
  const deltaX = 500 ;

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
      rect.setAttribute('stroke-width', 3);

      svg.appendChild(rect);
    } else if (cellData.type === 'standard.Link') {
      const link = paper.findViewByModel(cell);
      const points = link.path.toPoints();
      const pathData = pointsToSVGPath(points[0], deltaX);

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'red');
      path.setAttribute('stroke-width', 2);

      svg.appendChild(path);
    }
  });

  // Serialize the SVG content to a string
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);

  // Return the serialized SVG string
  return svgString;
}

export function orthogonalLayout(links, nodes, left, top, width, height, debug = false)
{
  const graph = new dia.Graph();
  const linkVertices = {};
  debug = true 

  const el = document.createElement('div');
  el.style.width = width + 'px';
  el.style.height = height + 'px';

  const paper = new dia.Paper({
    el: el,
    width: width,
    height: height,
    gridSize: 10,
    model: graph,
    defaultConnector: { name: 'jumpover' },
    defaultConnectionPoint: { name: 'boundary', args: { extrapolate: true } },
    interactive: true
  });
  //obstacles, anything not a lyph and orphaned

  nodes.forEach( node => {
    const lyphMesh = node.state.graphScene.children.find( c => c.userData?.id == node.id)
    if ( lyphMesh ) {
      const scale = lyphMesh?.scale 
      const nodeModel = new shapes.standard.Rectangle({
        id: node.id,
        position: { x: node.x, y: node.y },
        size: { 
          width: node.width * scale.x + 2
          , height: node.height * scale.y + 2
        }
      });
      graph.addCell(nodeModel);
    }
  });

  links.forEach( link => {

    if (link.points?.length > 0)
    {
      let start = getWorldPosition(link.source.viewObjects["main"])
      let end   = getWorldPosition(link.target.viewObjects["main"])

      const sx = start.x ;
      const sy = start.y ;
      const tx = end.x ;
      const ty = end.y 
  
      const connection = new shapes.standard.Link({
        id: link.id,
        source: { x: sx, y: sy },
        target: { x: tx, y: ty },
        router: { name: 'manhattan'
        , connector : { name : 'jumpover'}
        , args: { obstacles: graph.getElements() } }
      });
      graph.addCell(connection);
    }
  })

  // Wait for the routing update to complete
  const json = graph.toJSON();
  json.cells.forEach(cell => {
    if (cell.type == 'standard.Link') {
      const linkModel = graph.getCell(cell.id);
      const newLinkView = paper.findViewByModel(linkModel);
      if (newLinkView) {
        const vertices = newLinkView.path.toPoints();
        linkVertices[cell.id] = vertices ;
      }
    }
  });

  if (debug)
  {
    const svg = exportToSVG(json.cells, graph, paper, width, height);
    console.log(svg);  
  }
  return linkVertices ;
}
