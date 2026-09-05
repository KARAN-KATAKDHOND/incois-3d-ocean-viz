<div align="center">

# 🌊 INCOIS 3D Ocean Visualization

An interactive, browser-native 3D platform rendering high-resolution ocean models and real-time autonomous instrument profiles for rapid operational forecasting.

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

**INCOIS 3D Ocean Viz** is a full-stack scientific visualization platform developed for the **Indian National Centre for Ocean Information Services (INCOIS)**. It transforms complex, multi-dimensional ocean data — temperature, salinity, and currents — into intuitive, interactive 3D visualizations on a digital twin globe, enabling researchers and meteorologists to make rapid operational forecasting decisions.

The platform combines the power of **CesiumJS** for geospatial rendering with **Three.js / React Three Fiber** for advanced scientific overlays (volume rendering, isosurfaces, particle systems), backed by a **FastAPI** data processing engine.

| Feature | Description |
|---|---|
| 🌐 **3D Digital Twin Globe** | High-fidelity Cesium globe with real-world terrain and imagery as the base layer |
| 🌡️ **Multi-Variable Visualization** | Temperature, salinity, and ocean current data rendered as volumetric heatmaps, depth slices, and particle trails |
| 📊 **Isosurface Extraction** | Marching-cubes-based 3D isosurface generation for threshold-based analysis (e.g., 25°C thermocline) |
| 🔀 **Dynamic Cross-Sections** | Interactive vertical cross-section slicing between any two geographic points |
| 🎯 **Instrument Tracking** | Real-time Argo float, glider, and moored buoy positions with full depth-profile readouts |
| ⚡ **Current Particle System** | GPU-accelerated animated particle trails showing ocean current velocity and direction |
| 📈 **Model-Observation Comparison** | Side-by-side comparison of numerical model output vs. in-situ observations with bias/RMSE metrics |
| 🎛️ **Layer Management** | Toggle visibility and configure rendering for each data layer independently |
| ⏱️ **Timeline Playback** | Animated time-stepping through 31 time indices with configurable playback speed |
| 📱 **Responsive Dashboard** | Collapsible sidebar panels, floating legends, and mobile-aware layout |

---

## 🧠 Why This Architecture?

Ocean datasets are inherently **massive and multi-dimensional** (latitude × longitude × depth × time × variables). Rendering them in a browser requires a carefully designed client-server split:

| Concern | Solution |
|---|---|
| **Data Volume** | The Python backend performs heavy numerical computation (NumPy/SciPy) and serves only the processed slices, surfaces, and profiles needed by the current view |
| **Rendering Performance** | WebGL-based rendering via Three.js and CesiumJS keeps the visualization GPU-accelerated and interactive at 60fps |
| **Scientific Accuracy** | Synthetic data generators model realistic ocean physics — exponential temperature decay, salinity haloclines, mesoscale eddies, western boundary currents |
| **Future Extensibility** | Architecture supports plugging in real OPeNDAP/ERDDAP data sources without changing the frontend |

> **Result:** Browser-native scientific visualization with lab-grade accuracy, no desktop software required.

---

## 🏛 Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                  INCOIS 3D Ocean Visualization — Architecture            │
└──────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐              ┌──────────────────────┐
    │   React Frontend │    REST API  │   FastAPI Backend     │
    │   (Browser)      │◄────────────►│   (Python Server)     │
    │                  │   JSON/HTTP  │                        │
    │  ┌────────────┐  │              │  ┌──────────────────┐ │
    │  │  CesiumJS  │  │              │  │  Demo Generators  │ │
    │  │  (Globe)   │  │              │  │  (NumPy / SciPy) │ │
    │  └────────────┘  │              │  └──────────────────┘ │
    │  ┌────────────┐  │              │  ┌──────────────────┐ │
    │  │  Three.js  │  │              │  │  Isosurface      │ │
    │  │  R3F/Drei  │  │              │  │  Extraction      │ │
    │  │ (Overlays) │  │              │  │  (Marching Cubes)│ │
    │  └────────────┘  │              │  └──────────────────┘ │
    │  ┌────────────┐  │              │  ┌──────────────────┐ │
    │  │  Recharts  │  │              │  │  Cross-Section   │ │
    │  │  (2D Charts)│  │              │  │  Generator       │ │
    │  └────────────┘  │              │  └──────────────────┘ │
    │  ┌────────────┐  │              └──────────────────────┘
    │  │  Zustand   │  │
    │  │  (State)   │  │              ┌──────────────────────┐
    │  └────────────┘  │              │  Future: OPeNDAP     │
    └──────────────────┘              │  ERDDAP / NetCDF     │
                                      │  (Real Data Sources) │
                                      └──────────────────────┘
