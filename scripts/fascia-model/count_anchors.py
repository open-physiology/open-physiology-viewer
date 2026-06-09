import json

file_model = 'test/scaffolds/fascia-model.json'
file_paths = 'test/scaffolds/fascia-model-paths.json'

def load_anchors(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        anchors = data.get('anchors', [])
        if not isinstance(anchors, list):
            print(f"Warning: 'anchors' in {file_path} is not a list.")
            return []
        return anchors
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return []

def main():
    anchors_model = load_anchors(file_model)
    anchors_paths = load_anchors(file_paths)

    print(f"Number of anchors in fascia-model: {len(anchors_model)}")
    print(f"Number of anchors in fascia-model-paths: {len(anchors_paths)}")

    # Create maps for easier lookup: name -> id
    model_map = {a.get('name'): a.get('id') for a in anchors_model if 'name' in a}
    paths_map = {a.get('name'): a.get('id') for a in anchors_paths if 'name' in a}

    # 1. Anchors in fascia-model NOT in fascia-model-paths by name
    missing_in_paths = [name for name in model_map if name not in paths_map]
    
    print(f"\nAnchors in fascia-model missing in fascia-model-paths (by name) [{len(missing_in_paths)}]:")
    for name in sorted(missing_in_paths):
        print(f"  - {name} (id: {model_map[name]})")

    # 2. Pairs with same names but different ids
    diff_ids = []
    for name, model_id in model_map.items():
        if name in paths_map:
            paths_id = paths_map[name]
            if model_id != paths_id:
                diff_ids.append((name, model_id, paths_id))

    print(f"\nAnchors with same name but different ids [{len(diff_ids)}]:")
    if diff_ids:
        print(f"{'Name':<30} | {'Model ID':<15} | {'Paths ID':<15}")
        print("-" * 66)
        for name, mid, pid in sorted(diff_ids):
            print(f"{name:<30} | {mid:<15} | {pid:<15}")
    else:
        print("  None")

if __name__ == "__main__":
    main()
