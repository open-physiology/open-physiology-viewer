import {flatten } from "lodash-bound";
import { autoSizeLyph } from "./autoLayout"
import {modelClasses} from "../../model";
const {Edge} = modelClasses;


/**
 * Build dictionary keeping tracks of housing lyphs, hosted regions, wires.
 * @param {*} group - Group to toggle on or off
 * @returns 
 */
export function buildNeurulatedTriplets(group) {
  // Extract Neurons from Segment
  let neuronTriplets = { x: group.lyphs, y: [], w: [], r: [], links : [], chains : [], nodes : [] };

  let hostedLinks = group.links?.filter((l) => l.fasciculatesIn || l.endsIn || l.levelIn );
  console.log("Hosted links ", hostedLinks);
  neuronTriplets.links = group?.links;

  let housingLyphs = [];
  hostedLinks.forEach((l) => { 
    // Avoid duplicate housing lyphs
    if (!housingLyphs.includes(l.fasciculatesIn) &&  (l.fasciculatesIn ) ) {
      housingLyphs.push(l.fasciculatesIn);
    }
    if (!housingLyphs.includes(l.endsIn) &&  (l.endsIn ) ) {
      housingLyphs.push(l.endsIn);
    }

    if ( l.levelIn ) {
      l.levelIn?.forEach( ll =>  ll.housingLyphs?.forEach( lyph => (!housingLyphs.includes(lyph) && housingLyphs.push(lyph))));
    }
  });
   //links -> lyphs
  // Traverse through layers of fasciculatesIn, get to inmediate housing lyph: internalIn and layerIn
  // axis property
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
    hosts?.forEach( h => ( h.wiredTo && !neuronTriplets.w.includes(h.wiredTo)) && neuronTriplets.w.push(h.wiredTo));
  })

  neuronTriplets.y = neuronTriplets.y.concat(updatedLyphs);
  
  let housingLyphsInChains = housingLyphs?.filter((h) => h?.axis?.levelIn);
  console.log("housingLyphsInChains ", housingLyphsInChains);

  let housingChains = [
    ...new Set(housingLyphsInChains.map((h) => h?.axis?.levelIn)::flatten()),
  ]; // lyphs -> links -> chains, each link can be part of several chains, hence levelIn gives an array that we need to flatten
  console.log("housingChains ", housingChains);
  neuronTriplets.chains = housingChains;

  let wiredHousingChains = housingChains
    .filter((c) => c.wiredTo)
    .map((c) => c.wiredTo); // chains -> wires
  console.log("wiredHousingChains ", wiredHousingChains);

  wiredHousingChains.forEach((wire) => neuronTriplets.w.push(wire));

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
  anchoredHousingChainRoots.forEach((wire) => neuronTriplets.w.push(wire));

  let anchoredHousingChainLeaves = housingChainLeaves.filter(
    (n) => n.anchoredTo
  );
  console.log("anchoredHousingChainLeaves ", anchoredHousingChainLeaves);
  anchoredHousingChainLeaves.forEach((wire) => neuronTriplets.w.push(wire));

  let hostedHousingChains = housingChains
    .filter((c) => c.hostedBy)
    .map((c) => c.hostedBy) //chains -> regions
  console.log("hostedHousingChains ", hostedHousingChains);
  hostedHousingChains.forEach((region) => neuronTriplets.r.indexOf(region) == -1 && neuronTriplets.r.push(region));

  return neuronTriplets;
}

/**
 * Toggle Lyph inner properties, to show/hide inner components.
 * @param {*} lyph 
 * @param {*} checked 
 * @param {*} neuronMatches 
 */
export function toggleNeurulatedLyph(lyph, checked, neuronMatches) {
  lyph.hidden = checked;
  // Toggle visibility for links not part of the neurulated neuron
  if ( !neuronMatches?.links?.find( l => l.id === lyph.conveys?.id ) ) {
    lyph.conveys.inactive = checked;
    lyph.conveys.hidden = checked;
    lyph.conveys?.source ? (lyph.conveys.source.inactive = checked) : null;
    lyph.conveys?.target ? (lyph.conveys.target.inactive = checked) : null;
  }
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
      if (checked) lyph.inactive = !checked;
    } else {
      lyph.hidden = checked;
      if (checked) lyph.inactive = checked;
    }
  });
}

