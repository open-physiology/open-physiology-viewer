import json
import os

def process_fascia_model(input_path, output_path):
    with open(input_path, 'r') as f:
        data = json.load(f)

    anchors = data.get('anchors', [])
    wires = data.get('wires', [])

    # Map anchor ID to its z coordinate
    anchor_z_map = {}
    for a in anchors:
        z = a.get('layout', {}).get('z')
        if z is not None:
            anchor_z_map[a['id']] = z

    # Group anchors by z
    z_to_anchors = {}
    for a in anchors:
        z = a.get('layout', {}).get('z')
        if z is not None:
            if z not in z_to_anchors:
                z_to_anchors[z] = []
            z_to_anchors[z].append(a['id'])

    # Group wires by z (based on source anchor's z)
    z_to_wires = {}
    for w in wires:
        source_id = w.get('source')
        if source_id in anchor_z_map:
            z = anchor_z_map[source_id]
            if z not in z_to_wires:
                z_to_wires[z] = []
            z_to_wires[z].append(w['id'])

    # Create components
    components = []
    # Sort z coordinates to have a deterministic order
    unique_zs = sorted(z_to_anchors.keys())
    
    for z in unique_zs:
        comp_id = f"comp_{z}"
        comp = {
            "id": comp_id,
            "name": f"Component at z={z}",
            "anchors": z_to_anchors.get(z, []),
            "wires": z_to_wires.get(z, [])
        }
        components.append(comp)

    data['components'] = components

    with open(output_path, 'w') as f:
        json.dump(data, f, indent=4)
    
    return len(unique_zs)

if __name__ == "__main__":
    input_file = "test/scaffolds/fascia-model-mapped.json"
    output_file = "test/scaffolds/fascia-model-mapped.json" # Overwriting as requested/implied
    num_components = process_fascia_model(input_file, output_file)
    print(f"Successfully updated {output_file} with {num_components} components.")
