import {flatten } from "lodash-bound";
import {modelClasses,$SchemaClass} from "../../model";
import { orthogonalLayout } from "./neuroViewHelper";
import {  getWorldPosition } from "./autoLayout/objects";
import { DONE_UPDATING } from "./../utils"
import { random_rgba } from "./../utils"
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

  let hostedHousingLyphs = housingLyphs?.map((l) => l?.hostedBy || l.conveys?.levelIn?.[0]?.hostedBy ); //lyphs -> regions
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

  let housingChains = [
    ...new Set(housingLyphsInChains.map((h) => h?.axis?.levelIn)::flatten()),
  ]; // lyphs -> links -> chains, each link can be part of several chains, hence levelIn gives an array that we need to flatten

  housingChains = [];
  group.links.filter( l => l.levelIn?.forEach( ll => !housingChains.find( c => c.id == ll.id ) && housingChains.push(ll) ));
  neuronTriplets.chains = housingChains;

  let links = [];
  housingChains.forEach( chain => chain.levels.forEach( level => !links.find( c => c.id == level.id ) && links.push(level)));

  let wiredHousingChains = housingChains
    .filter((c) => c.wiredTo)
    .map((c) => c.wiredTo); // chains -> wires

  wiredHousingChains.forEach((wire) => neuronTriplets.w.indexOf(wire) == -1 && neuronTriplets.w.push(wire));

  let housingChainRoots = housingChains
    .filter((c) => c.root)
    .map((c) => c.root); // chains -> nodes

  let housingChainLeaves = housingChains
    .filter((c) => c.leaf)
    .map((c) => c.leaf);

  let anchoredHousingChainRoots = housingChainRoots.filter((n) => n.anchoredTo); //nodes -> anchors
  anchoredHousingChainRoots.forEach((wire) => neuronTriplets.w.indexOf(wire) == -1 && neuronTriplets.w.push(wire));

  let anchoredHousingChainLeaves = housingChainLeaves.filter(
    (n) => n.anchoredTo
  );
  anchoredHousingChainLeaves.forEach((wire) => neuronTriplets.w.indexOf(wire) == -1 && neuronTriplets.w.push(wire));

  let hostedHousingChains = housingChains
    .filter((c) => c.hostedBy)
    .map((c) => c.hostedBy) //chains -> regions
  hostedHousingChains.forEach((region) => neuronTriplets.r.indexOf(region) == -1 && neuronTriplets.r.push(region));

  let color = random_rgba();
  neuronTriplets.links?.forEach( link=> {
    if ( link.color === undefined || link.color === "#000" || link.color === "#010" ){
      link.color = color;
    }  
  })
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
  // Hides nodes we don't want to display
  groupMatched?.nodes.forEach( n => {
    n.inactive = checked;
  })
  // Hides links we don't need
  groupMatched?.links?.forEach((link) => { 
    // Show links that we need for Neuroview
    if ( neurulatedMatches?.links?.find( l => l.id === link.id ) ) {
      link.inactive = !checked;
      link.skipLabel = !checked;
    } else {
      // Hide links that we don't
      link.inactive = checked;
      link.skipLabel = checked;
    }
    // Hide nodes
    link.source ? link.source.inactive = checked : null;
    link.target ? link.target.inactive = checked : null;
  });

  checked ? groupMatched.show() : groupMatched.hide();

  groupMatched.lyphs.forEach((lyph) => {
    if ( neurulatedMatches?.y?.find( l => l.id === lyph.id ) ) {
      lyph.hidden = !checked;
      lyph.skipLabel = !checked;
      lyph.layers?.forEach( layer => {
        !(layer instanceof String) ? layer.hidden = !checked : null
      });
      if (checked &&  !(lyph instanceof String)) { 
        lyph.inactive = !checked;
        lyph.layers?.forEach( layer => {
          layer.inactive = !checked;
        });
      }
    } 
    else {
      lyph.hidden = checked;
      lyph.skipLabel = checked;
      lyph.layers?.forEach( layer => {
        !(layer instanceof String) ? layer.hidden = checked : null
      });
      if (checked &&  !(lyph instanceof String)) { 
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
        } else {
          region.inactive = !checked;
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
  console.log("scaffoldsList ", scaffoldsList)
  console.log("neuronTriplets ", neuronTriplets)
  // Filter out scaffolds that match the wires attached to the housing lyphs
  let scaffolds = scaffoldsList.filter(
    (scaffold) => scaffold.id !== "too-map" &&
      (scaffold.wires?.find((w) => neuronTriplets?.w?.find((wire) => w.id === wire.id)) ||
      scaffold.regions?.find((r) => neuronTriplets?.r?.find((region) => r.id === region.id)) ||
      scaffold.anchors?.find((anchor) => neuronTriplets?.w?.find((wire) => anchor.id === wire?.source?.id || anchor.id === wire?.target?.id )))
  );

  let modifiedScaffolds = [];
  scaffolds?.forEach((scaffold) => {
    //if ( scaffold.hidden !== !checked ) {
      modifiedScaffolds.push(scaffold);
    //}
    scaffold.wires?.forEach( w => { 
      w.inactive = checked; 
    });
    scaffold.anchors?.forEach( w => { 
      w.inactive = checked;
    });

    // Toggle regions that are not housing lyphs
    neuronTriplets.r.forEach((r) => {
      let region = scaffold.regions?.find((reg) => reg.id == r.id);
      if ( region ) {
        region.inactive = !checked;
      }
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
      if (links?.length > 0)
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
    if ( match === undefined ){
      graphData.chains.find( chain => chain.lyphs.find( lyph => lyph.id === triplet.id));
    }
    if (match) {
      matches.push(match);
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
      if (m.conveys?.levelIn?.[0]?.wiredTo) {
        m.wiredTo = m.conveys?.levelIn?.[0]?.wiredTo;
      } else if ( m.conveys?.levelIn?.[0]?.hostedBy) {
        m.hostedBy =  m.conveys?.levelIn?.[0]?.hostedBy;
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


        m.hostedBy.hostedLyphs = m.hostedBy?.hostedLyphs?.sort( (a,b) => a.id > b.id ? 1 : -1 );
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

export function applyOrthogonalLayout(links, nodes, left, top, width, height, threshold, router) {
  const distances = [];
  links.forEach(l => {
    let start = getWorldPosition(l.source.viewObjects["main"])
    let end   = getWorldPosition(l.target.viewObjects["main"])
    const sourcePosition = { x: start.x, y: start.y }
    const targetPosition = { x: end.x, y: end.y }
    const linkDistance = distance(sourcePosition, targetPosition);
    l['euclidianDistance'] = linkDistance ;
    distances.push(linkDistance);
  });
  if (distances.length > 0)
  {
    const filtered_links = links.filter ( l => l.euclidianDistance > threshold );
    if (filtered_links.length > 0)
      return orthogonalLayout(filtered_links, nodes, left, top, width, height, false, router) ;
  }
}

export const hideVisibleGroups = (filteredGroups, groups, visible, toggleGroup) => {
  // Hide all visible
  filteredGroups.forEach((g) => {
    g.lyphs.forEach((lyph) => {
      lyph.hidden = true;
      if ( !visible ){
        lyph.hostedBy = undefined;
        lyph.wiredTo = undefined;
      }
    });
    toggleGroup.emit ? toggleGroup.emit(g) : toggleGroup(g);
  });

  groups.forEach((g) => {
    g.lyphs.forEach((lyph) => {
      lyph.hidden = true;
      if ( !visible ){
        lyph.hostedBy = undefined;
        lyph.wiredTo = undefined;
      }
    });
    g.chains?.forEach((chain) => {
      chain.inactive = true;
      chain.hidden = true;
      if ( chain?.viewObjects?.["main"]?.visible ) { 
        chain.viewObjects["main"].visible = false;
      }
      chain?.levels?.forEach( link => {
        link.inactive = true;
        link.hidden = true;
        if ( link?.viewObjects["main"]?.visible ) link.viewObjects["main"].visible = false;
      })
    });
    g.links?.forEach((chain) => {
      chain.inactive = true;
      chain.hidden = true;
      if ( chain?.viewObjects?.["main"]?.visible ) chain.viewObjects["main"].visible = false;
    });
    toggleGroup.emit ? toggleGroup.emit(g) : toggleGroup(g);
  });
};

/**
   * Neuroview mode on or off, allows selecting only one dynamic group at a time.
   * @param {*} visible - Checkbox event
  */
 export const handleNeuroView = (filteredGroups, groups, scaffolds, visible, toggleGroup) => {
  // Hide any visible groups
  if ( visible ) {
    hideVisibleGroups(filteredGroups, groups, visible, toggleGroup);
  } else {
    filteredGroups?.forEach(group => { 
      group?.lyphs.forEach( lyph => {
        lyph.hidden = false;
        lyph.inactive = false;
      });
    });
  }

  // Turn off all scaffolds components if neuroview is enabled, turn on if disabled.
  scaffolds.forEach((scaffold) => {
    scaffold.anchors?.filter( a => typeof a === 'object' ).forEach( a => a.inactive = visible);
    scaffold.regions?.filter( r => typeof r === 'object' ).forEach( r => r.inactive = visible);
    scaffold.wires?.forEach( w => { 
      toggleWire(w, !visible);
    });
    
    // Call event to toggle scaffolds
    if (scaffold.hidden === !visible || (visible && scaffold.hidden === undefined)) {
      toggleGroup.emit ? toggleGroup.emit(scaffold) : toggleGroup(scaffold);
    }
  });
};

export const newGroup = (event ,group, neuronTriplets, filteredDynamicGroups) => {
  // Create a new Group with only the housing lyphs
  const newGroupName = group.name + " - Housing Lyphs";
  let groupClone;
  if ( filteredDynamicGroups.filter(g => g.name == newGroupName ).length < 1 ) {
    groupClone = Object.assign(Object.create(Object.getPrototypeOf(group)), group)
    groupClone.name = newGroupName;
    groupClone.lyphs = neuronTriplets.y;
    groupClone.links = [];
    groupClone.nodes = [];
    groupClone.cloneOf = group;
    filteredDynamicGroups.push(groupClone);
  } else if ( filteredDynamicGroups.find(g => g.name == newGroupName ) ) {
    // Handle each group individually. Turn group's lyph on or off depending if they are housing lyphs
    const groupMatched = filteredDynamicGroups.find(g => g.name == newGroupName );
    groupMatched.hidden = !event.checked;
  }

  return groupClone;
}

export const toggleNeurulatedGroup = (event, group, onToggleGroup, graphData, filteredDynamicGroups, scaffolds) => {
  let neuronTriplets = buildNeurulatedTriplets(group);
  neuronTriplets.links?.forEach( l => l.neurulated = true );
  neuronTriplets.x?.forEach( l => l.neurulated = true );
  neuronTriplets.y?.forEach( l => l.neurulated = true );
  
  let activeNeurulatedGroups = [];
  activeNeurulatedGroups.push(group);
  findHousingLyphsGroups(graphData, neuronTriplets, activeNeurulatedGroups);

  console.log("scaffolds ", scaffolds)
  console.log("event.checked ", event.checked)
  console.log("neuronTriplets ", neuronTriplets)

  // Identify TOO Map components and turn them ON/OFF
  const matchScaffolds = toggleScaffoldsNeuroview(scaffolds,neuronTriplets,event.checked);
  matchScaffolds?.forEach((scaffold) => onToggleGroup.emit ? onToggleGroup.emit(scaffold) : onToggleGroup(scaffold));
  console.log("Match scaffolds ", matchScaffolds)

  //v1 Step 6 : Switch on visibility of group. Toggle ON visibilty of group's lyphs if they are neuron segments only.
  findHousingLyphsGroups(graphData, neuronTriplets, activeNeurulatedGroups);

  // Handle each group individually. Turn group's lyph on or off depending if they are housing lyphs
  activeNeurulatedGroups.forEach((g) => {
    handleNeurulatedGroup(event.checked, g, neuronTriplets);
  });

  group.neurulated = true;

  return newGroup(event, group, neuronTriplets, filteredDynamicGroups);
}

export const handleOrthogonalLinks = (filteredDynamicGroups, viewPortSize, onToggleLayout) => {
  let visibleLinks = [];
  let bigLyphs = []
  for (let group of filteredDynamicGroups) {
    if ( !group?.hidden && !group?.cloneOf ) {
      let neuroTriplets = buildNeurulatedTriplets(group); 
      visibleLinks = visibleLinks.concat(neuroTriplets.links.filter( l => l.collapsible ));
      visibleLinks = visibleLinks?.filter( l => (l.id.match(/_clone/g) || []).length <= 1 );
      bigLyphs = bigLyphs.concat(neuroTriplets.y).filter( l => !l.hidden );
    }
  }
  
  let doneUpdating = () => { 
    const orthogonalSegments = applyOrthogonalLayout(visibleLinks, bigLyphs, viewPortSize.left, viewPortSize.top, viewPortSize.width, viewPortSize.height,10, "manhattan")
    console.log("Done updating")
    if (orthogonalSegments)
    {
      autoLayoutSegments(orthogonalSegments, visibleLinks);
    }
    window.removeEventListener("doneUpdating", doneUpdating);
  };

  window.addEventListener(DONE_UPDATING, doneUpdating);
}

export const toggleNeuroView = (visible, activeGroups, dynamicGroups, scaffolds, toggleGroup) => {
   let groups = activeGroups.filter((g) => g?.hidden == false);
   let visibleGroups = dynamicGroups.filter( dg => !dg?.hidden );
   console.log("Groups ", groups)
   console.log("visibleGroups ", visibleGroups)
   handleNeuroView(visibleGroups, groups, scaffolds, visible, toggleGroup);
}

export const updateRenderedResources = (scaffolds, scaffoldResourceVisibility) => {
  let scaffoldResourceNames = ["renderedComponents", "renderedWires", "renderedRegions", "renderedAnchors"];
  //scaffoldResourceNames.forEach(prop => this[prop] = []);
  (scaffolds || []).forEach(s => {
      //Only include wires from the scaffold, no components
      if (s.class === $SchemaClass.Scaffold && !s.hidden) {
          (s.components || []).forEach(r => {
              r._parent = s;
              r._visible = true;
          });
          if (scaffoldResourceVisibility) {
              (s.anchors || []).forEach(r => {
                  if (!r.generated) {
                      r._parent = s;
                  }
              });
              (s.wires || []).forEach(r => {
                  if (!r.generated) {
                      r._parent = s;
                  }
              });
              (s.regions || []).forEach(r => {
                  if (!r.generated) {
                      r._parent = s;
                  }
              });
          }
      }
  });
}