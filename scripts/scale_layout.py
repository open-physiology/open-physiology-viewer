import json
import os

def scale_value(val, min_val, max_val, target_min, target_max):
    if max_val == min_val:
        return (target_min + target_max) / 2
    return target_min + (val - min_val) * (target_max - target_min) / (max_val - min_val)

def main():
    file_path = os.path.join('scripts', 'data', 'output', 'fascia_scaffold.json')
    file_path_out = os.path.join('scripts', 'data', 'output', 'fascia_scaffold_scaled.json')
    
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    anchors = data.get('anchors', [])
    if not anchors:
        print("No anchors found.")
        return

    x_values = [anchor['layout']['x'] for anchor in anchors if 'layout' in anchor and 'x' in anchor['layout']]
    y_values = [anchor['layout']['y'] for anchor in anchors if 'layout' in anchor and 'y' in anchor['layout']]
    z_values = [anchor['layout']['z'] for anchor in anchors if 'layout' in anchor and 'z' in anchor['layout']]

    if not x_values or not y_values:
        print("No layout coordinates found.")
        return

    min_x, max_x = min(x_values), max(x_values)
    min_y, max_y = min(y_values), max(y_values)
    min_z = min(z_values) if z_values else 0

    print(f"Current X range: [{min_x}, {max_x}]")
    print(f"Current Y range: [{min_y}, {max_y}]")
    print(f"Current min Z: {min_z}")

    target_min, target_max = -100, 100

    for anchor in anchors:
        if 'layout' in anchor:
            if 'x' in anchor['layout']:
                anchor['layout']['x'] = scale_value(anchor['layout']['x'], min_x, max_x, target_min, target_max)
            if 'y' in anchor['layout']:
                anchor['layout']['y'] = scale_value(anchor['layout']['y'], min_y, max_y, target_min, target_max)
            if 'z' in anchor['layout']:
                anchor['layout']['z'] = anchor['layout']['z'] - min_z

    with open(file_path_out, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"Successfully scaled coordinates to [{target_min}, {target_max}] and saved to {file_path_out}")

if __name__ == "__main__":
    main()