```

---

## 📤 Data Flow

### Volumetric Data Request
```
User selects Variable (Temperature) + Time Index + Resolution
              │
              ▼
    ┌──────────────────────────────┐
    │  GET /api/model/volume       │  ── Frontend sends query params
    │  ?variable=temperature       │  ── Backend generates 3D grid
    │  &time_index=5               │  ── NumPy computes field values
    │  &resolution=32              │  ── Returns lat/lon/depth/values
    └──────────┬───────────────────┘
               │  JSON { lat[], lon[], depths[], values[][][] }
               ▼
    ┌──────────────────────────────┐
    │  Three.js Scene              │  ── DepthSlice renders as colored plane
    │  React Three Fiber           │  ── CurrentParticles animate flow
    │  Cesium Globe                │  ── OceanSurface overlays heatmap
    └──────────────────────────────┘
               │
               ▼
      🌊 Interactive 3D visualization on the digital twin globe
```

### Observation Profile Request
```
User clicks Argo Float marker on the globe
              │
              ▼
    ┌──────────────────────────────┐
    │  GET /api/observations/:id/  │  ── Fetch instrument details
    │  profile?variable=temperature│  ── Generate synthetic depth profile
    └──────────┬───────────────────┘
               │  JSON { depths[], values[], metadata }
               ▼
    ┌──────────────────────────────┐
    │  InstrumentDetailPanel       │  ── Displays metadata card
    │  ProfileChart (Recharts)     │  ── Renders depth-vs-variable curve
    │  ComparePanel                │  ── Optional model comparison overlay
    └──────────────────────────────┘
               │
               ▼
      📈 Depth profile with model-observation comparison
