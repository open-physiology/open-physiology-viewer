import { dia, shapes } from 'jointjs';
import { getWorldPosition } from "./autoLayout/objects";
import _ from 'lodash';

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

function adjustVertices(graph, cell) {

  // if `cell` is a view, find its model
  cell = cell.model || cell;

  if (cell instanceof dia.Element) {
      // `cell` is an element

      _.chain(graph.getConnectedLinks(cell))
          .groupBy(function(link) {

              // the key of the group is the model id of the link's source or target
              // cell id is omitted
              return _.omit([link.source().id, link.target().id], cell.id)[0];
          })
          .each(function(group, key) {

              // if the member of the group has both source and target model
              // then adjust vertices
              if (key !== 'undefined') adjustVertices(graph, _.first(group));
          })
          .value();

      return;
  }

  // `cell` is a link
  // get its source and target model IDs
  var sourceId = cell.get('source').id || cell.previous('source').id;
  var targetId = cell.get('target').id || cell.previous('target').id;

  // if one of the ends is not a model
  // (if the link is pinned to paper at a point)
  // the link is interpreted as having no siblings
  if (!sourceId || !targetId) return;

  // identify link siblings
  var siblings = _.filter(graph.getLinks(), function(sibling) {

      var siblingSourceId = sibling.source().id;
      var siblingTargetId = sibling.target().id;

      // if source and target are the same
      // or if source and target are reversed
      return ((siblingSourceId === sourceId) && (siblingTargetId === targetId))
          || ((siblingSourceId === targetId) && (siblingTargetId === sourceId));
  });

  var numSiblings = siblings.length;
  switch (numSiblings) {

      case 0: {
          // the link has no siblings
          break;

      } case 1: {
          // there is only one link
          // no vertices needed
          cell.unset('vertices');
          break;

      } default: {
          // there are multiple siblings
          // we need to create vertices

          // find the middle point of the link
          var sourceCenter = graph.getCell(sourceId).getBBox().center();
          var targetCenter = graph.getCell(targetId).getBBox().center();
          var midPoint = g.Line(sourceCenter, targetCenter).midpoint();

          // find the angle of the link
          var theta = sourceCenter.theta(targetCenter);

          // constant
          // the maximum distance between two sibling links
          var GAP = 20;

          _.each(siblings, function(sibling, index) {

              // we want offset values to be calculated as 0, 20, 20, 40, 40, 60, 60 ...
              var offset = GAP * Math.ceil(index / 2);

              // place the vertices at points which are `offset` pixels perpendicularly away
              // from the first link
              //
              // as index goes up, alternate left and right
              //
              //  ^  odd indices
              //  |
              //  |---->  index 0 sibling - centerline (between source and target centers)
              //  |
              //  v  even indices
              var sign = ((index % 2) ? 1 : -1);

              // to assure symmetry, if there is an even number of siblings
              // shift all vertices leftward perpendicularly away from the centerline
              if ((numSiblings % 2) === 0) {
                  offset -= ((GAP / 2) * sign);
              }

              // make reverse links count the same as non-reverse
              var reverse = ((theta < 180) ? 1 : -1);

              // we found the vertex
              var angle = g.toRad(theta + (sign * reverse * 90));
              var vertex = g.Point.fromPolar(offset, angle, midPoint);

              // replace vertices array with `vertex`
              sibling.vertices([vertex]);
          });
      }
  }
}

function adjustLinks(graph, cell) {

  // if `cell` is a view, find its model
  cell = cell.model || cell;

  if (cell instanceof dia.Element) {
      // `cell` is an element

      _.chain(graph.getConnectedLinks(cell))
          .groupBy(function(link) {

              // the key of the group is the model id of the link's source or target
              // cell id is omitted
              return _.omit([link.source().id, link.target().id], cell.id)[0];
          })
          .each(function(group, key) {

              // if the member of the group has both source and target model
              // then adjust links
              if (key !== 'undefined') adjustLinks(graph, _.first(group));
          })
          .value();

      return;
  }

  // `cell` is a link
  // get its source and target model IDs
  var sourceId = cell.get('source').id || cell.previous('source').id;
  var targetId = cell.get('target').id || cell.previous('target').id;

  // if one of the ends is not a model
  // (if the link is pinned to paper at a point)
  // the link is interpreted as having no siblings
  if (!sourceId || !targetId) return;

  // identify link siblings
  var siblings = _.filter(graph.getLinks(), function(sibling) {

      var siblingSourceId = sibling.source().id;
      var siblingTargetId = sibling.target().id;

      // if source and target are the same
      // or if source and target are reversed
      return ((siblingSourceId === sourceId) && (siblingTargetId === targetId))
          || ((siblingSourceId === targetId) && (siblingTargetId === sourceId));
  });

  var numSiblings = siblings.length;
  switch (numSiblings) {

      case 0: {
          // the link has no siblings
          break;

      } case 1: {
          // there is only one link
          // no need to adjust position
          break;

      } default: {
          // there are multiple siblings
          // adjust link positions

          // find the middle point of the link
          var sourceCenter = graph.getCell(sourceId).getBBox().center();
          var targetCenter = graph.getCell(targetId).getBBox().center();
          var midPoint = g.Line(sourceCenter, targetCenter).midpoint();

          // find the angle of the link
          var theta = sourceCenter.theta(targetCenter);

          // constant
          // the minimum distance between two sibling links
          var GAP = 20;

          // calculate the total width occupied by siblings
          var totalWidth = (numSiblings - 1) * GAP;

          // calculate the starting position for the first link
          var startX = midPoint.x - totalWidth / 2;

          _.each(siblings, function(sibling, index) {

              // calculate the position of the link
              var linkX = startX + index * GAP;

              // update the link's source and target points
              sibling.source({ x: linkX, y: midPoint.y });
              sibling.target({ x: linkX, y: midPoint.y });
          });
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

  const linkNodeSide = 5 ;

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

  nodes.forEach( node => {
    const lyphMesh = node.state.graphScene.children.find( c => c.userData?.id == node.id)
    const scale = lyphMesh.scale 
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

    if (link.points?.length > 0)
    {
      const sx = link.points[0].x ; //+ canvasWidth;
      const sy = link.points[0].y ;
      const tx = link.points[link.points.length-1].x ; //+ canvasWidth ;
      const ty = link.points[link.points.length-1].y ;

      const sourceNode = new shapes.standard.Rectangle({
        id: link.id + '-source',
        position: { 
            x: sx - linkNodeSide * 0.5
          , y: sy - linkNodeSide * 0.5
        },
        size: { 
          width: linkNodeSide
          , height: linkNodeSide
        }
      });

      const targetNode = new shapes.standard.Rectangle({
        id: link.id + '-target',
        position: { 
            x: tx - linkNodeSide * 0.5
          , y: ty - linkNodeSide * 0.5
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

  // bind `graph` to the `adjustVertices` function
  var adjustGraphVertices = _.partial(adjustVertices, graph);
  var adjustGraphLinks    = _.partial(adjustLinks, graph);

  // adjust vertices when a cell is removed or its source/target was changed
  graph.on('render:done', adjustGraphVertices);
  graph.on('render:done', adjustGraphLinks);
    
  if (debug)
  {
    const svg = exportToSVG(json.cells, graph, paper, canvasWidth, canvasHeight);
    console.log(svg);  
  }
  return linkVertices ;
}

