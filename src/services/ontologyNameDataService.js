import { pick, assign } from 'lodash-bound';

export class OntologyNameDataService {
    _ontologyNames;

    constructor(graphData){
      console.log("graphData: ", graphData);
      this._ontologyNames = this.traverse_whole_graph_for_names(graphData);

      console.log("this.ontologyNames: ", this.ontologyNames);
    }


    traverse_whole_graph_for_names( graphData ){
      // first level graph names
      let firstLevelGraphNames = graphData._allLinks.filter(link => (link.name!=undefined && link.name!=null && link.name!=""))
        .map(function (item){
          return assign(item::pick('id', 'name', 'external'));
        });

      firstLevelGraphNames = []; // Excluding these for the time being -- there are duplicates and don't have FMA:IDs

      let conveyingLyphs = graphData._allLinks.filter(link => (link.conveyingLyph!=undefined)).filter(link => (link.conveyingLyph.name!=undefined && link.conveyingLyph.name!=null && link.conveyingLyph.name!=""))
        .map(function (item){ return item.conveyingLyph; });

      let secondLevelGraphNames = conveyingLyphs.filter(item => item.name)
        .map(function (item){
            return assign(item::pick('id', 'name', 'external'));
        });


      let thirdLevelInternalLyphs = [].concat.apply([],conveyingLyphs.filter(lyph => (lyph.layers != undefined)).map(function (i){ return i.layers}));

      let thirdLevelGraphNames = thirdLevelInternalLyphs.filter(item => item.name)
        .map(function (item){
            return assign(item::pick('id', 'name', 'external'));
        });

      return firstLevelGraphNames.concat( secondLevelGraphNames ).concat( thirdLevelGraphNames );
    }

    loadOntologyNamesFromJSON(){

      this.ontologyNames = ontologyNames;
    }

}
