import {flatten } from "lodash-bound";
import {modelClasses} from "../../model";
import { orthogonalLayout } from "./neuroViewHelper";
import { stddev, avg } from '../utils';
const {Edge} = modelClasses;

/**
 * Build dictionary keeping tracks of housing lyphs, hosted regions, wires.
 * @param {*} group - Group to toggle on or off
 * @returns 
 */
export function buildNeurulatedTriplets(group) {
  /**
   * Extract Neurons from Segment.
   * y : contains housing lyphs
   * w : contains those wires where lyphs are attached to
   * r : contains those regions that are hosting housing lyphs
   * links : contains the links between the housing links
   * x, chains, and nodes are not used for rendering
   */
  let neuronTriplets = { x: group.lyphs, y: [], w: [], r: [], links : [], chains : [], nodes : [] };

  let hostedLinks = group.links?.filter((l) => l.fasciculatesIn || l.endsIn || l.levelIn );
  console.log("Hosted links ", hostedLinks);
  neuronTriplets.links = group?.links;

  let housingLyphs = [];
  hostedLinks.forEach((l) => { 
    // Avoid duplicate housing lyphs
    if (!housingLyphs.includes(l.fasciculatesIn) &&  (l.fasciculatesIn ) ) {
      l.fasciculatesIn?.layerIn == undefined && housingLyphs.push(l.fasciculatesIn);
    }
    if (!housingLyphs.includes(l.endsIn) &&  (l.endsIn ) ) {
      l.endsIn?.layerIn == undefined && housingLyphs.push(l.endsIn);
    }

    if ( l.levelIn ) {
      l.levelIn?.forEach( ll =>  ll.housingLyphs?.forEach( lyph => (!housingLyphs.includes(lyph) && lyph?.layerIn == undefined && housingLyphs.push(lyph))));
    }
  });
  console.log("housingLyphs ", housingLyphs);

  let hostedHousingLyphs = housingLyphs?.map((l) => l?.hostedBy); //lyphs -> regions
  console.log("hostedHousingLyphs ", hostedHousingLyphs);
  hostedHousingLyphs.forEach( h => h != undefined && h?.class == "Region" && neuronTriplets.r.indexOf(h) == -1 ? neuronTriplets.r.push(h) : null)
  neuronTriplets.y = housingLyphs;
  let updatedLyphs = []
  neuronTriplets.y?.forEach( neuron => {
    const houseLyph = getHouseLyph(neuron);
    ( houseLyph?.class == "Lyph" && !updatedLyphs.includes(houseLyph) ) && updatedLyphs.push(houseLyph);
    const hosts = houseLyph?.axis?.levelIn?.filter( l => l.wiredTo);
    hosts?.forEach( h => ( h.wiredTo && neuronTriplets.w.indexOf(h.wiredTo) == -1) && neuronTriplets.w.push(h.wiredTo));
  })

  neuronTriplets.y = neuronTriplets.y.concat(updatedLyphs);
  neuronTriplets.y = neuronTriplets.y.filter((v,i,a)=>a.findIndex(v2=>(v.id === v2.id))===i);
  
  let housingLyphsInChains = housingLyphs?.filter((h) => h?.axis?.levelIn);
  console.log("housingLyphsInChains ", housingLyphsInChains);

  let housingChains = [
    ...new Set(housingLyphsInChains.map((h) => h?.axis?.levelIn)::flatten()),
  ]; // lyphs -> links -> chains, each link can be part of several chains, hence levelIn gives an array that we need to flatten
  console.log("housingChains ", housingChains);

  housingChains = [];
  group.links.filter( l => l.levelIn?.forEach( ll => !housingChains.find( c => c.id == ll.id ) && housingChains.push(ll) ));
  console.log("housingChains from Links ", housingChains);
  neuronTriplets.chains = housingChains;

  let links = [];
  housingChains.forEach( chain => chain.levels.forEach( level => !links.find( c => c.id == level.id ) && links.push(level)));
  console.log("housingChains Links ", links);

  let wiredHousingChains = housingChains
    .filter((c) => c.wiredTo)
    .map((c) => c.wiredTo); // chains -> wires
  console.log("wiredHousingChains ", wiredHousingChains);

  wiredHousingChains.forEach((wire) => neuronTriplets.w.indexOf(wire) == -1 && neuronTriplets.w.push(wire));

  let housingChainRoots = housingChains
    .filter((c) => c.root)
    .map((c) => c.root); // chains -> nodes
  console.log("housingChainRoots ", housingChainRoots);

  let housingChainLeaves = housingChains
    .filter((c) => c.leaf)
    .map((c) => c.leaf);
  console.log("housingChainLeaves ", housingChainLeaves);

  let anchoredHousingChainRoots = housingChainRoots.filter((n) => n.anchoredTo); //nodes -> anchors
  console.log("anchoredHousingChainRoots ", anchoredHousingChainRoots);
  anchoredHousingChainRoots.forEach((wire) => neuronTriplets.w.indexOf(wire) == -1 && neuronTriplets.w.push(wire));

  let anchoredHousingChainLeaves = housingChainLeaves.filter(
    (n) => n.anchoredTo
  );
  console.log("anchoredHousingChainLeaves ", anchoredHousingChainLeaves);
  anchoredHousingChainLeaves.forEach((wire) => neuronTriplets.w.indexOf(wire) == -1 && neuronTriplets.w.push(wire));

  let hostedHousingChains = housingChains
    .filter((c) => c.hostedBy)
    .map((c) => c.hostedBy) //chains -> regions
  console.log("hostedHousingChains ", hostedHousingChains);
  hostedHousingChains.forEach((region) => neuronTriplets.r.indexOf(region) == -1 && neuronTriplets.r.push(region));

  return neuronTriplets;
}

