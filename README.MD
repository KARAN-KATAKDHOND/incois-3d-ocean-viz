<div align="center">

# 🌊 INCOIS 3D Ocean Visualization & Intelligence Platform

**An interactive, browser-native 3D digital twin and multi-day analytical intelligence dashboard for high-resolution ocean models, sea ice dynamics, and real-time autonomous instrument profiles.**

**Smart India Hackathon (SIH) 2026 — Problem Statement SIH26067**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r185-000000?logo=threedotjs)](https://threejs.org/)
[![CesiumJS](https://img.shields.io/badge/CesiumJS-1.145-6CADDF)](https://cesium.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.141-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Xarray](https://img.shields.io/badge/Xarray-Data_Pipeline-blue)](https://xarray.pydata.org/en/stable/)
[![Zarr](https://img.shields.io/badge/Zarr-Cloud_Storage-orange)](https://zarr.readthedocs.io/en/stable/)

</div>

---

## 📖 Table of Contents
1. [Project Overview](#-project-overview)
2. [Core Modules](#-core-modules)
   - [Module A: 3D Ocean Explorer](#module-a-3d-ocean-explorer)
   - [Module B: Ocean Intelligence Dashboard](#module-b-ocean-intelligence-dashboard)
   - [Module C: Validation & Prediction Engine](#module-c-validation--prediction-engine)
3. [Architecture & Data Pipeline](#-architecture--data-pipeline)
4. [Scientific Inference Engine (Deterministic)](#-scientific-inference-engine-deterministic)
5. [Datasets & Prediction Models](#-datasets--prediction-models)
6. [Tech Stack](#-tech-stack)
7. [Installation & Setup](#-installation--setup)
8. [License & Credits](#-license--credits)

---

## 🎯 Project Overview

**INCOIS 3D Ocean Viz** is a full-stack scientific visualization and intelligence platform developed for the **Indian National Centre for Ocean Information Services (INCOIS)**. 

It transforms complex, multi-dimensional ocean data — temperature, salinity, sea ice, and ocean currents — into intuitive, interactive 3D visualizations on a digital twin globe, whilst providing a dedicated **Ocean Intelligence Dashboard** for multi-day analytical inferences, correlation matrices, and stock-market style parameter tracking.

> **Our Philosophy:** *Do not just show what the data is. Explain why it matters.* We convert multi-day oceanographic data into understandable scientific inferences, relationships, trends, anomalies, and actionable insights.

---

## 🧩 Core Modules

### Module A: 3D Ocean Explorer
The Explorer is a WebGL-powered digital twin of the Earth's oceans, designed for lab-grade accuracy directly in the browser.
* 🌐 **Cesium + Three.js:** High-fidelity globe combined with custom React Three Fiber rendering.
* 🌡️ **Physical Shader Dynamics:** Variables like Sea Surface Height (`zos`) and Ice Thickness (`sithick`) are rendered using custom GLSL shaders that physically deform the 3D meshes for true-to-life realism.
* 📊 **Isosurface Extraction:** Marching-cubes-based 3D isosurface generation for threshold analysis (e.g., locating the 25°C thermocline volume).
* ⚡ **Vector Particle Systems:** GPU-accelerated animated particle trails showing Zonal/Meridional ocean current flow and Sea Ice Drift.

### Module B: Ocean Intelligence Dashboard
A dedicated, highly responsive, and premium analytical dashboard for multi-day trend analysis.
* 📈 **Stock-Market Style Trend Analysis:** Visualizes multi-day parameter shifts (e.g., Temperature vs. Salinity) using dual-axis, gradient-filled Area charts. Hovering over any point reveals instant, text-based inferences (e.g., *"▲ Experiencing an upward thermal trend (+0.452)"*).
* 🧮 **Pairwise Correlation Matrices:** A dynamic heatmap grid computing the Pearson correlation coefficient between any physical variables across the selected time bounds.
* ⚠️ **Automated Anomaly Detection:** Real-time statistical analysis flagging observations that deviate significantly from the baseline standard deviation.
* 📑 **Export & Reporting System:** One-click generation of comprehensive PDF and CSV reports summarizing the analytical findings.

### Module C: Validation & Prediction Engine
An automated backend pipeline that compares numerical prediction models against real-world, in-situ oceanographic observations (like Argo floats).
* **RMSE (Root Mean Square Error):** Quantifies the overall magnitude of the prediction error.
* **Bias (Mean Error):** Measures if the numerical model systematically over-predicts or under-predicts the true ocean state.
* **Pearson Correlation:** Validates whether the prediction model accurately captures the structural shape of vertical stratifications (like the halocline).

---

## 🏛 Architecture & Data Pipeline

Ocean datasets are inherently **massive and multi-dimensional** (latitude × longitude × depth × time × variables). Rendering them in a browser requires a highly optimized client-server split.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                  INCOIS 3D Ocean Visualization — Architecture            │
└──────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐              ┌──────────────────────┐
    │   React Frontend │    REST API  │   FastAPI Backend    │
    │   (Browser)      │◄────────────►│   (Python Server)    │
    │                  │   JSON/HTTP  │                      │
    │  ┌────────────┐  │              │ ┌──────────────────┐ │
    │  │  CesiumJS  │  │              │ │  Zarr / NetCDF   │ │
    │  │  (Globe)   │  │              │ │  Data Processor  │ │
    │  └────────────┘  │              │ └──────────────────┘ │
    │  ┌────────────┐  │              │ ┌──────────────────┐ │
    │  │  Recharts  │  │              │ │  Inference &     │ │
    │  │ (Analytics)│  │              │ │  Stats Engine    │ │
    │  └────────────┘  │              │ └──────────────────┘ │
    └──────────────────┘              └──────────────────────┘
                                                  ▲
                                                  │ Lazy Chunk Loading
                                                  ▼
                                      ┌──────────────────────┐
                                      │  Data Pipeline       │
                                      │  (xarray / Dask)     │
                                      └──────────────────────┘
```

1. **Lazy Chunk-Streamed Ingestion:** Gigabyte-scale NetCDF4 files are converted to **Zarr** stores. This allows the FastAPI backend to fetch *only the specific chunk of data needed* from disk, bypassing memory bottlenecks.
2. **REST API Slicing:** The frontend requests highly specific 2D slices or multi-day time-series arrays. The backend slices the Xarray dataset dynamically and returns lightweight JSON payloads.

---

## 🧠 Scientific Inference Engine (Deterministic)

**Crucial Architecture Choice:** The platform *does not* use Large Language Models (LLMs) to generate numerical data or scientific inferences. 

In oceanography, hallucinations are unacceptable. All inferences generated by the Ocean Intelligence Dashboard (e.g., determining water column stability, identifying upwelling zones, flagging thermal anomalies) are generated by a **Rule-Based Deterministic Inference Engine** (`inference_engine.py`).

* It computes strict standard deviations and Z-scores using `numpy` and `scipy.stats`.
* It calculates actual Pearson correlation matrices.
* It applies physical oceanographic logic (e.g., if Sea Surface Temperature decreases rapidly while Salinity increases, it identifies a potential "Coastal Upwelling Event").

---

## 🌍 Datasets & Prediction Models

The platform supports multiple data sources, dynamically normalized to CF Conventions.

### Primary Model: Mercator Ocean Global Reanalysis (`GLORYS12V1`)
* **Underlying Engine:** NEMO (Nucleus for European Modelling of the Ocean).
* **Grid:** $1/12^\circ$ Equirectangular (~8 km at equator). Eddy-resolving grid capable of simulating mesoscale eddies and western boundary currents.
* **Vertical Levels:** 50 standard geopotential depth levels (1m near surface to 450m in abyssal depths).
* **Variables Extracted:** `thetao` (Temp), `so` (Salinity), `uo`/`vo` (Velocities), `zos` (SSH), `sithick` (Ice Thickness).

### Secondary Model: NOAA High-Resolution Hydrodynamic Grid
* **Coverage:** Northern Indian Ocean Basin.
* **Variables:** `temperature`, `salinity`, `current_speed`.

---

## 🛠 Tech Stack

### Frontend Ecosystem (`frontend/`)
* **React 19 & Vite:** Component-based UI architecture with lightning-fast Hot Module Replacement.
* **CesiumJS:** World-class globe engine handling geographic coordinate systems and WGS84 ellipsoid projections.
* **Three.js & React Three Fiber (R3F):** Declarative WebGL engine for custom shader displacement and volumetric extraction.
* **Zustand:** Minimalist, fast state management preventing unnecessary re-renders in the heavy 3D canvas.
* **Recharts:** Highly interactive, composable 2D charting library for the Intelligence Dashboard.
* **TailwindCSS:** Used for crafting the premium, glassmorphic dark-mode aesthetic.

### Backend Pipeline (`backend/`)
* **FastAPI:** Modern Python asynchronous framework for non-blocking file I/O and rapid API routing.
* **Xarray:** Multi-dimensional array manipulation (extending NumPy) for slicing gigabyte-scale volumes.
* **Zarr:** Cloud-optimized format for storing chunked N-dimensional arrays.
* **Dask:** Parallel computing library enabling "out-of-core" computation.

---

## 🚀 Installation & Setup

### Prerequisites
* **Node.js** ≥ 18
* **Python** 3.10+

### Step 1 — Clone the Repository
```bash
git clone https://github.com/<your-username>/incois-3d-ocean-viz.git
cd incois-3d-ocean-viz
```

### Step 2 — Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Step 3 — Frontend Setup
```bash
cd ../frontend
npm install
```

### Step 4 — Run the Application
You can start both servers simultaneously:

**Terminal 1 (Backend):**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

> 🌐 **App URL:** [`http://localhost:5173`](http://localhost:5173)  
> 📄 **API Docs (Swagger):** [`http://localhost:8000/api/docs`](http://localhost:8000/api/docs)

---

## 📄 License & Credits

This project was developed exclusively as a solution for **Smart India Hackathon 2026** (Problem Statement SIH26067).

<div align="center">
<br/>

**Built with ❤️ for INCOIS & SIH 2026**  
*Making the ocean's depths visible, interactive, and intelligent.*

</div>
