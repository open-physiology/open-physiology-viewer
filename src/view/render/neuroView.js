import {flatten } from "lodash-bound";
import { autoSizeLyph, pointAlongLine } from "./autoLayout"
import {$Field, modelClasses} from "../../model";
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
    if (!housingLyphs.includes(l.fasciculatesIn || l.endsIn ) &&  (l.fasciculatesIn || l.endsIn ) ) {
      housingLyphs.push(l.fasciculatesIn || l.endsIn );
    }
  });
   //links -> lyphs
  // Traverse through layers of fasciculatesIn, get to inmediate housing lyph: internalIn and layerIn
  // axis property
  console.log("housingLyphs ", housingLyphs);

  let hostedHousingLyphs = housingLyphs?.map((l) => l?.hostedBy); //lyphs -> regions
  console.log("hostedHousingLyphs ", hostedHousingLyphs);
  hostedHousingLyphs.forEach( h => h != undefined && h?.class == "Region" ? neuronTriplets.r.push(h) : null)
  neuronTriplets.y = housingLyphs;

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
function toggleNeurulatedLyph(lyph, checked, neuronMatches) {
  lyph.hidden = checked;

  if ( !neuronMatches?.links?.find( l => l.id === lyph.conveys?.id ) ) {
      lyph.conveys ? (lyph.conveys.inactive = checked) : null;
      lyph.conveys?.class == "Lyph" ? toggleNeurulatedLyph((lyph.conveys, checked, neurulatedMatches)) : null
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
    link.source ? link.source.inactive = checked : null;
    link.target ? link.target.inactive = checked : null;
  });

  checked ? groupMatched.show() : groupMatched.hide();

  groupMatched.lyphs.forEach((lyph) => {
    if ( neurulatedMatches?.y?.find( c => c.id === lyph.id ) ) {
      lyph.hidden = !checked;
    } else {
      lyph.hidden = checked;
      if (lyph.supertype) {
          toggleNeurulatedLyph(lyph.supertype, checked, neurulatedMatches);
          lyph.supertype.subtypes?.forEach((l) => {
              toggleNeurulatedLyph(l, checked, neurulatedMatches);
          });
      }
    }
  });
}

/**
 * For each e in the list of (x,y,e) triplets, identify the TOO map component from {F,D,N} to which e belongs.
 * If either F or D are involved with an e, switch on the visibility of the whole circular scaffold for F-or-D.
 * Switch on visibility of the wire or region in the LHS view.
 */
export function toggleScaffoldsNeuroview ( scaffoldsList, activeNeurulatedComponents, neuronTriplets, checked ) {
  // Filter out scaffolds that match the regions attached to the housing lyphs
  for (let scaffold of scaffoldsList) {
    if (scaffold.id !== "too-map" && scaffold.regions !== undefined) {
      for (let region of scaffold.regions) {
        let match = neuronTriplets?.r?.find(
          (matchReg) => region.id === matchReg.id
        );
        if (match === undefined) {
          region.inactive = checked;
          region.hostedLyphs = [];
          activeNeurulatedComponents.components.push(region);
          region.borderAnchors?.forEach((anchor) => (anchor.inactive = checked));
          region.facets?.forEach((facet) => (facet.inactive = checked));
        } else {
          region.inactive = !checked;
          region.hostedLyphs = [];
          activeNeurulatedComponents.components.push(region);
          if ( match.namespace != region.namespace ) {
            neuronTriplets.r = neuronTriplets?.r?.filter(
              (matchReg) => region.id !== matchReg.id
            );
            neuronTriplets?.r?.push(region);
          }
        }
      }
    }
  }

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
    neuronTriplets.w.forEach((w) => {
      let scaffoldMatch = scaffold.wires?.find( wire => wire.id == w.id);
      if ( scaffoldMatch ) {
        scaffoldMatch.inactive = !checked;
        if (scaffoldMatch.source ) scaffoldMatch.source.inactive = !checked;
        if (scaffoldMatch.target ) scaffoldMatch.target.inactive = !checked;
        scaffoldMatch.hidden = !checked;
        if (scaffoldMatch.source ) scaffoldMatch.source.hidden = !checked;
        if (scaffoldMatch.target ) scaffoldMatch.target.hidden = !checked;
      }
    });

    // Looks for arcs making up the scaffold wires 
    let scaffoldMatchs = scaffold.wires?.filter( wire => wire.geometry == Edge.EDGE_GEOMETRY.ARC);
    scaffoldMatchs.filter( scaffoldMatch => {
      scaffoldMatch.inactive = !checked;
      traverseWires(scaffoldMatch.source , checked)
      traverseWires(scaffoldMatch.target , checked)
    });
  });

  return modifiedScaffolds;
}

