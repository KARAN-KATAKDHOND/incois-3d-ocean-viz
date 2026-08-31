# INCOIS 3D Ocean Data Visualization System

<div align="center">

[![Smart India Hackathon](https://img.shields.io/badge/SIH-2026-blue.svg)](https://www.sih.gov.in/)
[![Ministry of Earth Sciences](https://img.shields.io/badge/MoES-Government%20of%20India-orange.svg)](https://moes.gov.in/)
[![CesiumJS](https://img.shields.io/badge/3D%20Engine-CesiumJS-green.svg)](https://cesium.com/)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blueviolet.svg)](https://react.dev/)

*A high-performance, browser-native 3D ocean data visualization platform developed for the Indian National Centre for Ocean Information Services (INCOIS).*

</div>

---

## 🌊 Overview

The INCOIS 3D Ocean Data Visualization System eliminates fragmented workflows by providing a single, unified 3D operational workspace. It co-visualizes complex depth-resolved ocean models (Sea Surface Temperature fields, Salinity grids, and Current vectors) alongside real-time autonomous instrument observations (Argo floats and Underwater gliders) on a high-fidelity 3D globe[cite: 1].

---

## ✨ Key Features

* **Advanced 3D Geospatial Engine:** Powered by CesiumJS with real-world topography (`createWorldTerrainAsync`), dynamic solar lighting, and globe translucency for deep ocean viewing.
* **4D Temporal Simulations:** Interactive timeline controls with 60 FPS GPU-accelerated spatial animations (`CallbackProperty`).
* **Multi-Layer Data Co-Visualization:** Toggle dynamically between Sea Surface Temperature (SST) heatmaps, salinity current vectors, Argo profiling floats, and underwater gliders.
* **Professional Operational Controls:** Role-based access authentication (FastAPI + JWT mock), vertical depth exaggeration sliders, and custom zoom/rotation camera tools mirroring Google Earth.

---

## 🛠️ Tech Stack

* **Frontend:** React, Vite, Tailwind CSS, Zustand (Global State Management)
* **3D Visualization:** CesiumJS (WebGL/WGS84 Globe)
* **Backend:** Python FastAPI, SQLite (Authentication & User Management)[cite: 1]

---

## 🚀 Quick Start & Installation

Run the following commands in your terminal to clone, setup, and run the project locally:

```bash
# Clone the repository
git clone [https://github.com/karan-katakdhond/incois-3d-ocean-viz.git](https://github.com/karan-katakdhond/incois-3d-ocean-viz.git)

# Navigate into the project directory
cd incois-3d-ocean-viz/frontend

# Install dependencies
npm install

# Start the development server
npm run dev