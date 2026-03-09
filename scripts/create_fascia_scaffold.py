import csv
import json
import os

def add_externals():
    """
    Adds external resources from scripts/data/output/3DSFiducial.
    """
    fiducial_images_path = os.path.join('scripts', 'data', 'output', '3DSFiducial')
    externals = []
    if os.path.exists(fiducial_images_path):
        for filename in sorted(os.listdir(fiducial_images_path)):
            if filename.endswith(".png"):
                image_id = filename.split(".")[0]
                # Extract z-coordinate from filename, e.g., "-25mm_mT7-T8.png" -> -25.0
                try:
                    z_str = filename.split("mm")[0]
                    z_val = float(z_str)
                except (ValueError, IndexError):
                    z_val = None

                externals.append({
                    "id": image_id,
                    "name": filename,
                    "path": filename,
                    "type": "image",
                    "z": z_val
                })
    return externals

def create_fascia_scaffold(input_nodes_path=None, output_path=None):
    if not input_nodes_path:
        input_nodes_path = os.path.join('scripts', 'data', 'input', 'fascia_nodes.csv')
    input_edges_path = os.path.join('scripts', 'data', 'input', 'fascia_edges.csv')
    if not output_path:
        output_path = os.path.join('scripts', 'data', 'output', 'fascia_scaffold.json')

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    anchors = []
    wires = []
    anchor_z_map = {}
    z_groups = {} # z_coord -> {'anchors': [], 'wires': []}

    # Read nodes
    if os.path.exists(input_nodes_path):
        with open(input_nodes_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                z_coord = float(row['z'])
                anchor_id = row['id']
                anchor = {
                    "id": anchor_id,
                    "name": row['name'],
                    "layout": {
                        "x": float(row['x']),
                        "y": float(row['y']),
                        "z": z_coord
                    }
                }
                anchors.append(anchor)
                anchor_z_map[anchor_id] = z_coord
                
                if z_coord not in z_groups:
                    z_groups[z_coord] = {'anchors': [], 'wires': []}
                z_groups[z_coord]['anchors'].append(anchor_id)
    else:
        print(f"Warning: Node file not found at {input_nodes_path}")

    # Read edges
    if os.path.exists(input_edges_path):
        with open(input_edges_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                source_id = row['source']
                target_id = row['target']
                wire_id = "w_" + row['id']
                
                wire = {
                    "id": wire_id,
                    "source": source_id,
                    "target": target_id
                }
                wires.append(wire)
                
                # Check if source and target have the same z coordinate
                source_z = anchor_z_map.get(source_id)
                target_z = anchor_z_map.get(target_id)
                
                if source_z is not None and target_z is not None and source_z == target_z:
                    if source_z not in z_groups:
                        z_groups[source_z] = {'anchors': [], 'wires': []}
                    z_groups[source_z]['wires'].append(wire_id)
    else:
        print(f"Warning: Edge file not found at {input_edges_path}")

    components = []
    # Identify unique z values and their corresponding background images
    sorted_z = sorted(z_groups.keys())
    
    externals = add_externals()

    for i, z_val in enumerate(sorted_z):
        group = z_groups[z_val]
        if group['anchors'] or group['wires']:
            comp = {
                "id": f"comp_{z_val}",
                "name": f"Component at z={z_val}",
                "anchors": group['anchors'],
                "wires": group['wires']
            }
            # Match background image based on z-coordinate
            for ext in externals:
                if ext.get("z") == z_val:
                    comp["background"] = ext["id"]
                    break
            components.append(comp)

    # Clean up z coordinate from externals before saving
    for ext in externals:
        if "z" in ext:
            del ext["z"]

    scaffold_data = {
        "anchors": anchors,
        "wires": wires,
        "components": components
    }

    if externals:
        scaffold_data["external"] = externals

    with open(output_path, mode='w', encoding='utf-8') as f:
        json.dump(scaffold_data, f, indent=2)

    print(f"Successfully created {output_path}")
    print(f"Anchors: {len(anchors)}")
    print(f"Wires: {len(wires)}")
    print(f"Original Components: {len(components)}")

if __name__ == "__main__":
    # Process both fascia_nodes_1.csv and fascia_nodes_2.csv
    nodes_files = ['fascia_nodes_1.csv', 'fascia_nodes_2.csv']
    for nodes_file in nodes_files:
        input_path = os.path.join('scripts', 'data', 'input', nodes_file)
        output_filename = nodes_file.replace('.csv', '_scaffold.json')
        output_path = os.path.join('scripts', 'data', 'output', output_filename)
        create_fascia_scaffold(input_path, output_path)
