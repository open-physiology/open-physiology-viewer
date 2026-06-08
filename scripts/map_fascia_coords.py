import csv
import json

def map_range(value, min_val, max_val, target_min, target_max):
    if max_val == min_val:
        return (target_min + target_max) / 2
    return target_min + (float(value) - min_val) * (target_max - target_min) / (max_val - min_val)

def main():
    csv_path = 'test/scaffolds/fascia-model-coords.csv'
    output_path = 'test/scaffolds/fascia-model-mapped.json'
    
    anchors_dict = {}
    wires = []
    
    all_x = []
    all_y = []
    all_z = []
    
    rows = []
    with open(csv_path, mode='r') as f:
        # Use csv.reader instead of DictReader to handle unnamed columns for curve path
        reader = csv.reader(f)
        header = next(reader)
        # Find index of "Edge curve path sequence"
        try:
            curve_path_start_idx = header.index("Edge curve path sequence")
        except ValueError:
            curve_path_start_idx = len(header)

        for row_vals in reader:
            # Map row to a dictionary for easier access to named columns
            row = dict(zip(header, row_vals))
            
            # Extract intermediate path
            curve_path = []
            raw_curve_vals = row_vals[curve_path_start_idx:]
            # Filter out empty values and convert to floats in triplets
            clean_curve_vals = [float(v) for v in raw_curve_vals if v.strip()]
            for i in range(0, len(clean_curve_vals), 3):
                if i + 2 < len(clean_curve_vals):
                    p = {
                        "x": clean_curve_vals[i],
                        "y": clean_curve_vals[i+1],
                        "z": clean_curve_vals[i+2]
                    }
                    curve_path.append(p)
                    all_x.append(p["x"])
                    all_y.append(p["y"])
                    all_z.append(p["z"])

            row['_curve_path'] = curve_path
            rows.append(row)
            all_x.extend([float(row['x1']), float(row['x2'])])
            all_y.extend([float(row['y1']), float(row['y2'])])
            all_z.extend([float(row['z1']), float(row['z2'])])
            
    if not all_x:
        print("No data found in CSV.")
        return

    min_x, max_x = min(all_x), max(all_x)
    min_y, max_y = min(all_y), max(all_y)
    min_z, max_z = min(all_z), max(all_z)
    
    target_min, target_max = -100, 100
    
    # First pass: collect all unique anchors and map their coordinates
    for row in rows:
        # Anchor 1
        id1 = f"a_{row['NodeIndex1']}"
        if id1 not in anchors_dict:
            anchors_dict[id1] = {
                "id": id1,
                "name": row['NodeLabel1'],
                "layout": {
                    "x": map_range(row['x1'], min_x, max_x, target_min, target_max),
                    "y": map_range(row['y1'], min_y, max_y, target_min, target_max),
                    "z": map_range(row['z1'], min_z, max_z, target_min, target_max)
                }
            }
        
        # Anchor 2
        id2 = f"a_{row['NodeIndex2']}"
        if id2 not in anchors_dict:
            anchors_dict[id2] = {
                "id": id2,
                "name": row['NodeLabel2'],
                "layout": {
                    "x": map_range(row['x2'], min_x, max_x, target_min, target_max),
                    "y": map_range(row['y2'], min_y, max_y, target_min, target_max),
                    "z": map_range(row['z2'], min_z, max_z, target_min, target_max)
                }
            }
            
        # Map curve path
        mapped_path = []
        for p in row['_curve_path']:
            mapped_path.append({
                "x": map_range(p['x'], min_x, max_x, target_min, target_max),
                "y": map_range(p['y'], min_y, max_y, target_min, target_max),
                "z": map_range(p['z'], min_z, max_z, target_min, target_max)
            })

        # Wire
        wire = {
            "id": f"w_{row['EdgeIndex']}",
            "source": id1,
            "target": id2
        }
        if mapped_path:
            wire["path"] = mapped_path
        wires.append(wire)
        
    result = {
        "anchors": list(anchors_dict.values()),
        "wires": wires
    }
    
    with open(output_path, 'w') as f:
        json.dump(result, f, indent=4)
    
    print(f"Mapped graph saved to {output_path}")

if __name__ == "__main__":
    main()
