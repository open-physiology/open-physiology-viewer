import json

def sort_key(item):
    # IDs are like 'a_1', 'a_10', 'w_1', 'w_10'
    # We want to sort them numerically if possible
    parts = item['id'].split('_')
    if len(parts) == 2 and parts[1].isdigit():
        return (parts[0], int(parts[1]))
    return (item['id'],)

def refine_json():
    input_path = 'test/scaffolds/fascia-model-mapped.json'
    output_path = 'test/scaffolds/fascia-model-mapped.json'
    
    with open(input_path, 'r') as f:
        data = json.load(f)
    
    # Sort anchors by id
    if 'anchors' in data:
        data['anchors'].sort(key=sort_key)
        
    # Sort wires by id and add "geometry": "path" if path exist
    if 'wires' in data:
        data['wires'].sort(key=sort_key)
        for wire in data['wires']:
            if 'path' in wire and len(wire['path']) > 0:
                wire['geometry'] = 'path'
            # Reorder keys to put geometry before path or after id
            new_wire = {}
            for key in ['id', 'source', 'target', 'geometry', 'path']:
                if key in wire:
                    new_wire[key] = wire[key]
            # Add any other keys that might be there
            for key in wire:
                if key not in new_wire:
                    new_wire[key] = wire[key]
            wire.clear()
            wire.update(new_wire)
                
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=4)
    
    print(f"Refined JSON saved to {output_path}")

if __name__ == "__main__":
    refine_json()
