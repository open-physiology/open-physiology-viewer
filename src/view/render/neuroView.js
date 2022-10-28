import {flatten } from "lodash-bound";

export function buildNeurulatedTriplets(group) {
  // Extract Neurons from Segment
  let neuronTriplets = { x: group.lyphs, y: [], w: [], r: [], links : [], chains : [], nodes : [] };

  let hostedLinks = group.links?.filter((l) => l.fasciculatesIn || l.endsIn);
  console.log("Hosted links ", hostedLinks);
  neuronTriplets.links = hostedLinks;

  let housingLyphs = [
    ...new Set(hostedLinks.map((l) => l.fasciculatesIn || l.endsIn)),
  ]; //links -> lyphs
  console.log("housingLyphs ", housingLyphs);

  let hostedHousingLyphs = housingLyphs?.map((l) => l.hostedBy); //lyphs -> regions
  console.log("hostedHousingLyphs ", hostedHousingLyphs);
  //Find housing lyph chains
  neuronTriplets.y = housingLyphs;

  let housingLyphsInChains = housingLyphs?.filter((h) => h.axis?.levelIn);
  console.log("hostedHousingLyphs ", housingLyphsInChains);

  let housingChains = [
    ...new Set(housingLyphsInChains.map((h) => h.axis.levelIn)::flatten()),
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
  neuronTriplets.nodes = neuronTriplets.nodes.concat(housingChainRoots)

  let housingChainLeaves = housingChains
    .filter((c) => c.leaf)
    .map((c) => c.leaf);
  console.log("housingChainLeaves ", housingChainLeaves);
  neuronTriplets.nodes = neuronTriplets.nodes.concat(housingChainLeaves)

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
    .map((c) => c.hostedBy); //chains -> regions
  console.log("hostedHousingChains ", hostedHousingChains);
  hostedHousingChains.forEach((region) => neuronTriplets.r.push(region));

  return neuronTriplets;
}

export function toggleNeurulatedLyph(lyph, checked, neuronMatches) {
  lyph.hidden = checked;

  if ( !neuronMatches?.links?.find( l => l.fullID === lyph.conveys?.fullID ) ) {
      lyph.conveys ? (lyph.conveys.inactive = checked) : null;
      lyph.conveys?.source ? (lyph.conveys.source.inactive = checked) : null;
      lyph.conveys?.target ? (lyph.conveys.target.inactive = checked) : null;
  }
}

export function handleNeurulatedGroup(checked, groupMatched, neurulatedMatches) {
  groupMatched.nodes.forEach((node) => { 
    if ( neurulatedMatches?.nodes?.find( l => l.fullID === node.fullID ) ) {
      node.inactive = !checked;
    } else {
      node.inactive = checked;
    }
  });
  groupMatched?.links?.forEach((link) => { 
    if ( neurulatedMatches?.links?.find( l => l.fullID === link.fullID ) ) {
      link.inactive = !checked;
      link.source ? link.source.inactive = !checked : null;
      link.target ? link.target.inactive = !checked : null;
      console.log("Source ", link.source);
      console.log("Target ", link.target)
    } else {
      link.inactive = checked;
      link.source ? link.source.inactive = checked : null;
      link.target ? link.target.inactive = checked : null;
    }
  });

  console.log("Initial setup ");
  checked ? groupMatched.show() : groupMatched.hide();

  groupMatched.lyphs.forEach((lyph) => {
    if ( neurulatedMatches?.lyphs?.find( c => c.fullID === lyph.fullID ) ) {
      lyph.hidden = !checked;
    } else {
      toggleNeurulatedLyph(lyph, checked, neurulatedMatches);
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
export function toggleScaffoldsNeuroview(
  scaffoldsList,
  activeNeurulatedComponents,
  neuronTriplets
) {
  for (let scaffold of scaffoldsList) {
    if (scaffold.id !== "too-map" && scaffold.regions !== undefined) {
      for (let region of scaffold.regions) {
        let match = neuronTriplets?.r?.find(
          (matchReg) => region.fullID === matchReg.fullID
        );
        if (match === undefined) {
          region.inactive = true;
          region.hostedLyphs = [];
          activeNeurulatedComponents.components.push(region);
          region.borderAnchors?.forEach((anchor) => (anchor.inactive = true));
          region.facets?.forEach((facet) => (facet.inactive = true));
        } else {
          match.inactive = false;
          match.hidden = false;
          match.hostedLyphs = [];
          activeNeurulatedComponents.components.push(match);
        }
      }
    }
  }

  let scaffolds = scaffoldsList.filter(
    (scaffold) =>
      scaffold.id !== "too-map" &&
      (scaffold.wires?.find((w) =>
        neuronTriplets?.w?.find((matchReg) => w.fullID === matchReg.fullID)
      ) ||
        scaffold.regions?.find((w) =>
          neuronTriplets?.r?.find((matchReg) => w.fullID === matchReg.fullID)
        ))
  );
  console.log("Match scaffolds for wires and regions : ", scaffolds);
  return scaffolds;
}
