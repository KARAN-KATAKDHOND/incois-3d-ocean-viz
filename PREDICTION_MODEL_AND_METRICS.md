# INCOIS 3D Ocean Visualization Platform
## Numerical Prediction Models & Statistical Validation Pipeline

> **Document Purpose:** Comprehensive technical documentation detailing the numerical prediction models integrated into the INCOIS ocean visualization pipeline, their physical architecture, data ingestion mechanisms, and the mathematical and algorithmic derivation of validation metrics (**RMSE**, **Bias**, **Pearson Correlation**) comparing model forecasts against real-world in-situ oceanographic observations.

---

## 1. Executive Summary & Architecture Overview

In operational oceanography, understanding ocean state dynamics (temperature, salinity, density, horizontal velocity) requires combining two complementary data sources:
1. **Numerical Prediction & Reanalysis Models:** High-resolution 3D grid simulations based on geophysical fluid dynamics equations (Navier-Stokes on a rotating sphere with thermodynamic equations of state).
2. **In-Situ Observational Networks:** Direct physical sensor measurements gathered autonomously by profiling floats (e.g., Argo), CTD casts, and satellite radiometers (e.g., AMSR-E).

```
                      ┌────────────────────────────────────────┐
                      │    Raw Ocean Prediction Model NetCDF   │
                      │  (GLORYS12V1 / NEMO / NOAA SST Grid)  │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │      Data Pipeline (FastAPI / Dask)    │
                      │  • Coordinate Normalization (CF Conv)  │
                      │  • Chunking: (t:1, d:1, lat:200, lon:200)│
                      │  • Consolidated Zarr Store Generation  │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │           Zarr Data Store              │
                      │   (Fast disk-backed lazy queries)      │
                      └───────────────────┬────────────────────┘
                                          │
                        Query at Observation Location (Lat, Lon)
                                          │
┌───────────────────────────┐             │
│ In-Situ Sensor Observation│             ▼
│  (Argo Float CTD Profile) ├────────► ┌────────────────────────────────────────┐
│  • Depth array: d_obs     │          │  Validation Engine (real_data.py)      │
│  • Sensor array: Y_obs    │          │  1. Spatial Nearest-Neighbor Query     │
└───────────────────────────┘          │  2. 1D Piecewise Linear Interpolation  │
                                       │  3. Calculate RMSE, Bias, Correlation  │
                                       └───────────────────┬────────────────────┘
                                                           │
                                                           ▼
                                       ┌────────────────────────────────────────┐
                                       │  Frontend Compare Panel (Recharts/3D)  │
                                       │  • Side-by-Side Vertical Profiles      │
                                       │  • Real-Time Metric Badges             │
                                       └────────────────────────────────────────┘
```

---

## 2. Ocean Prediction Models Used in the Pipeline

### 2.1 Primary Model: Mercator Ocean Global Reanalysis (`GLORYS12V1`)
* **Active Dataset Identifier:** `mercatorglorys12v1_gl12_mean_20260101_R20260107`
* **Data Source:** Mercator Ocean International / Copernicus Marine Environment Monitoring Service (CMEMS).
* **Underlying Engine:** **NEMO** (*Nucleus for European Modelling of the Ocean*), coupled with sea-ice model **LIM3/SI3**.
* **Data Assimilation Engine:** Reduced-order Kalman filter (SEEK filter formulation) assimilating along-track satellite altimetry (SLA), satellite sea surface temperature (SST), sea ice concentration, and in-situ vertical profiles from Argo floats and CTD casts.

#### Model Specifications & Dimensions:
| Parameter | Specification | Physical Meaning |
| :--- | :--- | :--- |
| **Horizontal Grid** | **$1/12^\circ$ Equirectangular** ($\approx 8\text{ km}$ at equator) | Eddy-resolving grid capable of simulating mesoscale eddies, western boundary currents, and fronts. |
| **Spatial Coverage** | Global ($80^\circ\text{S} - 90^\circ\text{N}$, $180^\circ\text{W} - 180^\circ\text{E}$) | Full planetary ocean coverage. |
| **Vertical Levels** | **50 standard geopotential depth levels** | Depth spacing varies non-linearly: fine resolution ($1\text{ m}$) near surface to resolve the mixed layer, increasing to $450\text{ m}$ in abyssal depths ($5,728\text{ m}$). |
| **Time Discretization**| Daily mean / Multi-day operational forecast | Captures synoptic atmospheric forcing and seasonal variability. |

