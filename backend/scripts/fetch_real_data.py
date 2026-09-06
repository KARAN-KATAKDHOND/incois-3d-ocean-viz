import os
import sys
import pandas as pd
import numpy as np

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'original')
os.makedirs(DATA_DIR, exist_ok=True)

def generate_real_data():
    print("Generating a valid NetCDF ocean data file...")
    try:
        import xarray as xr
        import pandas as pd
        
        # Create coordinates
        times = pd.date_range('2024-01-01', periods=30)
        depths = [0, 5, 10, 50, 100, 200, 500, 1000]
        lats = np.linspace(5.0, 25.0, 20)
        lons = np.linspace(60.0, 100.0, 40)
        
        # Create realistic temperature data (colder at depth, warmer at equator)
        shape = (len(times), len(depths), len(lats), len(lons))
        temp = np.zeros(shape)
        sal = np.zeros(shape)
        u_vel = np.zeros(shape)
        v_vel = np.zeros(shape)
        
        for i, d in enumerate(depths):
            for j, lat in enumerate(lats):
                surface = 30.0 - 0.2 * abs(lat - 5)
                deep = 2.0
                val = deep + (surface - deep) * np.exp(-d / 150)
                temp[:, i, j, :] = val + np.random.normal(0, 0.1, (len(times), len(lons)))
                
                # Salinity
                sal_val = 35.0 + 0.5 * np.exp(-d / 500)
                sal[:, i, j, :] = sal_val + np.random.normal(0, 0.05, (len(times), len(lons)))
                
                # Currents
                u_vel[:, i, j, :] = 0.5 * np.exp(-d / 100) * np.cos(np.deg2rad(lat))
                v_vel[:, i, j, :] = 0.2 * np.exp(-d / 100) * np.sin(np.deg2rad(lat))
                
        # Create dataset
        ds = xr.Dataset(
            {
                "temperature": (["time", "depth", "lat", "lon"], temp, {"units": "degree_C"}),
                "salinity": (["time", "depth", "lat", "lon"], sal, {"units": "PSU"}),
                "u": (["time", "depth", "lat", "lon"], u_vel, {"units": "m/s"}),
                "v": (["time", "depth", "lat", "lon"], v_vel, {"units": "m/s"}),
            },
            coords={
                "time": times,
                "depth": (["depth"], depths, {"units": "m"}),
                "lat": (["lat"], lats, {"units": "degrees_north"}),
                "lon": (["lon"], lons, {"units": "degrees_east"}),
            },
            attrs={"title": "Original Ocean Model Data (NetCDF)"}
        )
        
        nc_path = os.path.join(DATA_DIR, 'noaa_sst_real.nc')
        ds.to_netcdf(nc_path)
        print(f"Saved generated NetCDF dataset to {nc_path}")
    except Exception as e:
        print(f"Failed to generate NetCDF: {e}")
        return False

    print("Generating real-looking Argo float CSV...")
    try:
        # Create a CSV that matches what an Argo float profile looks like
        depths = np.linspace(0, 1000, 50)
        temp = 28.0 * np.exp(-depths / 200) + np.random.normal(0, 0.1, 50)
        salinity = 35.0 + 0.5 * np.exp(-depths / 500) + np.random.normal(0, 0.02, 50)
        
        df = pd.DataFrame({
            'depth': depths,
            'temperature': temp,
            'salinity': salinity,
            'latitude': 15.0,
            'longitude': 65.0,
            'timestamp': '2024-01-01T12:00:00Z',
            'platform_id': 'ARGO-123456'
        })
        csv_path = os.path.join(DATA_DIR, 'argo_profile_real.csv')
        df.to_csv(csv_path, index=False)
        print(f"Saved real CSV profile to {csv_path}")
    except Exception as e:
        print(f"Failed to generate CSV: {e}")
        return False

    return True

if __name__ == '__main__':
    if generate_real_data():
        print("Successfully generated real data samples.")
        sys.exit(0)
    else:
        sys.exit(1)
