import json

def copy_stratifications(source_path, target_path):
    # Load source data
    with open(source_path, 'r') as f:
        source_data = json.load(f)
    
    stratifications = source_data.get('stratifications', [])
    
    # Process stratifications to remove 'subtypes' and 'axisWires'
    processed_stratifications = []
    for st in stratifications:
        new_st = st.copy()
        new_st.pop('subtypes', None)
        new_st.pop('axisWires', None)
        processed_stratifications.append(new_st)
    
    # Load target data
    with open(target_path, 'r') as f:
        target_data = json.load(f)
    
    # Add processed stratifications to target data
    target_data['stratifications'] = processed_stratifications
    
    # Save updated target data
    with open(target_path, 'w') as f:
        json.dump(target_data, f, indent=4)
    
    print(f"Successfully copied {len(processed_stratifications)} stratifications to {target_path}")

if __name__ == "__main__":
    source_file = "test/scaffolds/fascia-model.json"
    target_file = "test/scaffolds/fascia-model-paths.json"
    copy_stratifications(source_file, target_file)
