
import json
import pandas as pd

try:
    with open('testdata/newtest.json', 'r') as f:
        data = json.load(f)
    
    # Filter out empty/noResults
    data = [d for d in data if d.get('id')]
    
    print(f"Total valid records: {len(data)}")
    
    # Get all keys
    all_keys = set()
    for d in data:
        all_keys.update(d.keys())
        
    print("\nTop-level keys:")
    for k in sorted(all_keys):
        print(f"- {k}")
        
    # Check for retweet/reply indicators inside fields or keys
    print("\nChecking for potential edge indicators:")
    sample = data[0] if data else {}
    if 'legacy' in sample: # Sometimes Twitter data is in 'legacy' object
        print("Found 'legacy' key, checking inside:")
        print(sample['legacy'].keys())
        
except Exception as e:
    print(e)
