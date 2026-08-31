import { useEffect, useRef, useState, useCallback } from 'react';
import { Viewer, Cartesian3, UrlTemplateImageryProvider } from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css'; 
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer } from '@deck.gl/layers';
import { useMapStore } from '../store/useMapStore';
import { Play, Loader, Plus, Minus } from 'lucide-react';

const getTemperatureColor = (temp) => {
  if (temp > 28) return [255, 69, 0, 200];
  if (temp > 20) return [255, 215, 0, 200];
  return [0, 191, 255, 200];
};

export default function MapCanvas() {
  const cesiumContainer = useRef(null);
  const viewerRef = useRef(null);
  const isMounted = useRef(false);

  // Optimized initial view centered on the Indian Ocean with a wide enough zoom to see the globe
  const [viewState, setViewState] = useState({
    longitude: 78.0,
    latitude: 15.0,
    zoom: 3.2,
    pitch: 0,
    bearing: 0
  });

  const { timeStep, setTimeStep, activeLayers, verticalExaggeration } = useMapStore();
  const [instrumentData, setInstrumentData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Initialize Cesium Basemap
  useEffect(() => {
    if (isMounted.current || !cesiumContainer.current) return;
    isMounted.current = true;

    try {
      viewerRef.current = new Viewer(cesiumContainer.current, {
        terrainProvider: undefined,
        imageryProvider: new UrlTemplateImageryProvider({
          url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
          maximumLevel: 19
        }),
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

      // Set initial globe position explicitly via Cesium camera
      viewerRef.current.camera.setView({
        destination: Cartesian3.fromDegrees(78.0, 15.0, 15000000.0) // High altitude view to capture the whole frame
      });

    } catch (error) {
      console.error("Cesium Initialization Error:", error);
    }

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
        isMounted.current = false;
      }
    };
  }, []);

  // 2. Fetch Dummy Data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/dummy_argo_data.json');
        if (response.ok) {
          const data = await response.json();
          setInstrumentData(data);
        }
      } catch (error) {
        console.warn("Could not fetch dummy_argo_data.json from public folder.", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // 3. Sync Deck.gl Camera with Cesium Camera
  const onViewStateChange = useCallback(({ viewState: newViewState }) => {
    setViewState(newViewState);
    if (viewerRef.current && viewerRef.current.camera) {
      viewerRef.current.camera.setView({
        destination: Cartesian3.fromDegrees(
          newViewState.longitude,
          newViewState.latitude,
          Math.max(500000, 20000000 / Math.pow(2, newViewState.zoom - 1)) 
        ),
        orientation: {
          heading: (newViewState.bearing * Math.PI) / 180,
          pitch: ((newViewState.pitch - 90) * Math.PI) / 180,
          roll: 0.0,
        }
      });
    }
  }, []);

  // Zoom Controllers
  const handleZoomIn = () => {
    setViewState(prev => ({ ...prev, zoom: Math.min(prev.zoom + 0.5, 15) }));
  };

  const handleZoomOut = () => {
    setViewState(prev => ({ ...prev, zoom: Math.max(prev.zoom - 0.5, 1) }));
  };

  // 4. Construct GPU Layers
  const layers = [
    activeLayers.argo && new ScatterplotLayer({
      id: 'argo-floats-3d',
      data: instrumentData,
      pickable: true,
      opacity: 0.8,
      stroked: true,
      filled: true,
      radiusScale: 15000,
      radiusMinPixels: 4,
      radiusMaxPixels: 35,
      getPosition: d => [d.coordinates[0], d.coordinates[1], d.coordinates[2] * verticalExaggeration],
      getFillColor: d => getTemperatureColor(d.temperature),
      getLineColor: [255, 255, 255],
      onClick: ({ object }) => alert(`Argo Profile: ${object.id}\nTemp: ${object.temperature}°C\nDepth: ${object.coordinates[2]}m`),
      updateTriggers: {
        getPosition: [verticalExaggeration]
      }
    })
  ].filter(Boolean);

  return (
    <main className="flex-1 relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
      
      {isLoading && (
        <div className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-full backdrop-blur-md border border-blue-500/30 text-xs font-semibold">
          <Loader size={14} className="animate-spin" /> Live Data Sync
        </div>
      )}

      {/* Zoom Controls UI Toolbar */}
      <div className="absolute top-4 right-4 z-30 flex flex-col bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
        <button 
          onClick={handleZoomIn}
          className="p-3 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border-b border-slate-700 flex items-center justify-center"
          title="Zoom In"
        >
          <Plus size={18} />
        </button>
        <button 
          onClick={handleZoomOut}
          className="p-3 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center"
          title="Zoom Out"
        >
          <Minus size={18} />
        </button>
      </div>

      {/* Cesium Container */}
      <div ref={cesiumContainer} className="absolute inset-0 z-0" style={{ width: '100%', height: '100%' }} />

      {/* Deck.gl Overlay Container */}
      <div className="absolute inset-0 z-10 pointer-events-auto">
        <DeckGL
          viewState={viewState}
          onViewStateChange={onViewStateChange}
          controller={true}
          layers={layers}
          style={{ background: 'transparent' }} 
        />
      </div>

      {/* Timeline Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-11/12 max-w-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl p-4 z-20 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <button className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-colors flex items-center justify-center">
             <Play size={16} className="ml-1" />
          </button>
          
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">Simulation Time</span>
            <span className="text-sm font-mono text-blue-600 dark:text-blue-400">
              Jan 15, 2025 - {String(Math.floor((timeStep / 100) * 24)).padStart(2, '0')}:00 UTC
            </span>
          </div>
        </div>
        
        <input 
          type="range" 
          className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none" 
          min="0" 
          max="100" 
          value={timeStep}
          onChange={(e) => setTimeStep(parseInt(e.target.value))}
        />
      </div>
    </main>
  );
}