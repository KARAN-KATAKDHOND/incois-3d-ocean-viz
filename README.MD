<div align="center">

# 🌊 INCOIS 3D Ocean Visualization

An interactive, browser-native 3D platform rendering high-resolution ocean models, sea ice dynamics, and real-time autonomous instrument profiles for rapid operational forecasting.

**Smart India Hackathon (SIH) 2026 — Problem Statement SIH26067**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite)](https://vite.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r185-000000?logo=threedotjs)](https://threejs.org/)
[![CesiumJS](https://img.shields.io/badge/CesiumJS-1.145-6CADDF)](https://cesium.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.141-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python)](https://python.org/)

</div>

---

## 📖 Table of Contents
1.  [Project Overview](#-project-overview)
2.  [Key Features](#-key-features)
3.  [Architecture Diagram](#-architecture-diagram)
4.  [Data Flow](#-data-flow)
5.  [Tech Stack](#-tech-stack)
6.  [Project Structure](#-project-structure)
7.  [Installation & Setup](#-installation--setup)
8.  [API Documentation](#-api-documentation)
9.  [User Guide](#-user-guide)
10. [Design System](#-design-system)
11. [Future Roadmap](#-future-roadmap)
12. [License](#-license)

---

## 🎯 Project Overview

**INCOIS 3D Ocean Viz** is a full-stack scientific visualization platform developed for the **Indian National Centre for Ocean Information Services (INCOIS)**. It transforms complex, multi-dimensional ocean data — temperature, salinity, sea ice, and ocean currents — into intuitive, interactive 3D visualizations on a digital twin globe, enabling researchers and meteorologists to make rapid operational forecasting decisions.

The platform combines the power of **CesiumJS** for geospatial rendering with **Three.js / React Three Fiber** for advanced scientific overlays (physical shader displacement, volume rendering, isosurfaces, particle systems), backed by a **FastAPI** data processing engine.

| Feature | Description |
|---|---|
| 🌐 **3D Digital Twin Globe** | High-fidelity Cesium globe with real-world terrain and imagery as the base layer |
| 🌡️ **Physical Shader Dynamics** | Variables like Sea Surface Height and Ice Thickness are rendered using custom WebGL shaders that physically deform the 3D meshes for lab-grade realism |
| 📊 **Isosurface Extraction** | Marching-cubes-based 3D isosurface generation for threshold-based analysis (e.g., 25°C thermocline) |
| 🔀 **Dynamic Cross-Sections** | Interactive vertical cross-section slicing between any two geographic points |
| 🎯 **Instrument Tracking** | Real-time Argo float, glider, and moored buoy positions with full depth-profile readouts |
| ⚡ **Current Particle System** | GPU-accelerated animated particle trails showing ocean current velocity, Zonal/Meridional flow, and Sea Ice Drift |
| 📈 **Model-Observation Comparison** | Side-by-side comparison of numerical model output vs. in-situ observations with bias/RMSE metrics |
| 🎛️ **Context-Aware UI** | Dashboard interface that auto-categorizes variables (Water Column, Sea Ice, Surface) and intelligently toggles controls based on physical dimensions |
| ⏱️ **Timeline Playback** | Animated time-stepping through NetCDF time indices with configurable playback speed |

---

## 🧠 Why This Architecture?

Ocean datasets are inherently **massive and multi-dimensional** (latitude × longitude × depth × time × variables). Rendering them in a browser requires a carefully designed client-server split:

| Concern | Solution |
|---|---|
| **Data Volume** | The Python backend lazily parses gigabyte-scale NetCDF/Zarr stores using xarray/Dask and serves only the processed slices needed by the current view |
| **Rendering Performance** | WebGL-based rendering via custom ShaderMaterials prevents texture memory leaks, keeping the visualization interactive at a rock-solid 60fps |
| **Scientific Accuracy** | Proper handling of multi-dimensional bounds, precise color mapping via normalized alpha-channel packing, and true-to-life 3D displacement |
| **Future Extensibility** | Architecture supports plugging in real OPeNDAP/ERDDAP data sources without changing the frontend |

> **Result:** Browser-native scientific visualization with lab-grade accuracy, no desktop software required.

---

## 🏛 Architecture Diagram

```
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
    │  │  Three.js  │  │              │ │  Isosurface      │ │
    │  │  R3F/Drei  │  │              │ │  Extraction      │ │
    │  │ (Shaders)  │  │              │ │  (Marching Cubes)│ │
    │  └────────────┘  │              │ └──────────────────┘ │
    │  ┌────────────┐  │              │ ┌──────────────────┐ │
    │  │  Recharts  │  │              │ │  Vector Velocity │ │
    │  │ (2D Charts)│  │              │ │  Generator       │ │
    │  └────────────┘  │              │ └──────────────────┘ │
    │  ┌────────────┐  │              └──────────────────────┘
    │  │  Zustand   │  │
    │  │  (State)   │  │              ┌──────────────────────┐
    │  └────────────┘  │              │  Data Pipeline       │
    └──────────────────┘              │  (xarray / Dask)     │
                                      └──────────────────────┘
```

---

## 📤 Data Flow

### Volumetric Data Request
```
User selects Variable (Temperature) + Depth Index + Time Index
              │
              ▼
    ┌──────────────────────────────┐
    │  GET /api/model/slice        │  ── Frontend sends query params
    │  ?variable=temperature       │  ── Backend slices Zarr dataset lazily
    │  &depth_index=5              │  ── Selects active temporal/spatial bounds
    │  &time_index=0               │  ── Returns flat 1D data array & shape
    └──────────┬───────────────────┘
               │  JSON { data[], shape[lat, lon], min, max }
               ▼
    ┌──────────────────────────────┐
    │  DepthSlice (React Three)    │  ── Texture packed with normalized data in Alpha
    │  Custom ShaderMaterial       │  ── Shader computes physical displacement & color
    │  Cesium Globe Context        │  ── Overlays dynamically above base terrain
    └──────────────────────────────┘
               │
               ▼
      🌊 Interactive 3D visualization on the digital twin globe
```

---

## 🛠 Tech Stack

Our technology choices were deliberately made to balance high-performance rendering of massive scientific datasets with rapid, maintainable frontend development.

### Languages Used
| Language | Purpose & Why It's Used |
|---|---|
| **TypeScript / JavaScript** | **Why:** The primary language for the web frontend. TypeScript ensures type safety across our complex 3D state, catching bugs at compile-time and enforcing strict data structures when interfacing with the Python backend. |
| **Python 3.10+** | **Why:** The undisputed king of scientific computing and data analysis. Python allows our backend to effortlessly manipulate massive NetCDF/Zarr multidimensional arrays using established oceanographic libraries (like `xarray`) before shipping simplified slices to the web. |
| **GLSL (OpenGL Shading Language)** | **Why:** We write custom fragment and vertex shaders in GLSL. It runs directly on the GPU, allowing us to physically deform sea ice thickness and ocean wave meshes in real-time at 60 FPS—something impossible to calculate on the CPU. |
| **HTML5 / CSS3** | **Why:** Standard web markup. We use Vanilla CSS (via `index.css`) mixed with Tailwind to craft our visually striking, glassmorphic UI. |

### Frontend Ecosystem (`frontend/`)
| Technology | Why It Is Used |
|---|---|
| **React 19** | **Why:** Provides a component-based architecture perfect for building our complex dashboard UI. React's state management perfectly handles the multitude of user controls (depth sliders, variable selectors, timelines). |
| **Vite** | **Why:** Our build tool of choice. Vite provides lightning-fast Hot Module Replacement (HMR) during development, instantly updating our 3D canvas when we tweak shader code or React components. |
| **CesiumJS** | **Why:** A world-class open-source globe engine. Cesium handles the incredibly complex math of geographic coordinate systems, WGS84 ellipsoid projections, and rendering satellite imagery terrain, giving our ocean data a true real-world geographic context. |
| **Three.js & React Three Fiber (R3F)** | **Why:** Three.js provides the WebGL 3D rendering engine for our scientific overlays. R3F allows us to write Three.js code declaratively as React components, seamlessly integrating our 3D logic into our React dashboard state. |
| **@react-three/drei** | **Why:** A vital ecosystem of helper components for R3F, saving us from writing boilerplate code for camera controls, text rendering, and complex geometries. |
| **TailwindCSS** | **Why:** A utility-first CSS framework that allows us to rapidly style our UI components directly in the JSX. We use it to create our custom "dark mode" glassmorphic aesthetics that feel premium and modern. |
| **Zustand** | **Why:** A minimalist, fast state management solution. Unlike Redux, Zustand operates without boilerplate and avoids wrapping the app in context providers, making it exceptionally performant when dealing with rapidly changing 3D variables. |
| **Recharts** | **Why:** Used for our 2D charts (like the Vertical Cross-Section chart). It is highly composable, responsive, and integrates smoothly with our React component tree. |

### Backend & Data Pipeline (`backend/` & `data-pipeline/`)
| Technology | Why It Is Used |
|---|---|
| **FastAPI** | **Why:** An incredibly fast, modern Python web framework. Its asynchronous capabilities (`async/await`) are crucial for handling non-blocking file I/O when reading massive ocean datasets, and it automatically generates our Swagger API documentation. |
| **Xarray** | **Why:** Xarray extends NumPy to work with labeled multi-dimensional arrays (like latitude, longitude, depth, time). It allows our backend to extract hyper-specific 2D slices or cross-sections out of gigabyte-scale volumes with a single line of code. |
| **Zarr** | **Why:** A modern, cloud-optimized format for storing chunked N-dimensional arrays. We convert legacy NetCDF files to Zarr because Zarr allows our FastAPI backend to read *only the specific chunk of data needed* from disk, rather than loading the whole multi-gigabyte file into memory. |
| **Dask** | **Why:** Parallel computing library that integrates with Xarray. It enables "out-of-core" computation in our pipeline, meaning we can process datasets larger than the server's RAM. |
| **NumPy & Pandas** | **Why:** The backbone of Python data science. Used for high-speed mathematical array manipulation, flattening data for JSON payloads, and parsing tabular in-situ observation data. |

---

## 📁 Project Structure

```
incois-3d-ocean-viz/
│
├── frontend/                          # React + TypeScript SPA
│   ├── src/
│   │   ├── 3d/                        # Three.js / R3F overlay components
│   │   │   ├── OceanScene.tsx         # Main R3F canvas orchestrator
│   │   │   ├── DepthSlice.tsx         # Custom ShaderMaterial for slices & physical displacement
│   │   │   ├── IsosurfaceMesh.tsx     # Marching-cubes isosurface geometry
│   │   │   ├── CurrentParticles.tsx   # Animated GPU particle system for vectors (uo, vo, etc)
│   │   │   └── ObservationMarkers.tsx # Argo/Glider/Buoy 3D markers
│   │   │
│   │   ├── charts/                    # 2D data visualization (Recharts)
│   │   ├── components/
│   │   │   ├── layout/                # App shell layout (Sidebar, TopBar)
│   │   │   └── panels/               # Feature-specific control panels
│   │   │       ├── VariableSelector.tsx       # Smart category-based variable selector
│   │   │       ├── DepthSlider.tsx            # Context-aware depth controller
│   │   │       └── TimelineController.tsx     # Animated time playback
│   │   │
│   │   ├── stores/                    # Zustand state management
│   │   └── utils/                     # Shared utility functions (Colormaps, API)
│
├── backend/                           # FastAPI Python server
│   ├── main.py                        # Application entry — all route definitions
│   ├── services/
│   │   ├── real_data.py               # Zarr dataset handlers and slicers
│   │   └── demo_data.py               # Synthetic fallback data
│   ├── visualization/
│   │   └── isosurface.py              # Marching-cubes isosurface extraction
│   └── data/                          # Zarr stores and metadata JSON
│
└── data-pipeline/                     # NetCDF to Zarr ingestion tools
```

---

## 🚀 Installation & Setup

### Prerequisites
| Requirement | Notes |
|---|---|
| **Node.js** ≥ 18 | [Download](https://nodejs.org/) |
| **Python** 3.10+ | [Download](https://python.org/) |
| **npm** & **pip** | Bundled with Node.js and Python respectively |

### Step 1 — Clone the Repository
```bash
git clone https://github.com/<your-username>/incois-3d-ocean-viz.git
cd incois-3d-ocean-viz
```

### Step 2 — Install Dependencies

**Backend:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

**Frontend:**
```bash
cd frontend
npm install
cd ..
```

---

### Step 3 — Start the Application

You can start both the backend and frontend concurrently using the provided start script:

```bash
chmod +x start.sh
./start.sh
```

> 🌐 Open your browser and navigate to [`http://localhost:5173`](http://localhost:5173) to explore the visualizer.
> 📄 **Swagger UI** (interactive API docs): [`http://localhost:8000/api/docs`](http://localhost:8000/api/docs)
> 📘 **ReDoc** (reference docs): [`http://localhost:8000/api/redoc`](http://localhost:8000/api/redoc)

---

## 📡 Supported Variables

The platform automatically adjusts UI panels and rendering techniques depending on the active variable's dimensionality and physics:

### Water Column (3D)
| Variable | Description |
|---|---|
| `temperature` / `thetao` | Sea water / Potential temperature (°C) |
| `salinity` / `so` | Sea water salinity (PSU) |
| `bottomT` | Bottom temperature (°C) |

### Sea Surface (2D Physical Displacement)
| Variable | Description |
|---|---|
| `zos` | Sea Surface Height (physically displaces mesh Y-axis) |
| `mlotst` | Mixed Layer Depth (displaces mesh downwards) |

### Sea Ice (2D Physical Shaders)
| Variable | Description |
|---|---|
| `sithick` | Ice Thickness (renders opaque physical block displacing upwards) |
| `siconc` | Ice Fraction (dynamically adjusts opacity of the ice surface) |

### Velocities (3D Particles)
| Variable | Description |
|---|---|
| `currents` | Combined ocean current magnitude and direction |
| `uo` / `vo` | Isolated Zonal and Meridional velocity flow |
| `usi` / `vsi` | Sea ice drift velocities |

---

## 🧭 User Guide

### 🔬 Ocean Explorer Dashboard
The main dashboard is a multi-panel layout with the following regions:

#### Left Sidebar — Data Controls
1. **Dataset Selector** — Browse and switch between available ocean datasets
2. **Variable Picker** — Categorized selection of Water Column, Surface, Ice, and Velocities
3. **Depth Slider** — Select specific depth levels. *Automatically disables with a locked overlay if a 2D surface variable (e.g., Ice Thickness) is selected.*
4. **Timeline Controller** — Play/pause animated time progression over the dataset's valid time range.
5. **Layer Manager** — Toggle visibility of each rendering layer.

#### Center — 3D Visualization Canvas
- **Cesium Globe** with terrain and satellite imagery
- **Three.js Overlays** rendered in synchronized coordinate space:
  - Custom ShaderMaterials for exact physical displacement of waves and ice
  - Animated vector particle flow dynamically anchored to the true dataset max depth
  - 3D isosurface meshes

---

## 🗺 Future Roadmap

| Phase | Feature | Status |
|---|---|---|
| **Phase 1** | Synthetic data visualization | ✅ Complete |
| **Phase 2** | Real Zarr/NetCDF extraction pipeline and Variable-specific routing | ✅ Complete |
| **Phase 3** | Custom ShaderMaterial physics (Sea Ice & Wave displacement) | ✅ Complete |
| **Phase 4** | Real-time Argo float data from INCOIS API | 🔄 Planned |
| **Phase 5** | WebGPU migration for advanced volumetric raymarching | 🔄 Planned |

---

## 📄 License

This project was developed as part of **Smart India Hackathon 2026** (SIH26067).

---

<div align="center">

**Built with ❤️ using React, Three.js, CesiumJS & FastAPI**

*INCOIS 3D Ocean Visualization — Making the ocean's depths visible*

</div>