```

---

## 🛠 Tech Stack

### Frontend (`frontend/`)
| Technology | Version | Purpose |
|---|---|---|
| React | 19.2.8 | UI framework with concurrent features |
| TypeScript | 6.0 | Type-safe development |
| Vite | 8.2 | Lightning-fast HMR and bundling |
| CesiumJS | 1.145 | Geospatial 3D globe engine (terrain, imagery, entities) |
| Three.js | r185 | WebGL-based 3D scene graph for scientific overlays |
| React Three Fiber | 9.7 | Declarative Three.js via React components |
| @react-three/drei | 10.7 | Helper components (shaders, controls, geometries) |
| TailwindCSS | 4.3 | Utility-first CSS with dark mode support |
| Zustand | 5.0 | Lightweight reactive state management |
| Recharts | 3.10 | Composable chart library for profiles & cross-sections |
| Lucide React | 1.39 | Modern icon set |
| React Router | 7.18 | Client-side routing |

### Backend (`backend/`)
| Technology | Version | Purpose |
|---|---|---|
| FastAPI | 0.141 | Async Python web framework with auto-generated OpenAPI docs |
| Uvicorn | 0.52 | ASGI server with hot reload |
| NumPy | 2.5 | N-dimensional array computation for ocean field generation |
| Pandas | 3.0 | Tabular data manipulation for observations |
| SciPy | 1.18 | Scientific computing — interpolation, signal processing |
| Pydantic | 2.13 | Request/response validation and serialization |

### Data Pipeline (`data-pipeline/`)
| Technology | Purpose |
|---|---|
| Docker | Containerized pipeline execution |
| Python scripts | Automated data fetching and preprocessing |

---

## 📁 Project Structure

```
incois-3d-ocean-viz/
│
├── frontend/                          # React + TypeScript SPA
│   ├── src/
│   │   ├── App.tsx                    # Root router — Landing / Visualization
│   │   ├── main.tsx                   # React DOM entry point
│   │   ├── index.css                  # Global styles + Tailwind directives
│   │   │
│   │   ├── 3d/                        # Three.js / R3F overlay components
│   │   │   ├── OceanScene.tsx         # Main R3F canvas orchestrator
│   │   │   ├── OceanSurface.tsx       # Surface heatmap mesh
│   │   │   ├── DepthSlice.tsx         # 2D horizontal depth slice renderer
│   │   │   ├── DepthBox.tsx           # 3D bounding box for depth context
│   │   │   ├── IsosurfaceMesh.tsx     # Marching-cubes isosurface geometry
│   │   │   ├── CurrentParticles.tsx   # Animated GPU particle system
│   │   │   ├── CoastlineLines.tsx     # Geographic coastline overlay
│   │   │   ├── GridOverlay.tsx        # Lat/lon grid lines
│   │   │   └── ObservationMarkers.tsx # Argo/Glider/Buoy 3D markers
│   │   │
│   │   ├── charts/                    # 2D data visualization (Recharts)
│   │   │   ├── ProfileChart.tsx       # Depth-vs-variable profile curve
│   │   │   ├── CrossSectionChart.tsx  # Vertical cross-section heatmap
│   │   │   └── ComparisonChart.tsx    # Model-vs-observation overlay
│   │   │
│   │   ├── components/
│   │   │   ├── layout/                # App shell layout
│   │   │   │   ├── TopBar.tsx         # Header with branding & controls
│   │   │   │   ├── LeftSidebar.tsx    # Collapsible data control sidebar
│   │   │   │   ├── RightPanel.tsx     # Instrument detail panel container
│   │   │   │   ├── MapLeftSidebar.tsx # Globe-mode left sidebar
│   │   │   │   └── MapRightPanel.tsx  # Globe-mode right panel
│   │   │   │
│   │   │   ├── panels/               # Feature-specific control panels
│   │   │   │   ├── DatasetPanel.tsx           # Dataset browser & selector
│   │   │   │   ├── VariableSelector.tsx       # Temperature / Salinity / Currents
│   │   │   │   ├── DepthSlider.tsx            # Depth level slider control
│   │   │   │   ├── TimelineController.tsx     # Animated time playback
│   │   │   │   ├── LayerManager.tsx           # Layer visibility toggles
│   │   │   │   ├── IsosurfaceControls.tsx     # Threshold & isosurface config
│   │   │   │   ├── CrossSectionPanel.tsx      # Cross-section line endpoints
│   │   │   │   ├── InstrumentDetailPanel.tsx  # Observation instrument readouts
│   │   │   │   ├── ComparePanel.tsx           # Model-vs-observation comparison
│   │   │   │   ├── ProbePanel.tsx             # Point probe data inspector
│   │   │   │   ├── ColorbarEditor.tsx         # Color ramp customization
│   │   │   │   ├── FloatingLegend.tsx         # Overlay color legend
│   │   │   │   ├── VerticalExaggeration.tsx   # Z-scale exaggeration slider
│   │   │   │   └── VisualizationModeSelector.tsx # Slice / Volume / Surface toggle
│   │   │   │
│   │   │   ├── MapCanvas.jsx          # Cesium globe canvas wrapper
│   │   │   └── Sidebar.jsx            # Legacy sidebar component
│   │   │
│   │   ├── pages/
│   │   │   ├── GlobeLanding.tsx       # Cinematic landing page with globe
│   │   │   └── OceanExplorer.tsx      # Main visualization dashboard
│   │   │
│   │   ├── stores/
│   │   │   ├── oceanStore.ts          # Zustand store — ocean data state
│   │   │   └── useMapStore.js         # Zustand store — map/globe state
│   │   │
│   │   ├── services/                  # API client functions
│   │   ├── hooks/                     # Custom React hooks
│   │   ├── types/                     # TypeScript type definitions
│   │   └── utils/                     # Shared utility functions
│   │
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                           # FastAPI Python server
│   ├── main.py                        # Application entry — all route definitions
│   ├── requirements.txt               # Python dependencies
│   │
│   ├── models/
│   │   └── schemas.py                 # Pydantic models & enums
│   │
│   ├── services/
│   │   └── demo_data.py               # Synthetic ocean data generators
│   │
│   ├── visualization/
│   │   └── isosurface.py              # Marching-cubes isosurface extraction
│   │
│   ├── scripts/
│   │   └── fetch_real_data.py         # Data fetching utilities
│   │
│   ├── ingestion/                     # Data ingestion pipelines
│   ├── data/                          # Static data files
│   └── tests/                         # Backend test suite
│
├── data-pipeline/                     # Containerized data processing
│   ├── Dockerfile
│   ├── requirements.txt
│   └── pipeline/                      # Pipeline scripts
│
└── README.md
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

