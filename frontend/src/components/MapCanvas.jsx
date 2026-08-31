import { useEffect, useRef, useState } from 'react';
import { 
  Viewer, 
  Cartesian3, 
  createWorldTerrainAsync, 
  NearFarScalar, 
  Color, 
  CustomDataSource,
  CallbackProperty,
  ColorMaterialProperty
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css'; 
import { useMapStore } from '../store/useMapStore';
import { Play, Pause, Loader, Plus, Minus } from 'lucide-react';

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

  // Zustand State
  const { timeStep, setTimeStep, activeLayers, verticalExaggeration } = useMapStore();
  
  // High-Performance Refs for 60FPS animation
  const timeStepRef = useRef(timeStep);
  const exaggerationRef = useRef(verticalExaggeration);
  
  useEffect(() => { timeStepRef.current = timeStep; }, [timeStep]);
  useEffect(() => { exaggerationRef.current = verticalExaggeration; }, [verticalExaggeration]);

  const [data, setData] = useState({ instruments: [], sst_grid: [], wind_vectors: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // 1. Initialize Cesium safely
  useEffect(() => {
    if (viewerRef.current || !cesiumContainer.current) return; // Prevent double initialization

    const initCesium = async () => {
      try {
        // We initialize without terrain first to guarantee the camera doesn't lock
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

        dataSourceRef.current = new CustomDataSource('ocean-data');
        viewer.dataSources.add(dataSourceRef.current);

        // Load terrain asynchronously AFTER the camera is unlocked so it doesn't freeze the viewer
        viewer.terrainProvider = await createWorldTerrainAsync();

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

  // 2. Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/dummy_argo_data.json');
        if (response.ok) setData(await response.json());
      } catch (error) {
        console.warn("Could not fetch data.", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // 3. Playback Simulation Loop
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        const currentStep = useMapStore.getState().timeStep; 
        setTimeStep(currentStep >= 100 ? 0 : currentStep + 1);
      }, 100); 
    }
    return () => clearInterval(interval);
  }, [isPlaying, setTimeStep]);

  // 4. Render 3D Entities using CallbackProperty
  useEffect(() => {
    if (!dataSourceRef.current || !data.instruments) return;
    const dataSource = dataSourceRef.current;
    dataSource.entities.removeAll();

    // A. Argo Floats & Gliders
    data.instruments.forEach((d) => {
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

    // B. SST Heatmap Grids
    if (data.sst_grid) {
      data.sst_grid.forEach((d, i) => {
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
    if (data.wind_vectors) {
      data.wind_vectors.forEach((d, i) => {
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
  }, [data, activeLayers]); 

  const handleZoomIn = () => viewerRef.current?.camera.zoomIn(1500000);
  const handleZoomOut = () => viewerRef.current?.camera.zoomOut(1500000);

  return (
    // REMOVED pointer-events-none completely to ensure mouse events register normally
    <div className="relative w-full h-full bg-slate-950 overflow-hidden">
      
      {/* Cesium Container (Z-index 0, naturally receives clicks) */}
      <div ref={cesiumContainer} className="absolute inset-0 z-0" />

      {isLoading && (
         <div className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-full backdrop-blur-md border border-blue-500/30 text-xs font-semibold shadow-lg">
           <Loader size={14} className="animate-spin" /> Live Data Sync
         </div>
      )}

      {/* Zoom Controls (Z-index 30, placed over the map) */}
      <div className="absolute top-4 right-4 z-30 flex flex-col bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
        <button onClick={handleZoomIn} className="p-3 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border-b border-slate-700"><Plus size={18} /></button>
        <button onClick={handleZoomOut} className="p-3 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"><Minus size={18} /></button>
      </div>

      {/* Timeline Controls (Z-index 20, placed over the map) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-11/12 max-w-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl p-4 z-20 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setIsPlaying(!isPlaying)} className={`p-2 rounded-full transition-colors flex items-center justify-center text-white ${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-500'}`}>
             {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-1" />}
          </button>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Simulation Time</span>
            <span className="text-sm font-mono text-blue-600 dark:text-blue-400">Jan 15, 2025 - {String(Math.floor((timeStep / 100) * 24)).padStart(2, '0')}:00 UTC</span>
          </div>
        </div>
        <input type="range" className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none" min="0" max="100" value={timeStep} onChange={(e) => { setIsPlaying(false); setTimeStep(parseInt(e.target.value)); }} />
      </div>
    </div>
  );
}