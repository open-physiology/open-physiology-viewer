import orthogonalConnector2 from "./orthogonalConnector2";
import { dia, shapes } from 'jointjs';
import { combineLatestAll } from "rxjs";

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

export function orthogonalLayout(links, nodes, left, top, width, height)
{
  const graph = new dia.Graph();
  const linkVertices = {};
  const obstacles = [];
  const cells = [];

  const el = document.createElement('div');
  el.style.width = width + 'px';
  el.style.height = height + 'px';

  const paper = new dia.Paper({
    el: el,
    width: width,
    height: height,
    gridSize: 100,
    async: false,
    model: graph
  });
  //obstacles, anything not a lyph and orphaned

  nodes.forEach( node => {
    const nodeModel = new shapes.standard.Rectangle({
      id: node.id,
      position: { x: node.x, y: node.y },
      size: { 
        width: node.scale.width
        , height: node.scale.height
      }
    });
  
    obstacles.push(nodeModel);
  });
  
  links.forEach( link => {

    if (link.points?.length > 0)
    {
      const sx = link.points[0].x ;
      const sy = link.points[0].y ;
      const tx = link.points[link.points.length-1].x ;
      const ty = link.points[link.points.length-1].y ;
  
      const source = new shapes.standard.Rectangle({
        position: { x: sx, y: sy },
        size: { width: 0.01, height: 0.01 },
      });
      cells.push(source);
      const target = new shapes.standard.Rectangle({
        position: { x: tx, y: ty },
        size: { width: 0.01, height: 0.01 },
      });
      cells.push(target);
      const linkModel = new shapes.standard.Link({
        id: link.id,
        source: { id: source.id },
        target: { id: target.id },
        router: { name: 'manhattan' }
      });
      cells.push(linkModel);
    }
  })

  graph//.addCells(obstacles)
  .addCells(cells);

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

  return linkVertices ;
}

