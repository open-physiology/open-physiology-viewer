import json
import os

def process_scaffold(file_path, file_path_out):
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return

    with open(file_path, 'r') as f:
        data = json.load(f)
    
    anchors = data.get('anchors', [])
    if not anchors:
        print(f"No anchors found in {file_path}.")
        return

    x_values = [anchor['layout']['x'] for anchor in anchors if 'layout' in anchor and 'x' in anchor['layout']]
    y_values = [anchor['layout']['y'] for anchor in anchors if 'layout' in anchor and 'y' in anchor['layout']]
    z_values = [anchor['layout']['z'] for anchor in anchors if 'layout' in anchor and 'z' in anchor['layout']]

    if not x_values or not y_values:
        print(f"No layout coordinates found in {file_path}.")
        return

    min_x, max_x = min(x_values), max(x_values)
    min_y, max_y = min(y_values), max(y_values)
    min_z = min(z_values) if z_values else 0

    range_x = max_x - min_x
    range_y = max_y - min_y
    max_range = max(range_x, range_y)

    print(f"File: {file_path}")
    print(f"Current X range: [{min_x}, {max_x}], diff: {range_x}")
    print(f"Current Y range: [{min_y}, {max_y}], diff: {range_y}")
    print(f"Current min Z: {min_z}")

    target_min, target_max = -100, 100
    target_range = target_max - target_min

    # Center offsets to keep the layout centered in the target range
    offset_x = (target_range - (range_x * target_range / max_range)) / 2 if max_range > 0 else 0
    offset_y = (target_range - (range_y * target_range / max_range)) / 2 if max_range > 0 else 0

    for anchor in anchors:
        if 'layout' in anchor:
            if 'x' in anchor['layout']:
                if max_range > 0:
                    anchor['layout']['x'] = target_min + offset_x + (anchor['layout']['x'] - min_x) * target_range / max_range
                else:
                    anchor['layout']['x'] = (target_min + target_max) / 2
            if 'y' in anchor['layout']:
                if max_range > 0:
                    anchor['layout']['y'] = target_min + offset_y + (anchor['layout']['y'] - min_y) * target_range / max_range
                else:
                    anchor['layout']['y'] = (target_min + target_max) / 2
            if 'z' in anchor['layout']:
                anchor['layout']['z'] = anchor['layout']['z'] - min_z

    with open(file_path_out, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"Successfully scaled coordinates to [{target_min}, {target_max}] and saved to {file_path_out}")
    print("-" * 20)

def main():
    output_dir = os.path.join('scripts', 'data', 'output')
    scaffold_files = ['fascia_nodes_1_scaffold.json', 'fascia_nodes_2_scaffold.json']

    for filename in scaffold_files:
        file_path = os.path.join(output_dir, filename)
        file_path_out = os.path.join(output_dir, filename.replace('.json', '_scaled.json'))
        process_scaffold(file_path, file_path_out)

if __name__ == "__main__":
    main()
