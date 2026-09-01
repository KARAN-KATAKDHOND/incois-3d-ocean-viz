import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Viewer, 
  Cartesian3, 
  createWorldTerrainAsync, 
  NearFarScalar, 
  Color, 
  CustomDataSource,
  CallbackProperty,
  ColorMaterialProperty,
  Cartographic,
  Math as CesiumMath,
  defined
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css'; 
import { useMapStore } from '../store/useMapStore';
import { Play, Pause, Loader, Plus, Minus } from 'lucide-react';

// ─── Color Mapping Utilities ────────────────────────────────────

/**
 * Dynamic colormap: maps a value within [min, max] to a color.
 * Uses a smooth blue → cyan → green → yellow → red gradient.
 */
const getValueColor = (value, min, max, alpha = 0.6) => {
  if (value === null || value === undefined || isNaN(value)) {
    return Color.TRANSPARENT;
  }
  const range = max - min;
  if (range === 0) return Color.fromCssColorString('#FFD700').withAlpha(alpha);
  
  const t = Math.max(0, Math.min(1, (value - min) / range));
  
  // 5-stop colormap: deep blue → cyan → green → yellow → red
  let r, g, b;
  if (t < 0.25) {
    const s = t / 0.25;
    r = 0;          g = s;          b = 1;           // blue → cyan
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    r = 0;          g = 1;          b = 1 - s;       // cyan → green
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    r = s;          g = 1;          b = 0;            // green → yellow
  } else {
    const s = (t - 0.75) / 0.25;
    r = 1;          g = 1 - s;      b = 0;            // yellow → red
  }
  
  return new Color(r, g, b, alpha);
};

const getTemperatureColor = (temp) => {
  if (temp > 30) return Color.fromCssColorString('#FF0000').withAlpha(0.6); 
  if (temp > 28) return Color.fromCssColorString('#FF4500').withAlpha(0.6);
  if (temp > 25) return Color.fromCssColorString('#FFD700').withAlpha(0.6);
  return Color.fromCssColorString('#00BFFF').withAlpha(0.6);
};

