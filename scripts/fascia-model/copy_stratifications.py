import json

def copy_stratifications(source_path, target_path):
    # Load source data
    with open(source_path, 'r') as f:
        source_data = json.load(f)
    
    # Load target data
    with open(target_path, 'r') as f:
        target_data = json.load(f)

    # 1. Transfer general stratifications (existing logic preserved but updated)
    stratifications = source_data.get('stratifications', [])
    processed_stratifications = []
    for st in stratifications:
        new_st = st.copy()
        new_st.pop('subtypes', None)
        new_st.pop('axisWires', None)
        processed_stratifications.append(new_st)
    target_data['stratifications'] = processed_stratifications

    # 2. Transfer "stratification" property of wires matching by source and target
    source_wires = source_data.get('wires', [])
    target_wires = target_data.get('wires', [])

    # Map from (source, target) -> stratification
    strat_map = {}
    for w in source_wires:
        s = w.get('source')
        t = w.get('target')
        strat = w.get('stratification')
        if s and t and strat:
            # Try both directions
            strat_map[(s, t)] = strat
            strat_map[(t, s)] = strat

    # Apply to target wires and track skipped candidates
    applied_keys = set()
    skipped_candidates = {} # strat -> list of (source, target)

    for w in target_wires:
        s = w.get('source')
        t = w.get('target')
        if not s or not t:
            continue
        
        key = (s, t)
        rev_key = (t, s)
        
        # Determine if we have a match
        match_key = None
        if key in strat_map:
            match_key = key
        elif rev_key in strat_map:
            match_key = rev_key

        if match_key:
            strat = strat_map[match_key]
            # Use canonical key (sorted tuple) to track if this pair of ends already got a stratification
            canonical_key = tuple(sorted([s, t]))
            if canonical_key not in applied_keys:
                w['stratification'] = strat
                applied_keys.add(canonical_key)
            else:
                if strat not in skipped_candidates:
                    skipped_candidates[strat] = []
                skipped_candidates[strat].append(f"{s}->{t}")

    # Save updated target data
    with open(target_path, 'w') as f:
        json.dump(target_data, f, indent=4)
    
    print(f"Successfully copied {len(processed_stratifications)} stratifications to {target_path}")
    print(f"Applied stratification to {len(applied_keys)} wires.")
    
    if skipped_candidates:
        print("\nSkipped candidates for stratifications:")
        for strat, candidates in skipped_candidates.items():
            print(f"  {strat}: {', '.join(candidates)}")

if __name__ == "__main__":
    source_file = "test/scaffolds/fascia-model.json"
    target_file = "test/scaffolds/fascia-model-paths.json"
    copy_stratifications(source_file, target_file)
