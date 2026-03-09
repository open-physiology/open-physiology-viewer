import pandas as pd
import os

def main():
    # Define file paths
    input_dir = os.path.join('scripts', 'data', 'input')
    nodes_0_file = os.path.join(input_dir, 'fascia_nodes_0.csv')
    mapping_file = os.path.join(input_dir, 'fascia_nodes_mapping.csv')
    
    # Load data
    if not os.path.exists(nodes_0_file):
        print(f"Error: {nodes_0_file} not found.")
        return
    if not os.path.exists(mapping_file):
        print(f"Error: {mapping_file} not found.")
        return

    df_nodes_0 = pd.read_csv(nodes_0_file)
    df_mapping = pd.read_csv(mapping_file)
    

    # Merge datasets based on id and name
    # Both dataframes have 'id' and 'name'
    df_merged = pd.merge(df_nodes_0, df_mapping, on=['id', 'name'], how='left', suffixes=('', '_mapping'))
    
    # Create fascia_nodes_1.csv: Replace (x,y) with (x1, y1)
    df_nodes_1 = df_merged[['id', 'name', 'x1', 'y1']].copy()
    df_nodes_1.rename(columns={'x1': 'x', 'y1': 'y'}, inplace=True)
    df_nodes_1.to_csv(os.path.join(input_dir, 'fascia_nodes_1.csv'), index=False)
    print(f"Created fascia_nodes_1.csv in {input_dir}")
    
    # Create fascia_nodes_2.csv: Replace (x,y) with (x2, y2) and add z0
    df_nodes_2 = df_merged[['id', 'name', 'x2', 'y2']].copy()
    df_nodes_2.rename(columns={'x2': 'x', 'y2': 'y'}, inplace=True)
    df_nodes_2.to_csv(os.path.join(input_dir, 'fascia_nodes_2.csv'), index=False)
    print(f"Created fascia_nodes_2.csv in {input_dir}")

if __name__ == "__main__":
    main()