function traverseWires(component, checked){
  if (component)  { 
    component.inactive = !checked;
    component.hidden = !checked;
    let hostedWire = component.hostedBy;
    if ( hostedWire ){
      hostedWire.inactive = !checked;
      hostedWire.hidden = !checked;
      traverseWires(hostedWire.source, checked);
      traverseWires(hostedWire.target, checked);
    }
  }
}

export function handleNeurulatedGroup(checked, groupMatched, neurulatedMatches) {
  // Hides links and nodes we don't want to display
  groupMatched?.links?.forEach((link) => { 
    if ( neurulatedMatches?.links?.find( l => l.id === link.id ) ) {
      link.inactive = !checked;
    } else {
      link.inactive = checked;
    }
    // Hide nodes
    link.source ? link.source.inactive = checked : null;
    link.target ? link.target.inactive = checked : null;
  });

  checked ? groupMatched.show() : groupMatched.hide();

  groupMatched.lyphs.forEach((lyph) => {
    if ( neurulatedMatches?.y?.find( l => l.id === lyph.id ) ) {
      lyph.hidden = !checked;
      lyph.layers?.forEach( layer => {
        layer.hidden = !checked;
      });
      if (checked) { 
        lyph.inactive = !checked;
        lyph.layers?.forEach( layer => {
          layer.inactive = !checked;
        });
      }
    } else {
      lyph.hidden = checked;
      lyph.layers?.forEach( layer => {
        layer.hidden = checked;
      });
      if (checked) { 
        lyph.inactive = checked;
        lyph.layers?.forEach( layer => {
          layer.inactive = checked;
        });
      }
    }
  });
}

export function toggleWire(target, checked){
  target.inactive = !checked;
  target.hidden = !checked;
  if ( target.source && typeof target.source === 'object'){
    target.source.inactive = !checked;
    target.source.hidden = !checked;
  }

  if ( target.target && typeof target.target === 'object'){
    target.target.inactive = !checked;
    target.target.hidden = !checked;
  }
}

/**
 * Toggle connected wires between origin wire and scaffold ones.
 * @param {*} target  - Origin wire
 * @param {*} checked 
 * @param {*} hostedWires 
 */
function toggleHostedWire(target, checked){
  toggleWire(target, checked);
  let anchors = [target.source.id , target.target.id];
  target.source?.sourceOf?.forEach( s => { 
    let connectedWire = ((anchors.includes(s.target.id) || anchors.includes(s.source.id)) && s.source?.sourceOf?.find( w => w.geometry  === Edge.EDGE_GEOMETRY.ARC))
    if (target.geometry === Edge.EDGE_GEOMETRY.SPLINE  && connectedWire == undefined ) {
      toggleWire(s, checked);
    }  
  });

  target.source?.targetOf?.forEach( s => { 
    let connectedWire = ((anchors.includes(s.target.id) || anchors.includes(s.source.id)) && s.target?.sourceOf?.find( w => w.geometry  === Edge.EDGE_GEOMETRY.ARC))
    if (target.geometry === Edge.EDGE_GEOMETRY.SPLINE && connectedWire == undefined) {
      toggleWire(s, checked);
    } 
  });
}

/**
 * Toggle visibility OFF of regions not hosting housing lyphs. And ON for those hosting them.
 * @param {*} scaffoldsList 
 * @param {*} neuronTriplets 
 * @param {*} checked 
 */
