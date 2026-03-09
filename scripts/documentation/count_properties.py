import json
import os
import matplotlib.pyplot as plt

def count_properties(schema_path, show_plot=True):
    if not os.path.exists(schema_path):
        print(f"Error: File {schema_path} not found.")
        return

    with open(schema_path, 'r', encoding='utf-8') as f:
        schema = json.load(f)

    definitions = schema.get('definitions', {})
    
    results = []

    memo = {}

    def get_effective_properties(class_name):
        if class_name in memo:
            return memo[class_name]
        
        definition = definitions.get(class_name, {})
        effective_props = set(definition.get('properties', {}).keys())
        
        if 'allOf' in definition:
            for item in definition['allOf']:
                if 'properties' in item:
                    effective_props.update(item['properties'].keys())
                if '$ref' in item:
                    ref = item['$ref']
                    if ref.startswith('#/definitions/'):
                        ref_class = ref.split('/')[-1]
                        effective_props.update(get_effective_properties(ref_class))
        
        memo[class_name] = effective_props
        return effective_props

    for class_name, definition in definitions.items():
        if definition.get('type') != 'object' and 'properties' not in definition and 'allOf' not in definition:
            continue

        total_props = get_effective_properties(class_name)
        results.append((class_name, len(total_props)))

    # Sort by property count (descending)
    results.sort(key=lambda x: x[1], reverse=True)

    # Calculate total unique properties across all classes
    all_unique_props = set()
    for class_name in memo:
        all_unique_props.update(memo[class_name])

    print(f"{'Class Name':<30} | {'Property Count':<15}")
    print("-" * 50)
    for class_name, count in results:
        print(f"{class_name:<30} | {count:<15}")
    
    print("-" * 50)
    print(f"{'TOTAL UNIQUE PROPERTIES':<30} | {len(all_unique_props):<15}")

    if show_plot:
        draw_plot(results)

def draw_plot(results):
    if not results:
        return
    
    class_names, counts = zip(*results)
    
    # 60% shorter than previous (12, 8) -> 8 * 0.4 = 3.2
    plt.figure(figsize=(12, 3.2))
    plt.bar(class_names, counts, color='skyblue')
    plt.ylabel('Number of Properties')
    plt.xlabel('Class Name')
    plt.title('Number of Properties per Class (including inheritance)')
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    
    output_plot = os.path.join('scripts', 'property_counts.png')
    plt.savefig(output_plot)
    print(f"\nBar plot saved to {output_plot}")
    # plt.show() # Disabled for non-interactive environments

if __name__ == "__main__":
    schema_file = os.path.join('src', 'model', 'graphScheme.json')
    count_properties(schema_file)