export function toggleWire(target, checked){
  target.inactive = !checked;
  target.hidden = !checked;
  target.sourceOf?.forEach( s => { 
    if ( s.geometry == Edge.EDGE_GEOMETRY.ARC && s.name ) {
      s.inactive = !checked;
      s.hidden = !checked;
    }
  });

  target.targetOf?.forEach( s => { 
    if ( s.geometry == Edge.EDGE_GEOMETRY.ARC && s.name ) {
      s.inactive = !checked;
      s.hidden = !checked;
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
  scaffoldsList.forEach( scaffold => {
    if (scaffold.id !== "too-map" && scaffold.regions !== undefined) {
      scaffold.regions?.forEach( region => {
        let match = neuronTriplets?.r?.find(
          (matchReg) => region.id === matchReg.id
        );
        if ( match === undefined ) {
          region.inactive = checked;
          region.hostedLyphs = [];
          region.borderAnchors?.forEach((anchor) => (anchor.inactive = checked));
          region.facets?.forEach((facet) => (facet.inactive = checked));

        } else {
          region.inactive = !checked;
          region.borderAnchors?.forEach((anchor) => (anchor.inactive = !checked));
          region.facets?.forEach((facet) => (facet.inactive = !checked));
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

  // Filter out scaffolds that match the wires attached to the housing lyphs
  let scaffolds = scaffoldsList.filter(
    (scaffold) =>
      scaffold.id !== "too-map" &&
      (scaffold.wires?.find((w) =>
        neuronTriplets?.w?.find((matchReg) => w.id === matchReg.id)
      ) ||
        scaffold.regions?.find((w) =>
          neuronTriplets?.r?.find((matchReg) => w.id === matchReg.id)
        ) ||
        scaffold.anchors?.find((anchor) =>
          neuronTriplets?.w?.find((wire) => anchor.id === wire?.source?.id || anchor.id === wire?.target?.id )
        ))
  );

  let modifiedScaffolds = [];
  scaffolds?.forEach((scaffold) => {
    scaffold.hidden !== !checked && modifiedScaffolds.push(scaffold);
    scaffold.wires?.forEach( w => w.inactive = checked );
    scaffold.anchors?.forEach( w => w.inactive = checked );

    neuronTriplets.r.forEach((r) => {
      let region = scaffold.regions?.find((reg) => reg.id == r.id);
      region ? (region.inactive = !checked) : null;
    });

    // Looks for arcs making up the scaffold wires 
    let scaffoldMatchs = scaffold.wires?.filter( wire => wire.geometry == Edge.EDGE_GEOMETRY.ARC && wire.name );
    scaffoldMatchs.filter( scaffoldMatch => {
      scaffoldMatch.inactive = !checked;
      traverseWires(scaffoldMatch.source , checked)
      traverseWires(scaffoldMatch.target , checked)
    });

    neuronTriplets.w.forEach((w) => {
      let scaffoldMatch = scaffold.wires?.find( wire => wire.id == w.id);
      if ( scaffoldMatch ) {
        scaffoldMatch.inactive = !checked;
        if (scaffoldMatch.source ) { 
          toggleWire(scaffoldMatch.source, checked);
        }
        if (scaffoldMatch.target ) { 
          toggleWire(scaffoldMatch.target, checked);
        }
      }
    });
  });

  return modifiedScaffolds;
}

/**
 * Loops through housing neurons and call auto placement function
 * @param {*} neuronTriplets 
 */
export function autoLayoutNeuron(lyphs) {
  lyphs.forEach((m) => {
    if (m.viewObjects["main"]) {
        m.autoSize();
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
export function toggleGroupLyphsView (event, graphData, neuronTriplets, activeNeurulatedGroups) {
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
  matches = updateLyphsHosts(matches, neuronTriplets);
  
  // Handle each group individually. Turn group's lyph on or off depending if they are housing lyphs
  activeNeurulatedGroups.forEach((g) => {
    handleNeurulatedGroup(event.checked, g, neuronTriplets);    
  });
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
 * Find the housing lyph of a lyph.
 * @param {*} lyph - Target lyph we the need the house for
 * @returns 
 */
export function getHouseLyph(lyph) {
  let housingLyph = lyph;

  if (housingLyph.internalIn || housingLyph?.layerIn || housingLyph.hostedBy || housingLyph.onBorder || housingLyph.host || housingLyph.onBorder) {
    let tempParent = housingLyph.internalIn || housingLyph?.layerIn || housingLyph.hostedBy || housingLyph.onBorder || housingLyph.host;
    if ( tempParent.class != "Region" && tempParent.class != "Wire" ){
      housingLyph =housingLyph.internalIn || housingLyph?.layerIn ||  housingLyph.hostedBy || housingLyph.onBorder || housingLyph.host;
      while ( housingLyph.internalIn || housingLyph?.layerIn || housingLyph?.hostedBy || housingLyph?.onBorder || housingLyph.host) {
        let tempParent = housingLyph.internalIn || housingLyph?.layerIn || housingLyph.hostedBy || housingLyph.onBorder || housingLyph.host;
        if ( tempParent.class != "Region" && tempParent.class != "Wire" ){
          housingLyph = housingLyph.internalIn || housingLyph?.layerIn || housingLyph.hostedBy || housingLyph.onBorder || housingLyph.host;
        } else {
          break;
        }
      }
    }
  }

  return housingLyph;
}