function toggleRegions(scaffoldsList, neuronTriplets, checked){
  scaffoldsList.forEach( scaffold => {
    if (scaffold.id !== "too-map" && scaffold.regions !== undefined) {
      scaffold.regions?.forEach( region => {
        let match = neuronTriplets?.r?.find(
          (matchReg) => region.id === matchReg.id
        );
        if ( match === undefined ) {
          region.inactive = checked;
          region.hostedLyphs = [];
        } else {
          region.inactive = !checked;
          region.hostedLyphs = [];
          if ( match?.namespace != region.namespace ) {
            neuronTriplets.r = neuronTriplets?.r?.filter(
              (matchReg) => region.id !== matchReg.id
            );
            neuronTriplets?.r?.push(region);
          }
        }
      });
    }
  });
}

/**
 * For each e in the list of (x,y,e) triplets, identify the TOO map component from {F,D,N} to which e belongs.
 * If either F or D are involved with an e, switch on the visibility of the whole circular scaffold for F-or-D.
 * Switch on visibility of the wire or region in the LHS view.
 */
export function toggleScaffoldsNeuroview ( scaffoldsList, neuronTriplets, checked ) {
  // Filter out scaffolds that match the regions attached to the housing lyphs
  toggleRegions(scaffoldsList, neuronTriplets, checked);
  // Filter out scaffolds that match the wires attached to the housing lyphs
  let scaffolds = scaffoldsList.filter(
    (scaffold) => scaffold.id !== "too-map" &&
      (scaffold.wires?.find((w) => neuronTriplets?.w?.find((wire) => w.id === wire.id)) ||
      scaffold.regions?.find((r) => neuronTriplets?.r?.find((region) => r.id === region.id)) ||
      scaffold.anchors?.find((anchor) => neuronTriplets?.w?.find((wire) => anchor.id === wire?.source?.id || anchor.id === wire?.target?.id )))
  );

  let modifiedScaffolds = [];
  scaffolds?.forEach((scaffold) => {
    scaffold.hidden !== !checked && modifiedScaffolds.push(scaffold);
    scaffold.wires?.forEach( w => w.inactive = checked );
    scaffold.anchors?.forEach( w => w.inactive = checked );

    // Toggle regions that are not housing lyphs
    neuronTriplets.r.forEach((r) => {
      let region = scaffold.regions?.find((reg) => reg.id == r.id);
      region ? (region.inactive = !checked) : null;
    });

    // Find all wires on the scaffold that are Arcs and have a name. This will turn on the Rings for the F/D Scaffold
    // FIXME : Find a better way to filter helper wires, and only turn on ones that belong to the F/D ring
    let scaffoldMatchs = scaffold.wires?.filter( wire => wire.geometry == Edge.EDGE_GEOMETRY.ARC && wire.color != "#000" );
    scaffoldMatchs.filter( scaffoldMatch => {
      scaffoldMatch.inactive = !checked;
      scaffoldMatch.hidden = !checked;
      traverseWires(scaffoldMatch.source , checked)
      traverseWires(scaffoldMatch.target , checked)
    });

    // Toggle wires hosting housing lyphs. And wires going to the scaffold wires
    neuronTriplets.w.forEach((w) => {
      let scaffoldMatch = scaffold.wires?.find( wire => wire.id == w.id);
      if ( scaffoldMatch ) {
        toggleHostedWire(scaffoldMatch, checked);
      }
    });
  });

  return modifiedScaffolds;
}

/**
 * Loops through housing neurons and call auto placement function
 * @param {*} neuronTriplets 
 */
export function autoLayoutNeuron(triplets, group) {
  triplets?.y?.forEach((m) => {
    m.autoSize();
  });

  triplets?.x?.forEach((lyph) => {
    lyph.autoSize();
  });
}

export function autoLayoutSegments(orthogonalSegments, links)
{
  const link_ids = Object.keys(orthogonalSegments);
  link_ids.forEach( orthogonal_link_id => {
    const link_model = links.find( l => l.id == orthogonal_link_id );
    if (link_model) 
    {
      const links = orthogonalSegments[orthogonal_link_id];
      if (links.length > 0)
        link_model.regenerateFromSegments(links);
    }
  });
}

/**
 * 
 * @param {*} event 
 * @param {*} graphData 
 * @param {*} neuronTriplets 
 * @param {*} activeNeurulatedGroups 
 */
