import {flatten } from "lodash-bound";
import { autoSizeLyph } from "./autoLayout"

export function buildNeurulatedTriplets(group) {
  // Extract Neurons from Segment
  let neuronTriplets = { x: group.lyphs, y: [], w: [], r: [], links : [], chains : [], nodes : [] };

  let hostedLinks = group.links?.filter((l) => l.fasciculatesIn || l.endsIn || l.levelIn );
  console.log("Hosted links ", hostedLinks);
  neuronTriplets.links = group?.links;

  let housingLyphs = [];
  hostedLinks.forEach((l) => { 
    console.log("Lyph ", l);
    // Avoid duplicate housing lyphs
    if (!housingLyphs.includes(l.fasciculatesIn || l.endsIn ) &&  (l.fasciculatesIn || l.endsIn ) ) {
      housingLyphs.push(l.fasciculatesIn || l.endsIn );
    }
    // Traverse through levelIn housingLypphs
    // l.levelIn?.forEach( c => {
    //   c.housingLyphs?.forEach ( h => {
    //     if (!housingLyphs.includes(h)) {
    //       housingLyphs.push(h);
    //     }
    //   });
    // }) 
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
  // neuronTriplets.nodes = neuronTriplets.nodes.concat(housingChainRoots)

  let housingChainLeaves = housingChains
    .filter((c) => c.leaf)
    .map((c) => c.leaf);
  console.log("housingChainLeaves ", housingChainLeaves);
  // neuronTriplets.nodes = neuronTriplets.nodes.concat(housingChainLeaves)

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

  if ( !neuronMatches?.links?.find( l => l.id === lyph.conveys?.id ) && !neuronMatches?.y?.find( ly => ly.id === lyph.conveys?.id ) ) {
      lyph.conveys ? (lyph.conveys.inactive = checked) : null;
      lyph.conveys?.source ? (lyph.conveys.source.inactive = checked) : null;
      lyph.conveys?.target ? (lyph.conveys.target.inactive = checked) : null;
  }
}

export function handleNeurulatedGroup(checked, groupMatched, neurulatedMatches) {
  groupMatched.nodes.forEach((node) => { 
    if ( neurulatedMatches?.nodes?.find( l => l.id === node.id ) ) {
      node.inactive = !checked;
    } else {
      node.inactive = checked;
    }
  });
  groupMatched?.links?.forEach((link) => { 
    if ( neurulatedMatches?.links?.find( l => l.id === link.id ) ) {
      link.inactive = !checked;
      link.source ? link.source.inactive = !checked : null;
      link.target ? link.target.inactive = !checked : null;
    } else {
      link.inactive = checked;
      link.source ? link.source.inactive = checked : null;
      link.target ? link.target.inactive = checked : null;
    }
  });

  checked ? groupMatched.show() : groupMatched.hide();

  groupMatched.lyphs.forEach((lyph) => {
    if ( neurulatedMatches?.y?.find( c => c.id === lyph.id ) ) {
      lyph.hidden = !checked;
    } else {
      lyph.hidden = checked;
      if (lyph.supertype) {
        if ( !neurulatedMatches?.y?.find( c => c.id === lyph.supertype.id ) )  {
          toggleNeurulatedLyph(lyph.supertype, checked, neurulatedMatches);
          lyph.supertype.subtypes?.forEach((l) => {
            if ( !neurulatedMatches?.y?.find( c => c.id === l.id ) ) {
              toggleNeurulatedLyph(l, checked, neurulatedMatches);
            }
          });
        }
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
          (matchReg) => region.fullID === matchReg.fullID
        );
        if (match === undefined) {
          region.inactive = checked;
          region.hostedLyphs = [];
          activeNeurulatedComponents.components.push(region);
          region.borderAnchors?.forEach((anchor) => (anchor.inactive = checked));
          region.facets?.forEach((facet) => (facet.inactive = checked));
        } else {
          match.inactive = !checked;
          match.hostedLyphs = [];
          activeNeurulatedComponents.components.push(match);
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
        ))
  );

  console.log("Match scaffolds for wires and regions : ", scaffolds);
  return scaffolds;
}


export function autoLayoutNeuron(neuronTriplets) {
  neuronTriplets.y.forEach((m) => {
    if (m.viewObjects["main"]) {
        console.log("Mesh exists ", m);
        autoSizeLyph(m.viewObjects["main"]);
        m.autoSize();
    } else {
      console.log("Mesh does not exist ", m);
    }
  });

  neuronTriplets.links.forEach((m) => {
    if (m.viewObjects["main"]) {
      m.source?.updateViewObjects();
      m.target?.updateViewObjects()
      m.updateViewObjects()
    } else {
      console.log("Link does not exist ", m);
    }
  });

  neuronTriplets.r.forEach((m) => {
    m.updateViewObjects()
  });
}

export function toggleGroupLyphsView (event, graphData, neuronTriplets, activeNeurulatedComponents) {
  let matches = [];
  // Find group where housing lyph belongs
  neuronTriplets.y?.forEach((triplet) => {
    const match = graphData.lyphs.find(
      (lyph) => lyph.id === triplet.id
    );
    matches.push(match);
    if (match) {
      match.inactive = !event.checked;
      const groupMatched = graphData.groups.find((group) =>
        group.lyphs.find((lyph) => lyph.id === match.id)
      );
      if (groupMatched) {
        console.log("Group matched ", groupMatched);
        activeNeurulatedComponents?.groups?.includes(groupMatched) ? null : activeNeurulatedComponents.groups.push(groupMatched);
      }
    }
  });

  console.log("Groups matched ", activeNeurulatedComponents.groups);
  
  activeNeurulatedComponents.groups.forEach((g) => {
    handleNeurulatedGroup(event.checked, g, neuronTriplets);
    let hostedLinks = g.links?.filter((l) => l.fasciculatesIn || l.endsIn || l.levelIn );
    console.log("G links ", hostedLinks);

    let housingLyphs = [];
    hostedLinks.forEach((l) => { 
      // Avoid duplicate housing lyphs
      if (!housingLyphs.includes(l.fasciculatesIn || l.endsIn ) &&  (l.fasciculatesIn || l.endsIn ) ) {
        housingLyphs.push(l.fasciculatesIn || l.endsIn );
      }
      // Traverse through levelIn housingLypphs
      l.levelIn?.forEach( c => {
        c.housingLyphs?.forEach ( h => {
          if (!housingLyphs.includes(h)) {
            housingLyphs.push(h);
          }
        });
      }) 
    });
    //links -> lyphs
    // Traverse through layers of fasciculatesIn, get to inmediate housing lyph: internalIn and layerIn
    // axis property
    console.log("housingLyphs ", housingLyphs);

    let hostedHousingLyphs = housingLyphs?.map((l) => l?.hostedBy); //lyphs -> regions
    console.log("hostedHousingLyphs ", hostedHousingLyphs);
    
    
  });
  
  console.log("Matches ", matches);

  matches.forEach((m) => {
    m.hidden = !event.checked;
    m.conveys?.levelIn ? m.hostedBy = m.conveys?.levelIn[0]?.hostedBy : null;
    m.conveys?.levelIn ? m.wiredTo = m.conveys?.levelIn[0]?.wiredTo : null;

      if (m.internalIn?.layerIn ) {
        if (m.internalIn?.layerIn.class == "Wire") {
          m.wiredTo = m.internalIn.layerIn;
        } else if (m.internalIn?.layerIn.class == "Region") {
          m.hostedBy = m.internalIn.layerIn;
        } else if (m.internalIn?.layerIn.class == "Lyph") {
          m.hostedBy = m.internalIn.layerIn;
        }
      }

    if (m.hostedBy) {
      m.hostedBy?.hostedLyphs
        ? m.hostedBy.hostedLyphs?.includes(m)
          ? null
          : m.hostedBy.hostedLyphs?.push(m)
        : (m.hostedBy.hostedLyphs = [m]);
    }
  });
};