/**
 * 
 * @param {*} neuronTriplets 
 */
export function autoLayoutNeuron(checked, neuronTriplets) {
  neuronTriplets.y.forEach((m) => {
    if (m.viewObjects["main"]) {
        autoSizeLyph(m.viewObjects["main"]);
        m.autoSize();
    }
  });

  linksUpdate(checked, neuronTriplets);      
}

/**
 * 
 * @param {*} event 
 * @param {*} graphData 
 * @param {*} neuronTriplets 
 * @param {*} activeNeurulatedComponents 
 */
export function toggleGroupLyphsView (event, graphData, neuronTriplets, activeNeurulatedComponents) {
  let matches = [];
  // Find group where housing lyph belongs
  neuronTriplets.y?.forEach((triplet) => {
    const match = graphData.lyphs.find(
      (lyph) => lyph.id === triplet.id
    );
    matches.push(match);
    if (match) {
      event.checked ? match.inactive = !event.checked : null;
      const groupMatched = graphData.groups.find((group) =>
        group.lyphs.find((lyph) => lyph.id === match.id)
      );
      if (groupMatched) {
        activeNeurulatedComponents?.groups?.includes(groupMatched) ? null : activeNeurulatedComponents.groups.push(groupMatched);
      }
    }
  });

  console.log("matches ", matches)

  activeNeurulatedComponents.groups.forEach((g) => {
    handleNeurulatedGroup(event.checked, g, neuronTriplets);
    let hostedLinks = g.links?.filter((l) => l.fasciculatesIn || l.endsIn || l.levelIn );

    let housingLyphs = [];
    hostedLinks.forEach((l) => { 
      // Avoid duplicate housing lyphs
      !housingLyphs.includes(l.fasciculatesIn || l.endsIn ) &&  (l.fasciculatesIn || l.endsIn ) && housingLyphs.push(l.fasciculatesIn || l.endsIn );
      // Traverse through levelIn housingLypphs
      l.levelIn?.forEach( c => c.housingLyphs?.forEach ( h => !housingLyphs.includes(h) && housingLyphs.push(h) )); 
    });    
  });
  
  matches.forEach((m) => {
    m.hidden = !event.checked;
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
};

export function getHouseLyph(lyph) {
  let housingLyph = lyph;
  if (lyph.internalIn || lyph.layerIn) {
    housingLyph = lyph.internalIn || lyph.layerIn;
    while ( housingLyph?.internalIn || housingLyph?.layerIn ) {
      housingLyph = housingLyph.internalIn || housingLyph?.layerIn;
    }
  }

  if ( housingLyph.class == "Node" ){
    if (housingLyph.hostedBy || housingLyph.onBorder || housingLyph.host) {
      let tempParent = housingLyph.hostedBy || housingLyph.onBorder || housingLyph.host;
      if ( tempParent.class != "Region" && tempParent.class != "Wire" ){
        housingLyph = housingLyph.hostedBy || housingLyph.onBorder || housingLyph.host;
        while ( housingLyph?.hostedBy || housingLyph?.onBorder || housingLyph.host) {
          let tempParent = housingLyph.hostedBy || housingLyph.onBorder || housingLyph.host;
          if ( tempParent.class != "Region" && tempParent.class != "Wire" ){
            housingLyph = housingLyph.hostedBy || housingLyph.onBorder || housingLyph.host;
          } else {
            break;
          }
        }
      }
    }
  }

  return housingLyph;
}

export function linksUpdate(checked, neuronTriplets) {
  let linksmap = {};
      neuronTriplets.links.forEach((l) => {
        if ( linksmap[l.source?.id] == undefined ) linksmap[l.source?.id] = [l];
        if ( linksmap[l.target?.id] == undefined ) linksmap[l.target?.id] = [l];
    
        linksmap[l.target?.id].includes(l) ? null : linksmap[l.target?.id].push(l);
        linksmap[l.source?.id].includes(l) ? null : linksmap[l.source?.id].push(l);

      });

      neuronTriplets.links.forEach((l) => {
        console.log("L -- ", l?.id)
        let matchTargetLyph,matchSourceLyph;

        linksmap[l.source?.id].forEach((link) => {
          matchTargetLyph = getHouseLyph(link.target);
          matchSourceLyph = getHouseLyph(link.source);
        });

        linksmap[l.target?.id].forEach((ll) => {
          matchTargetLyph = getHouseLyph(ll.target) || matchTargetLyph;
          matchSourceLyph = getHouseLyph(ll.source) || matchSourceLyph;
        });

        console.log("-- matchTargetLyph ", matchTargetLyph)
        console.log("-- matchSourceLyph ", matchSourceLyph)
      });

      console.log("Linksmap ", linksmap)
}