import BG from './data/respiratoryControl.json';
import FileSaver from 'file-saver';

/**
 * Converter for the respiratory model input (fixes input model)
 */
export function fixRespiratoryControl(){
    let counter = 1;
    BG.groups.filter(e => e.group).forEach(e => {
        //TODO fix bug with nested groups
        delete e.group;
    });
    BG.nodes.forEach(e => {
        e.id = e.id.toString();
        if (e.group) {
            let g = BG.groups.find(g => g.id == e.group.toString());
            if (!g.nodes) {g.nodes = []; }
            g.nodes.push(e.id);
            delete e.group;
        }
    });
    BG.links.forEach(e => {
        e.id = "lnk" + counter++;
        e.source = e.source.toString();
        e.target = e.target.toString();
        BG.groups.filter(g => g.nodes).forEach(g => {
            if (g.nodes.includes(e.source) && g.nodes.includes(e.target)){
                if (!g.links) {g.links = [];}
                g.links.push(e.id);
            }
        })
    });

    BG.groups.forEach(e => { e.id = "g"+e.id; });

    let result = JSON.stringify(BG, null, 4);
    const blob = new Blob([result], {type: 'text/plain;charset=utf-8'});
    FileSaver.saveAs(blob, 'respiratoryControl.json');
}
