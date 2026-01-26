import csv
import json
import os

def create_filtered_scaffold(anchors, wires, components, output_path):
    """
    Creates a filtered version of the scaffold by leaving the first 3 components
    and placing all other wires and anchors to a "Default" component.
    """
    first_3_components = components[:3]
    other_components = components[3:]
    
    default_anchors = set()
    default_wires = set()
    
    # Track which anchors/wires are already in the first 3 components
    first_3_anchors = set()
    first_3_wires = set()
    for comp in first_3_components:
        first_3_anchors.update(comp['anchors'])
        first_3_wires.update(comp['wires'])
    
    # All anchors and wires from "other" components go to Default
    for comp in other_components:
        default_anchors.update(comp['anchors'])
        default_wires.update(comp['wires'])
    
    # Also include any anchors/wires that might not have been in any component
    all_anchor_ids = {a['id'] for a in anchors}
    all_wire_ids = {w['id'] for w in wires}
    
    default_anchors.update(all_anchor_ids - first_3_anchors)
    default_wires.update(all_wire_ids - first_3_wires)

    filtered_components = list(first_3_components)
    if default_anchors or default_wires:
        filtered_components.append({
            "id": "comp_default",
            "name": "Default",
            "anchors": sorted(list(default_anchors)),
            "wires": sorted(list(default_wires))
        })
    
    filtered_scaffold_data = {
        "anchors": anchors,
        "wires": wires,
        "components": filtered_components
    }

    with open(output_path, mode='w', encoding='utf-8') as f:
        json.dump(filtered_scaffold_data, f, indent=2)

    print(f"Successfully created {output_path}")
    print(f"Filtered Components: {len(filtered_components)}")

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
    for z_val in sorted(z_groups.keys()):
        group = z_groups[z_val]
        if group['anchors'] or group['wires']:
            components.append({
                "id": f"comp_{z_val}",
                "name": f"Component at z={z_val}",
                "anchors": group['anchors'],
                "wires": group['wires']
            })

    scaffold_data = {
        "anchors": anchors,
        "wires": wires,
        "components": components
    }

    with open(output_path, mode='w', encoding='utf-8') as f:
        json.dump(scaffold_data, f, indent=2)

    print(f"Successfully created {output_path}")
    print(f"Anchors: {len(anchors)}")
    print(f"Wires: {len(wires)}")
    print(f"Original Components: {len(components)}")

    # Create filtered version
    filtered_output_path = os.path.join('scripts', 'data', 'output', 'fascia_scaffold_filtered.json')
    create_filtered_scaffold(anchors, wires, components, filtered_output_path)

if __name__ == "__main__":
    create_fascia_scaffold()