export default function MapCanvas() {
  const cesiumContainer = useRef(null);
  const viewerRef = useRef(null);
  const dataSourceRef = useRef(null);
  const sliceDataSourceRef = useRef(null);

  // Zustand State
  const { 
    timeStep, setTimeStep, activeLayers, verticalExaggeration, layerOpacity,
    sliceData, insituData, activeVariable,
    fetchDatasets, fetchSlice, fetchProfile,
    activeDatasetId, activeDepthIdx, activeTimeIdx,
    isLoadingSlice, isLoadingInsitu,
    datasetMetadata,
  } = useMapStore();
  
  // High-Performance Refs for 60FPS animation
  const timeStepRef = useRef(timeStep);
  const exaggerationRef = useRef(verticalExaggeration);
  
  useEffect(() => { timeStepRef.current = timeStep; }, [timeStep]);
  useEffect(() => { exaggerationRef.current = verticalExaggeration; }, [verticalExaggeration]);

  const [fallbackData, setFallbackData] = useState({ instruments: [], sst_grid: [], wind_vectors: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // 1. Initialize Cesium safely
  useEffect(() => {
    if (viewerRef.current || !cesiumContainer.current) return;

    const initCesium = async () => {
      try {
        viewerRef.current = new Viewer(cesiumContainer.current, {
          animation: false, 
          timeline: false, 
          baseLayerPicker: false, 
          geocoder: false,
          homeButton: false, 
          navigationHelpButton: false, 
          sceneModePicker: false, 
          fullscreenButton: false,
          creditContainer: document.createElement('div'),
        });

        const viewer = viewerRef.current;
        viewer.scene.globe.enableLighting = true; 
        viewer.scene.globe.translucency.enabled = true;
        viewer.scene.globe.translucency.frontFaceAlphaByDistance = new NearFarScalar(100.0, 0.4, 8000000.0, 1.0);
        viewer.scene.globe.depthTestAgainstTerrain = true;
        
        // Explicitly Unlock Camera
        viewer.scene.screenSpaceCameraController.enableRotate = true;
        viewer.scene.screenSpaceCameraController.enableTranslate = true;
        viewer.scene.screenSpaceCameraController.enableZoom = true;
        viewer.scene.screenSpaceCameraController.enableTilt = true;
        viewer.scene.screenSpaceCameraController.enableLook = true;

        viewer.camera.setView({ 
          destination: Cartesian3.fromDegrees(72.0, 12.0, 6000000.0) 
        });

        // Fallback data source (for static mock data)
        dataSourceRef.current = new CustomDataSource('ocean-data');
        viewer.dataSources.add(dataSourceRef.current);

        // API-driven slice data source
        sliceDataSourceRef.current = new CustomDataSource('slice-data');
        viewer.dataSources.add(sliceDataSourceRef.current);

        // Load terrain asynchronously AFTER the camera is unlocked
        viewer.terrainProvider = await createWorldTerrainAsync();

        // Click handler for depth profiles
        viewer.screenSpaceEventHandler.setInputAction((click) => {
          const cartesian = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
          if (defined(cartesian)) {
            const carto = Cartographic.fromCartesian(cartesian);
            const lat = CesiumMath.toDegrees(carto.latitude);
            const lon = CesiumMath.toDegrees(carto.longitude);
            fetchProfile(lat, lon);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

      } catch (error) {
        console.error("Cesium Initialization Error:", error);
      }
    };

    initCesium();
    
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // 2. Fetch datasets from API on mount
  useEffect(() => {
    fetchDatasets();
  }, []);

  // 3. Fetch data — API slices or fallback to static JSON
  useEffect(() => {
    if (activeDatasetId) {
      fetchSlice();
    } else {
      // Fallback to static mock data
      const fetchFallback = async () => {
        setIsLoading(true);
        try {
          const response = await fetch('/dummy_argo_data.json');
          if (response.ok) setFallbackData(await response.json());
        } catch (error) {
          console.warn("Could not fetch fallback data.", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchFallback();
    }
  }, [activeDatasetId, activeVariable, activeDepthIdx, activeTimeIdx]);

  // 4. Playback Simulation Loop
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        const currentStep = useMapStore.getState().timeStep; 
        const maxSteps = datasetMetadata?.time_steps || 100;
        setTimeStep(currentStep >= maxSteps - 1 ? 0 : currentStep + 1);
      }, 100); 
    }
    return () => clearInterval(interval);
  }, [isPlaying, setTimeStep, datasetMetadata]);

  // 5. Render API-driven slice data as Cesium entities
  useEffect(() => {
    if (!sliceDataSourceRef.current) return;
    const ds = sliceDataSourceRef.current;
    ds.entities.removeAll();

    if (!sliceData || !activeLayers.sst) return;

    const { lat, lon, values, stats } = sliceData;
    if (!lat || !lon || !values || !stats) return;

    const min = stats.min ?? 0;
    const max = stats.max ?? 1;
    const opacity = layerOpacity;

    // Calculate cell size for ellipses
    const latStep = lat.length > 1 ? Math.abs(lat[1] - lat[0]) : 1;
    const lonStep = lon.length > 1 ? Math.abs(lon[1] - lon[0]) : 1;
    const cellRadius = Math.min(latStep, lonStep) * 111000 * 0.45; // degrees → meters, slight overlap

    // Sub-sample for performance: show every Nth point if grid is dense
    const maxPoints = 2500;
    const totalPoints = lat.length * lon.length;
    const step = Math.max(1, Math.floor(Math.sqrt(totalPoints / maxPoints)));

    for (let i = 0; i < lat.length; i += step) {
      for (let j = 0; j < lon.length; j += step) {
        const val = values[i]?.[j];
        if (val === null || val === undefined) continue;

        const color = getValueColor(val, min, max, opacity);

        ds.entities.add({
          id: `slice-${i}-${j}`,
          position: Cartesian3.fromDegrees(lon[j], lat[i], 0),
          ellipse: {
            semiMinorAxis: cellRadius * step,
            semiMajorAxis: cellRadius * step,
            material: color,
            height: 0,
          },
        });
      }
    }
  }, [sliceData, activeLayers.sst, layerOpacity]);

  // 6. Render fallback static entities (Argo, SST, wind vectors)
  useEffect(() => {
    if (!dataSourceRef.current) return;
    const dataSource = dataSourceRef.current;
    dataSource.entities.removeAll();

    // If we have API-driven insitu data, render it
    if (insituData && insituData.features) {
      insituData.features.forEach((feat, i) => {
        const coords = feat.geometry.coordinates;
        const props = feat.properties;
        const isArgo = props.instrument_type === 'argo';
        const show = isArgo ? activeLayers.argo : activeLayers.gliders;

        dataSource.entities.add({
          id: `insitu-${i}`,
          show,
          position: new CallbackProperty(() => {
            const ex = exaggerationRef.current;
            const depth = (coords[2] || 0) * ex;
            return Cartesian3.fromDegrees(coords[0], coords[1], depth);
          }, false),
          point: {
            pixelSize: isArgo ? 12 : 16,
            color: getTemperatureColor(props.temperature || 20),
            outlineColor: isArgo ? Color.WHITE : Color.PURPLE,
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          properties: { type: props.instrument_type },
        });
      });
      return;
    }

    // Otherwise, render fallback static data
    if (!fallbackData.instruments) return;

    // A. Argo Floats & Gliders
    fallbackData.instruments.forEach((d) => {
      dataSource.entities.add({
        id: `${d.id}-${d.coordinates[2]}`,
        show: d.type === 'argo' ? activeLayers.argo : activeLayers.gliders,
        position: new CallbackProperty(() => {
          const step = timeStepRef.current;
          const ex = exaggerationRef.current;
          const simulatedLon = d.coordinates[0] + (step * 0.005);
          const simulatedLat = d.coordinates[1] + Math.sin(step * 0.1) * 0.2;
          const depth = (d.coordinates[2] < 0 ? d.coordinates[2] : -d.coordinates[2]) * ex;
          return Cartesian3.fromDegrees(simulatedLon, simulatedLat, depth);
        }, false),
        point: {
          pixelSize: d.type === 'glider' ? 16 : 12,
          color: getTemperatureColor(d.temperature),
          outlineColor: d.type === 'glider' ? Color.PURPLE : Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        properties: { type: d.type }
      });
    });

    // B. SST Heatmap Grids (fallback only if no API slice)
    if (!sliceData && fallbackData.sst_grid) {
      fallbackData.sst_grid.forEach((d, i) => {
        dataSource.entities.add({
          id: `sst-${i}`,
          show: activeLayers.sst,
          position: Cartesian3.fromDegrees(d.coordinates[0], d.coordinates[1], 0),
          ellipse: {
            semiMinorAxis: 120000.0, 
            semiMajorAxis: 120000.0,
            material: new ColorMaterialProperty(new CallbackProperty(() => {
              return getTemperatureColor(d.base_temp + (timeStepRef.current * 0.05));
            }, false)),
            height: 0
          }
        });
      });
    }

    // C. Wind / Current Vectors
    if (fallbackData.wind_vectors) {
      fallbackData.wind_vectors.forEach((d, i) => {
        dataSource.entities.add({
          id: `wind-${i}`,
          show: activeLayers.salinity, 
          polyline: {
            positions: new CallbackProperty(() => {
              const step = timeStepRef.current;
              const lengthMultiplier = (step % 20) * 0.15;
              const endLon = d.coordinates[0] + (d.u * lengthMultiplier);
              const endLat = d.coordinates[1] + (d.v * lengthMultiplier);
              return Cartesian3.fromDegreesArray([d.coordinates[0], d.coordinates[1], endLon, endLat]);
            }, false),
            width: 4,
            material: Color.WHITE.withAlpha(0.8)
          }
        });
      });
    }
  }, [fallbackData, insituData, activeLayers, sliceData]); 

  const handleZoomIn = () => viewerRef.current?.camera.zoomIn(1500000);
  const handleZoomOut = () => viewerRef.current?.camera.zoomOut(1500000);

  const maxTimeSteps = datasetMetadata?.time_steps || 100;

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden">
      
      {/* Cesium Container */}
      <div ref={cesiumContainer} className="absolute inset-0 z-0" />

      {/* Loading Indicators */}
      {(isLoading || isLoadingSlice) && (
         <div className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-full backdrop-blur-md border border-blue-500/30 text-xs font-semibold shadow-lg">
           <Loader size={14} className="animate-spin" /> 
           {isLoadingSlice ? 'Loading Slice Data...' : 'Live Data Sync'}
         </div>
      )}

      {/* Colorbar Legend (when slice data is available) */}
      {sliceData && sliceData.stats && activeLayers.sst && (
        <div className="absolute top-4 left-4 z-30 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl p-3 shadow-2xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-semibold">
            {sliceData.variable} ({sliceData.units})
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-24 rounded-sm" style={{
              background: 'linear-gradient(to top, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF0000)',
            }} />
            <div className="flex flex-col justify-between h-24 text-[10px] text-slate-300 font-mono">
              <span>{sliceData.stats.max?.toFixed(1)}</span>
              <span>{sliceData.stats.mean?.toFixed(1)}</span>
              <span>{sliceData.stats.min?.toFixed(1)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-30 flex flex-col bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
        <button onClick={handleZoomIn} className="p-3 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border-b border-slate-700"><Plus size={18} /></button>
        <button onClick={handleZoomOut} className="p-3 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"><Minus size={18} /></button>
      </div>

      {/* Timeline Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-11/12 max-w-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl p-4 z-20 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setIsPlaying(!isPlaying)} className={`p-2 rounded-full transition-colors flex items-center justify-center text-white ${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-500'}`}>
             {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-1" />}
          </button>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
              {activeDatasetId ? 'Time Step' : 'Simulation Time'}
            </span>
            <span className="text-sm font-mono text-blue-600 dark:text-blue-400">
              {activeDatasetId 
                ? `Step ${timeStep} / ${maxTimeSteps}` 
                : `Jan 15, 2025 - ${String(Math.floor((timeStep / 100) * 24)).padStart(2, '0')}:00 UTC`
              }
            </span>
          </div>
        </div>
        <input 
          type="range" 
          className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none" 
          min="0" 
          max={maxTimeSteps - 1} 
          value={timeStep} 
          onChange={(e) => { 
            setIsPlaying(false); 
            setTimeStep(parseInt(e.target.value)); 
          }} 
        />
      </div>
    </div>
  );
}