### Step 4 — Verify Everything is Running

```bash
# Test the backend health endpoint
curl http://localhost:8000/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "mode": "demo",
  "version": "1.0.0-demo"
}
```

---

## 📡 API Documentation

Base URL: `http://localhost:8000`

Full interactive documentation is auto-generated at [`/api/docs`](http://localhost:8000/api/docs) (Swagger UI).

### Dataset Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/datasets` | List all available datasets |
| `GET` | `/api/datasets/{dataset_id}` | Get dataset metadata |
| `GET` | `/api/datasets/{dataset_id}/variables` | List available variables |
| `GET` | `/api/datasets/{dataset_id}/times` | List available time steps |
| `GET` | `/api/datasets/{dataset_id}/depths` | List available depth levels |

### Model Data Endpoints

| Method | Endpoint | Parameters | Description |
|---|---|---|---|
| `GET` | `/api/model/volume` | `dataset_id`, `variable`, `time_index`, `resolution` | 3D volumetric data grid |
| `GET` | `/api/model/slice` | `dataset_id`, `variable`, `depth_index`, `time_index` | 2D horizontal depth slice |
| `GET` | `/api/model/isosurface` | `dataset_id`, `variable`, `threshold`, `time_index` | Isosurface mesh (vertices + faces) |
| `GET` | `/api/model/crosssection` | `dataset_id`, `variable`, `lat1`, `lon1`, `lat2`, `lon2`, `time_index` | Vertical cross-section between two points |

### Observation Endpoints

| Method | Endpoint | Parameters | Description |
|---|---|---|---|
| `GET` | `/api/observations` | `instrument_type`, `variable`, `lat_min/max`, `lon_min/max`, `depth_min/max`, `quality`, `search` | Filtered list of observation instruments |
| `GET` | `/api/observations/{obs_id}` | — | Single observation details |
| `GET` | `/api/observations/{obs_id}/profile` | `variable` | Depth-vs-variable profile data |

### Comparison & Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/compare` | Compare model output with observation data (bias, RMSE) |
| `GET` | `/api/health` | API health check |

### Supported Variables
| Enum Value | Description |
|---|---|
| `temperature` | Sea water temperature (°C) |
| `salinity` | Sea water salinity (PSU) |
| `currents` | Ocean current velocity (m/s) with U/V components |

### Instrument Types
| Enum Value | Description |
|---|---|
| `argo_float` | Argo autonomous profiling float |
| `glider` | Underwater autonomous glider |
| `moored_buoy` | Fixed-position moored buoy |

---

## 🧭 User Guide

### 🌐 Landing Page
The application opens with a cinematic **3D globe landing page** featuring:
- Interactive rotating Earth visualization
- Quick-access navigation to the Ocean Explorer dashboard
- Project branding and context

### 🔬 Ocean Explorer Dashboard
The main dashboard is a multi-panel layout with the following regions:

#### Left Sidebar — Data Controls
1. **Dataset Selector** — Browse and switch between available ocean datasets
2. **Variable Picker** — Toggle between Temperature, Salinity, and Currents
3. **Depth Slider** — Select specific depth levels for 2D slice rendering
4. **Timeline Controller** — Play/pause animated time progression with adjustable speed
5. **Layer Manager** — Toggle visibility of each rendering layer (surface, slices, isosurfaces, particles, markers)
6. **Isosurface Controls** — Set threshold values for isosurface extraction
7. **Cross-Section Panel** — Define start/end coordinates for vertical cross-section slicing

#### Center — 3D Visualization Canvas
- **Cesium Globe** with terrain and satellite imagery
- **Three.js Overlays** rendered in synchronized coordinate space:
  - Heatmap surfaces, depth slices, coastline lines, grid overlays
  - Animated current particle trails
  - 3D isosurface meshes
  - Observation instrument markers (Argo, Glider, Buoy)

#### Right Panel — Analysis Tools
- **Instrument Detail Panel** — Click any marker to see metadata, depth profile charts, and raw data
- **Comparison Panel** — Compare model predictions with actual observations
- **Probe Inspector** — Point-click data probing for exact values at any location
- **Colorbar Editor** — Customize color ramps for each variable
- **Floating Legend** — Persistent legend overlay on the visualization

---

## 🎨 Design System

The platform uses a **dark scientific dashboard** theme optimized for data-dense visualization.

### Color Tokens

| Token | Value | Usage |
|---|---|---|
| Background | `slate-950` (#020617) | Application background |
| Surface | `slate-900` / `white/5` | Sidebar panels, cards |
| Border | `white/10` | Subtle dividers |
| Primary | `cyan-500` (#06B6D4) | Active controls, links, highlights |
| Secondary | `blue-600` (#2563EB) | Secondary actions, gradient endpoints |
| Temperature | `red-500` → `blue-500` | Temperature colormap (warm → cold) |
| Salinity | `green-400` → `purple-500` | Salinity colormap (fresh → saline) |
| Currents | `yellow-300` → `cyan-400` | Current velocity colormap |
| Success | `emerald-400` (#34D399) | Status indicators, health checks |
| Warning | `amber-400` (#FBBF24) | Warnings, pending states |
| Error | `red-400` (#F87171) | Error messages, failed requests |
| Text | `white` / `slate-400` | Primary / secondary text |

### Typography
| Element | Font | Weight |
|---|---|---|
| Headings | System sans-serif stack | Semibold (600) |
| Body | System sans-serif stack | Regular (400) |
| Code / Data | Monospace stack | Regular (400) |

### Animations & Interactions
| Animation | Technology | Usage |
|---|---|---|
| Globe rotation | CesiumJS | Smooth orbit on landing page |
| Particle trails | Three.js / WebGL | Animated ocean current visualization |
| Panel transitions | TailwindCSS transitions | Sidebar expand/collapse |
| Hover effects | TailwindCSS | Button and card hover states |
| Timeline scrub | React state | Smooth time-step interpolation |
| Chart animations | Recharts | Animated data transitions in profiles |

---

## 🗺 Future Roadmap

| Phase | Feature | Status |
|---|---|---|
| **Phase 1** | Synthetic data visualization (current) | ✅ Complete |
| **Phase 2** | Real OPeNDAP/ERDDAP data integration | 🔄 Planned |
| **Phase 3** | INCOIS ROMS model output ingestion | 🔄 Planned |
| **Phase 4** | Real-time Argo float data from INCOIS API | 🔄 Planned |
| **Phase 5** | Collaborative annotation & sharing | 🔄 Planned |
| **Phase 6** | WebGPU migration for volume rendering | 🔄 Planned |

---

## 📄 License

This project was developed as part of **Smart India Hackathon 2026** (SIH26067).

---

<div align="center">

**Built with ❤️ using React, Three.js, CesiumJS & FastAPI**

*INCOIS 3D Ocean Visualization — Making the ocean's depths visible*

</div>