export function findHousingLyphsGroups (graphData, neuronTriplets, activeNeurulatedGroups) {
  let matches = [];
  // Find groups where housing lyph belongs
  neuronTriplets.y?.forEach((triplet) => {
    // Find the housing on the graph
    const match = graphData.lyphs.find( lyph => lyph.id === triplet.id);
    matches.push(match);
    if (match) {
      // Find the group where this housing lyph belongs
      const groupMatched = graphData.groups.find((group) => group.lyphs.find((lyph) => lyph.id === match.id));
      if (groupMatched) {
        activeNeurulatedGroups?.includes(groupMatched) ? null : activeNeurulatedGroups.push(groupMatched);
      }
    }
  });

  // Update hosted properties of lyphs, matching them to their region or wire
  updateLyphsHosts(matches, neuronTriplets);
};

/**
 * Update Lyphs 
 * @param {*} matches 
 * @param {*} neuronTriplets 
 * @returns 
 */
function updateLyphsHosts(matches,neuronTriplets){
  matches.forEach((m) => {
    if (m.internalIn?.layerIn ) {
      if (m.internalIn?.layerIn.class == "Wire") {
        m.wiredTo = m.internalIn.layerIn;
      } else if (m.internalIn?.layerIn.class == "Region") {
        m.hostedBy = m.internalIn.layerIn;
      } else if (m.internalIn?.layerIn.class == "Lyph") {
        m.hostedBy = m.internalIn.layerIn;
      }
    }

    if (m.conveys?.levelIn) {
      if (m.conveys?.levelIn[0]?.wiredTo) {
        m.wiredTo = m.conveys?.levelIn[0]?.wiredTo;
      } else if ( m.conveys?.levelIn[0]?.hostedBy) {
        m.hostedBy =  m.conveys?.levelIn[0]?.hostedBy;
      }
    }

    // Keep track of lyphs hosted by a region
    if (m.hostedBy) {
      if ( m.hostedBy.viewObjects["main"] == undefined ){
        const match = neuronTriplets.r?.find( r => r.id === m.hostedBy.id );
        if (match){
          m.hostedBy = match;
        }
      }
      m.hostedBy?.hostedLyphs
        ? m.hostedBy.hostedLyphs?.includes(m)
          ? null
          : m.hostedBy.hostedLyphs?.push(m)
        : (m.hostedBy.hostedLyphs = [m]);
    }
  });

  return matches;
}

/**
 * Find the housing lyph of a lyph component.
 * @param {*} lyph - Target lyph we the need the house for
 * @returns 
 */
export function getHouseLyph(lyph) {
  let housingLyph = lyph;
  if (housingLyph.internalIn || housingLyph?.layerIn || housingLyph.hostedBy || housingLyph.housingLyph || housingLyph.onBorder || housingLyph.host || housingLyph.onBorder) {
    let tempParent = housingLyph.internalIn || housingLyph?.layerIn || housingLyph.hostedBy || housingLyph.housingLyph || housingLyph.onBorder || housingLyph.host;
    if ( tempParent.class != "Region" && tempParent.class != "Wire" ){
      housingLyph =housingLyph.internalIn || housingLyph?.layerIn ||  housingLyph.hostedBy || housingLyph.housingLyph || housingLyph.onBorder || housingLyph.host;
      while ( housingLyph.internalIn || housingLyph?.layerIn || housingLyph?.hostedBy || housingLyph.housingLyph || housingLyph?.onBorder || housingLyph.host) {
        let tempParent = housingLyph.internalIn || housingLyph?.layerIn || housingLyph.hostedBy || housingLyph.housingLyph || housingLyph.onBorder || housingLyph.host;
        if ( tempParent.class != "Region" && tempParent.class != "Wire" ){
          housingLyph = housingLyph.internalIn || housingLyph?.layerIn || housingLyph.hostedBy || housingLyph.housingLyph || housingLyph.onBorder || housingLyph.host;
        } else {
          break;
        }
      }
    }
  }

  return housingLyph;
}

function distance(a, b) {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}

export function applyOrthogonalLayout(links, nodes, left, top, width, height) {
  const distances = [];
  links.forEach(l => {
    const linkDistance = distance(l.source, l.target);

    distances.push(linkDistance);
  });
  if (distances.length > 0)
  {
    const dev = stddev(distances);
    const average = avg(distances);
    const max_delta = average - 0.25 * dev ;
    const distance_indexes = distances.map((d,i) => { 
      if (d > max_delta)
        return i ;
    })
    .filter(d => d);
    const filtered_links = [];
    distance_indexes.forEach( (di) => {
      filtered_links.push(links[di])
    })
    if (filtered_links.length > 0)
    {
      return orthogonalLayout(filtered_links, nodes, left, top, width, height) ;
    }
  }
}