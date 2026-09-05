import urllib.request
import json
import os
import sys

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

# 1. Fetch some real Argo profiles from NOAA ERDDAP
# We limit to a very specific box in the Indian Ocean, and only grab a few profiles
ARGO_URL = "https://coastwatch.pfeg.noaa.gov/erddap/tabledap/argoFloats.json?platform_number%2Ctime%2Clatitude%2Clongitude%2Cpres%2Ctemp%2Cpsal&time%3E=2024-01-01T00%3A00%3A00Z&time%3C=2024-01-07T00%3A00%3A00Z&latitude%3E=5.0&latitude%3C=25.0&longitude%3E=60.0&longitude%3C=100.0&pres%3E=0&pres%3C=1000&orderByLimit(%22platform_number%2Ctime%2Cpres%2C2000%22)"

def fetch_json(url, filename):
    print(f"Fetching {filename}...")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode())
            filepath = os.path.join(DATA_DIR, filename)
            with open(filepath, 'w') as f:
                json.dump(data, f)
            print(f"Saved {len(data.get('table', {}).get('rows', []))} rows to {filepath}")
            return True
    except Exception as e:
        print(f"Failed to fetch {filename}: {e}")
        return False

# 2. Fetch some real SST data (NOAA OI SST) for the grid
# A very coarse 1-degree resolution slice for the North Indian Ocean to keep it small
SST_URL = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/ncdcOisst21Agg_LonPM180.json?sst%5B(2024-01-01T12:00:00Z):1:(2024-01-01T12:00:00Z)%5D%5B(0.0):1:(0.0)%5D%5B(5.0):1:(25.0)%5D%5B(60.0):1:(100.0)%5D"

if __name__ == '__main__':
    print("Starting data fetch...")
    success = True
    if not fetch_json(ARGO_URL, 'argo_profiles_real.json'):
        success = False
    if not fetch_json(SST_URL, 'sst_grid_real.json'):
        success = False
    
    if success:
        print("Successfully fetched real data samples.")
        sys.exit(0)
    else:
        sys.exit(1)
