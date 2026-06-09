import json
import os

def complete_stratified_regions(file_path):
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} not found.")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    wires = data.get('wires', [])
    stratifications = data.get('stratifications', [])

    # Map to collect subtypes and axisWires for each stratification
    # stratification_id -> { 'subtypes': [ids], 'axisWires': [ids] }
    strat_data = {}

    updated_wires_count = 0
    for wire in wires:
        strat_id = wire.get('stratification')
        wire_id = wire.get('id')
        
        if strat_id and wire_id:
            stratified_region_id = f"{wire_id}_{strat_id}"
            wire['stratifiedRegion'] = stratified_region_id
            
            if strat_id not in strat_data:
                strat_data[strat_id] = {'subtypes': [], 'axisWires': []}
            strat_data[strat_id]['subtypes'].append(stratified_region_id)
            strat_data[strat_id]['axisWires'].append(wire_id)
            updated_wires_count += 1

    # Update stratifications with subtypes and axisWires
    updated_strat_count = 0
    for strat in stratifications:
        sid = strat.get('id')
        if sid in strat_data:
            strat['subtypes'] = strat_data[sid]['subtypes']
            strat['axisWires'] = strat_data[sid]['axisWires']
            updated_strat_count += 1
        else:
            if 'subtypes' not in strat:
                strat['subtypes'] = []
            if 'axisWires' not in strat:
                strat['axisWires'] = []

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)

    print(f"Updated {updated_wires_count} wires with stratifiedRegion.")
    print(f"Updated {updated_strat_count} stratification definitions with subtypes.")
    print(f"Saved changes to {file_path}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        target_file = sys.argv[1]
    else:
        target_file = 'test/scaffolds/fascia-model-paths.json'
    complete_stratified_regions(target_file)