#### Model Output Variables:
* `thetao` ($^\circ\text{C}$): **Potential Temperature** of seawater relative to surface pressure.
* `so` ($\text{PSU}$ or $10^{-3}$): **Practical Salinity** on the practical salinity scale.
* `uo` ($\text{m/s}$): **Eastward (Zonal) Current Velocity** vector component.
* `vo` ($\text{m/s}$): **Northward (Meridional) Current Velocity** vector component.
* `zos` ($\text{m}$): **Sea Surface Height Above Geoid** (dynamic sea surface topography).
* `mlotst` ($\text{m}$): **Ocean Mixed Layer Thickness** defined by density threshold criteria ($\Delta \sigma_\theta = 0.03\text{ kg/m}^3$).
* `bottomT` ($^\circ\text{C}$): **Benthic Water Temperature** at the ocean seafloor.
* `usi`, `vsi`, `siconc`, `sithick`: **Sea Ice Drift Velocity, Concentration, and Ice Thickness**.

---

### 2.2 Secondary / Regional Model: NOAA High-Resolution Hydrodynamic Grid
* **Active Dataset Identifier:** `noaa_sst_real`
* **Coverage:** Northern Indian Ocean Basin ($5.0^\circ\text{N} - 25.0^\circ\text{N}$, $60.0^\circ\text{E} - 100.0^\circ\text{E}$).
* **Vertical Levels:** 8 depth levels ($0, 5, 10, 50, 100, 200, 500, 1000\text{ m}$).
* **Variables:** `temperature` ($^\circ\text{C}$), `salinity` ($\text{PSU}$), `u` ($\text{m/s}$), `v` ($\text{m/s}$).

---

## 3. Data Pipeline & Storage Ingestion Flow

Traditional ocean model outputs are distributed as multi-gigabyte NetCDF4 files (`.nc`/`.nc4`). Querying raw NetCDF files over HTTP creates severe I/O bottlenecks because NetCDF requires reading sequential headers and uncompressed strided slices.

The platform's automated ingestion pipeline solves this using **Xarray + Dask + Zarr**:

### Step 1: Lazy Chunk-Streamed Ingestion
The file is loaded through `xarray.open_dataset(file_path, chunks="auto")` in [`NetCDFParser`](file:///Users/parassawal/Projects/SIH%20test/data-pipeline/pipeline/parsers/netcdf_parser.py#L73). Dask ensures that memory consumption never exceeds the chunk buffer size.

### Step 2: Coordinate Normalization (CF Conventions)
Different numerical centers name coordinate axes differently. The pipeline dynamically detects and maps coordinate aliases to canonical dimensions:
$$\begin{aligned}
\text{Latitude:} &\quad \{\texttt{"lat\_rho"}, \texttt{"LATITUDE"}, \texttt{"latitude"}\} \longrightarrow \mathbf{lat} \\
\text{Longitude:} &\quad \{\texttt{"lon\_rho"}, \texttt{"LONGITUDE"}, \texttt{"longitude"}\} \longrightarrow \mathbf{lon} \\
\text{Depth:} &\quad \{\texttt{"nav\_lev"}, \texttt{"DEPTH"}, \texttt{"deptht"}, \texttt{"lev"}\} \longrightarrow \mathbf{depth} \\
\text{Time:} &\quad \{\texttt{"time\_counter"}, \texttt{"TIME"}, \texttt{"ocean\_time"}\} \longrightarrow \mathbf{time}
\end{aligned}$$

### Step 3: 2D/3D Slicing-Optimized Rechunking
To enable sub-second depth-slice extraction and vertical profile probing, the pipeline rechunks the dataset into regular hypercubes:
$$\text{Chunk Shape} = \left(\text{time}=1,\; \text{depth}=1,\; \text{lat}=\min(200, N_{\text{lat}}),\; \text{lon}=\min(200, N_{\text{lon}})\right)$$
This ensures that fetching any horizontal depth plane or single-point vertical column only requires reading 1 or 2 discrete compressed chunk blocks from disk.

### Step 4: Consolidated Zarr Directory Store
The resulting dataset is written to disk via `ds.to_zarr(zarr_path, consolidated=True)`. The `.zmetadata` file caches the root schema, eliminating round-trip metadata queries.

---

## 4. How Statistical Validation Metrics Are Obtained

The validation engine is implemented in the backend service [`real_data.py`](file:///Users/parassawal/Projects/SIH%20test/backend/services/real_data.py#L337-L425) (`generate_comparison` method). It calculates how closely the numerical model reflects true in-situ physical measurements.

### 4.1 Step-by-Step Computational Workflow

```
[Observation Sensor Profile]
d_obs = [0.5, 5.0, 10.0, 25.0, ..., 2000.0] meters
Y_obs = [28.4, 28.3, 27.9, 24.1, ..., 3.8] °C
at Lat = φ_obs, Lon = λ_obs
                     │
                     ▼
[Step 1: Spatial Query on Model Grid]
model_point = ds[var].sel(lat=φ_obs, lon=λ_obs, method="nearest")
Produces model column:
d_model = [0.49, 1.54, 2.64, ..., 5727.9] meters
Y_model_raw = [28.1, 28.1, 27.8, ..., 2.1] °C
                     │
                     ▼
[Step 2: 1D Depth Interpolation]
interp_model_values = np.interp(d_obs, d_model, Y_model_raw)
Aligns model predictions Y_hat to exact sensor depths d_obs
                     │
                     ▼
[Step 3: Statistical Formulation]
Compute RMSE, Bias, and Pearson Correlation
```

#### Step 1: Spatial Nearest-Neighbor Collocation
For a selected in-situ instrument (e.g., Argo Float #`2902695`) with recorded coordinates $(\phi_{\text{obs}}, \lambda_{\text{obs}})$, the backend queries the model Zarr store:
```python
model_point = ds[model_var].sel(lat=obs_lat, lon=obs_lon, method="nearest")
```
This extracts the 1D vertical column of model predictions directly at the nearest ocean grid cell.

#### Step 2: Vertical Depth Alignment (Piecewise Linear Interpolation)
An in-situ CTD probe records continuous or finely spaced measurements at depths $d_{\text{obs}} = [z_1, z_2, \dots, z_N]^T$, whereas the numerical model operates on fixed discretized vertical levels $d_{\text{model}} = [\zeta_1, \zeta_2, \dots, \zeta_M]^T$.

To compare pairs $(y_i, \hat{y}_i)$ at the exact same physical depths without introducing artificial bias, the system applies 1D piecewise linear interpolation:
$$\hat{y}_i = Y_{\text{model}}(\zeta_k) + \frac{z_i - \zeta_k}{\zeta_{k+1} - \zeta_k} \left( Y_{\text{model}}(\zeta_{k+1}) - Y_{\text{model}}(\zeta_k) \right)$$
where $\zeta_k \le z_i \le \zeta_{k+1}$.

In the codebase, this is computed via:
```python
interp_model_values = np.interp(obs_depths, model_depths, model_values)
```
This yields two aligned vectors of length $N$:
* **Observed Ground-Truth Vector:** $Y = [y_1, y_2, \dots, y_N]^T$
* **Model Predicted Vector:** $\hat{Y} = [\hat{y}_1, \hat{y}_2, \dots, \hat{y}_N]^T$

---

### 4.2 Mathematical Formulas and Physical Interpretations

#### A. Root Mean Square Error (RMSE)
$$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^{N} \left( \hat{y}_i - y_i \right)^2}$$

* **Implementation:**
  ```python
  rmse = np.sqrt(np.mean((obs_values - interp_model_values) ** 2))
  ```
* **Physical Significance:**
  * Quantifies the overall magnitude of the prediction error in the same physical units as the variable ($^\circ\text{C}$ for temperature, $\text{PSU}$ for salinity).
  * Because errors are squared, RMSE penalizes large local deviations heavily. For instance, if the model misplaces the depth of the sharp thermocline by 15 meters, the large local temperature difference elevates the RMSE.

---

#### B. Mean Error / Bias
$$\text{Bias} = \frac{1}{N} \sum_{i=1}^{N} \left( \hat{y}_i - y_i \right)$$

* **Implementation:**
  ```python
  bias = np.mean(interp_model_values - obs_values)
  ```
* **Physical Significance:**
  * Measures whether the model systematically over-predicts or under-predicts ocean parameters across the vertical water column.
  * **$\text{Bias} > 0$ (Positive Bias):** The model is systematically warmer (or saltier) than the true ocean observation.
  * **$\text{Bias} < 0$ (Negative Bias):** The model is systematically cooler (or fresher) than the observed state.
  * **$\text{Bias} \approx 0$:** The model has negligible systematic drift; residual errors are randomly distributed around zero.

---

#### C. Pearson Correlation Coefficient ($r$)
$$r = \frac{\sum_{i=1}^{N} (y_i - \bar{y})(\hat{y}_i - \bar{\hat{y}})}{\sqrt{\sum_{i=1}^{N} (y_i - \bar{y})^2} \sqrt{\sum_{i=1}^{N} (\hat{y}_i - \bar{\hat{y}})^2}}$$
where $\bar{y} = \frac{1}{N}\sum y_i$ and $\bar{\hat{y}} = \frac{1}{N}\sum \hat{y}_i$.

* **Implementation:**
  ```python
  correlation = np.corrcoef(obs_values, interp_model_values)[0, 1] if len(obs_values) > 1 else 1.0
  ```
* **Physical Significance:**
  * Measures the vertical profile shape fidelity and phase coherence between model and observations, bounded in $[-1, +1]$.
  * A correlation near **$+1.0$** indicates that the numerical model accurately captures the structure of the vertical stratifications: the isothermal surface mixed layer, the steep gradient of the thermocline/halocline, and the gradual asymptotic decay into deep ocean layers.
  * Even if a model has a constant positive offset ($\text{Bias} > 0$), its correlation can remain close to $+1.0$, demonstrating that the physical dynamics and layering are accurately captured despite a calibration offset.

---

## 5. API Response Schema & Frontend Representation

The metrics and paired profile vectors are served by the FastAPI endpoint:
`GET /api/compare?observation_id={id}&dataset_id={dataset_id}&variable={variable}`

### JSON Payload Structure:
```json
{
  "observation_id": "2902695",
  "variable": "temperature",
  "unit": "°C",
  "rmse": 0.4281,
  "bias": -0.1142,
  "correlation": 0.9942,
  "n_observations": 74,
  "model_profile": [
    { "depth": 0.5, "value": 28.14, "quality": "valid" },
    { "depth": 5.0, "value": 28.11, "quality": "valid" }
  ],
  "observation_profile": [
    { "depth": 0.5, "value": 28.25, "quality": "valid" },
    { "depth": 5.0, "value": 28.21, "quality": "valid" }
  ],
  "is_demo": false
}
```

### Visual Interface Integration:
1. **Interactive Metric Cards:** Rendered dynamically at the top of [`ComparePanel.tsx`](file:///Users/parassawal/Projects/SIH%20test/frontend/src/components/panels/ComparePanel.tsx) with colored status badges (Cyan for RMSE, Orange for Bias, Green for Correlation).
2. **Dual-Line Vertical Profile:** Rendered using [`ComparisonChart.tsx`](file:///Users/parassawal/Projects/SIH%20test/frontend/src/charts/ComparisonChart.tsx) with an inverted vertical $Y$-axis (representing depth increasing downwards from $0\text{ m}$ to $2,000\text{ m}$). The in-situ observations are drawn as solid cyan markers and the model predictions as a dashed orange line, allowing immediate visual inspection of thermocline alignment.

---

## 6. Summary Reference Table

| Feature | Pipeline Implementation | Code Location |
| :--- | :--- | :--- |
| **Numerical Prediction Model** | Mercator Ocean GLORYS12V1 (1/12° resolution, 50 depth levels) | [`metadata/mercatorglorys12v1...json`](file:///Users/parassawal/Projects/SIH%20test/backend/data/metadata/mercatorglorys12v1_gl12_mean_20260101_R20260107.json) |
| **Pipeline Ingestion** | Dask chunk-streamed NetCDF $\rightarrow$ Zarr conversion | [`netcdf_parser.py`](file:///Users/parassawal/Projects/SIH%20test/data-pipeline/pipeline/parsers/netcdf_parser.py) |
| **In-situ Ground Truth** | Argo Autonomous Float CTD depth profiles & AMSR-E SST | [`data/original/argo_profile_real.csv`](file:///Users/parassawal/Projects/SIH%20test/backend/data/original/argo_profile_real.csv) |
| **Spatial Query** | 2D Nearest Neighbor on curved geodetic grid | [`real_data.py:375`](file:///Users/parassawal/Projects/SIH%20test/backend/services/real_data.py#L375) |
| **Depth Alignment** | 1D Piecewise Linear Interpolation (`np.interp`) | [`real_data.py:394`](file:///Users/parassawal/Projects/SIH%20test/backend/services/real_data.py#L394) |
| **RMSE Calculation** | $\sqrt{\text{mean}((\text{obs} - \text{model})^2)}$ | [`real_data.py:406`](file:///Users/parassawal/Projects/SIH%20test/backend/services/real_data.py#L406) |
| **Bias Calculation** | $\text{mean}(\text{model} - \text{obs})$ | [`real_data.py:407`](file:///Users/parassawal/Projects/SIH%20test/backend/services/real_data.py#L407) |
| **Correlation** | Pearson Correlation Matrix $r = \frac{\text{Cov}(Y, \hat{Y})}{\sigma_Y \sigma_{\hat{Y}}}$ | [`real_data.py:408`](file:///Users/parassawal/Projects/SIH%20test/backend/services/real_data.py#L408) |
| **Visualization** | Inverted Depth Line Chart & Real-Time KPI Cards | [`ComparisonChart.tsx`](file:///Users/parassawal/Projects/SIH%20test/frontend/src/charts/ComparisonChart.tsx) |
