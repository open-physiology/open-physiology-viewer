import csv
import json
import os

def add_externals():
    """
    Adds external resources from scripts/data/output/torso_images.
    """
    torso_images_path = os.path.join('scripts', 'data', 'output', 'torso_images')
    externals = []
    if os.path.exists(torso_images_path):
        for filename in sorted(os.listdir(torso_images_path)):
            if filename.endswith(".png"):
                image_id = filename.split(".")[0]
                externals.append({
                    "id": image_id,
                    "name": filename,
                    "path": filename,
                    "type": "image"
                })
    return externals

def create_fascia_scaffold():
    input_nodes_path = os.path.join('scripts', 'data', 'input', 'fascia_nodes_v1.csv')
    input_edges_path = os.path.join('scripts', 'data', 'input', 'fascia_edges_v1.csv')
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
    image_ids = [ext["id"] for ext in externals]
    # Reverse the image order: first component to the last image
    image_ids.reverse()

    for i, z_val in enumerate(sorted_z):
        group = z_groups[z_val]
        if group['anchors'] or group['wires']:
            comp = {
                "id": f"comp_{z_val}",
                "name": f"Component at z={z_val}",
                "anchors": group['anchors'],
                "wires": group['wires']
            }
            # Match background image based on reversed index
            if i < len(image_ids):
                comp["background"] = image_ids[i]
            components.append(comp)

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

    os.path.join('scripts', 'data', 'output', 'fascia_scaffold.json')
    
if __name__ == "__main__":
    create_fascia_scaffold()
