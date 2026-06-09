import json
import os
import sys

def flip_z_coordinates(file_path):
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} not found.")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    anchors = data.get('anchors', [])
    if not anchors:
        print("No anchors found in the file.")
    else:
        # Find min and max Z to perform flipping
        z_values = []
        for a in anchors:
            layout = a.get('layout')
            if layout and 'z' in layout:
                z_values.append(layout['z'])
        
        if not z_values:
            print("No Z coordinates found in anchors.")
        else:
            min_z = min(z_values)
            max_z = max(z_values)
            print(f"Z range: [{min_z}, {max_z}]")
            
            # Flip Z for anchors
            for a in anchors:
                layout = a.get('layout')
                if layout and 'z' in layout:
                    layout['z'] = max_z + min_z - layout['z']
            print(f"Flipped Z coordinates for {len(z_values)} anchors.")

    # Also check for anchors inside components if any (though usually they are references)
    # The requirement also says "the order of the the components should also be inverted"
    components = data.get('components', [])
    if components:
        data['components'] = components[::-1]
        print(f"Inverted order of {len(components)} components.")
    else:
        print("No components found to invert.")

    # Also flip Z for wire path points
    wires = data.get('wires', [])
    if wires:
        flipped_wire_paths = 0
        for w in wires:
            path = w.get('path')
            if path and isinstance(path, list):
                for point in path:
                    if isinstance(point, dict) and 'z' in point:
                        point['z'] = max_z + min_z - point['z']
                flipped_wire_paths += 1
        print(f"Flipped Z coordinates for paths of {flipped_wire_paths} wires.")

    # Some files might have 'scaffolds' which contain components and wires
    scaffolds = data.get('scaffolds', [])
    for scaffold in scaffolds:
        s_components = scaffold.get('components', [])
        if s_components:
            scaffold['components'] = s_components[::-1]
            print(f"Inverted order of {len(s_components)} components in scaffold {scaffold.get('id', 'unknown')}.")
        
        s_wires = scaffold.get('wires', [])
        if s_wires:
            flipped_s_wire_paths = 0
            for w in s_wires:
                path = w.get('path')
                if path and isinstance(path, list):
                    for point in path:
                        if isinstance(point, dict) and 'z' in point:
                            point['z'] = max_z + min_z - point['z']
                    flipped_s_wire_paths += 1
            print(f"Flipped Z coordinates for paths of {flipped_s_wire_paths} wires in scaffold {scaffold.get('id', 'unknown')}.")

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)
    print(f"Saved changes to {file_path}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        target_file = sys.argv[1]
    else:
        target_file = 'test/scaffolds/fascia-model-paths.json'
    flip_z_coordinates(target_file)
