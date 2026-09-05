import json
import random
import math

instruments = []
sst_grid = []
wind_vectors = []

# Generate Instruments (Argo & Gliders)
for i in range(200):
    lon = random.uniform(50.0, 95.0)
    lat = random.uniform(5.0, 25.0)
    depth = random.choice([-10, -50, -100, -200, -500, -1000])
    # Temperature based on depth and lat
    temp = 28.0 - (lat - 5) * 0.2 - (-depth) * 0.02 + random.uniform(-1, 1)
    temp = max(4.0, temp)
    
    itype = "argo" if random.random() > 0.3 else "glider"
    
    instruments.append({
        "id": f"{itype}-{i:03d}",
        "type": itype,
        "coordinates": [round(lon, 2), round(lat, 2), depth],
        "temperature": round(temp, 2)
    })

# Add the specific real ones we highlighted in demo_data.py
instruments.append({"id": "ARGO-2901323", "type": "argo", "coordinates": [65.2, 12.5, -5.0], "temperature": 28.5})
instruments.append({"id": "ARGO-2902086", "type": "argo", "coordinates": [88.5, 16.8, -5.0], "temperature": 29.2})
instruments.append({"id": "GLIDER-9921", "type": "glider", "coordinates": [75.0, 8.0, -5.0], "temperature": 28.8})

# Generate SST Grid (2-degree spacing)
for lon in range(50, 96, 2):
    for lat in range(5, 26, 2):
        temp = 29.0 - (lat - 5) * 0.15 + math.sin(lon * 0.1) * 0.5
        sst_grid.append({
            "coordinates": [lon, lat],
            "base_temp": round(temp, 2)
        })

# Generate Wind Vectors
for lon in range(52, 94, 4):
    for lat in range(6, 24, 4):
        wind_vectors.append({
            "coordinates": [lon, lat],
            "u": round(math.sin(lat * 0.5) * 0.8, 2),
            "v": round(math.cos(lon * 0.5) * 0.8, 2)
        })

data = {
    "instruments": instruments,
    "sst_grid": sst_grid,
    "wind_vectors": wind_vectors
}

with open('/Users/parassawal/Projects/SIH test/frontend/public/ocean_data_points.json', 'w') as f:
    json.dump(data, f)
print("Data generated!")
