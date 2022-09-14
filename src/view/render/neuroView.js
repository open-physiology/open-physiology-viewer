export function neuroViewUpdateLayout(scaffoldComponents, group) {
    let scaffoldResourceNames = ["renderedComponents", "renderedWires", "renderedRegions", "renderedAnchors"];
        (scaffoldComponents||[]).forEach(s => {
             //Only include wires from the scaffold, no components
             if (s.class === $SchemaClass.Scaffold && !s.hidden) {
                 (s.components || []).forEach(r => {
                    r._parent = s;
                    r._visible = false;
                 });
                 if (this.scaffoldResourceVisibility) {
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