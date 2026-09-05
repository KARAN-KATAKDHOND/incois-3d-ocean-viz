import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Waves, Activity, Globe2, ChevronRight } from 'lucide-react';
import { 
  Viewer, Cartesian3, createWorldTerrainAsync, NearFarScalar,
  CustomDataSource, Color, ScreenSpaceEventHandler, ScreenSpaceEventType, defined 
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { useOceanStore } from '../stores/oceanStore';
import { MapLeftSidebar } from '../components/layout/MapLeftSidebar';
import { MapRightPanel } from '../components/layout/MapRightPanel';
import type { Observation } from '../types/ocean';

interface CesiumGlobeProps {
  isExploring: boolean;
  points: Observation[];
}

function CesiumGlobeBackground({ isExploring, points }: CesiumGlobeProps) {
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const dataSourceRef = useRef<CustomDataSource | null>(null);
  const navigate = useNavigate();
  const obsLayers = useOceanStore((s: any) => s.obsLayers);

  // Initialize Cesium
  useEffect(() => {
    if (viewerRef.current || !cesiumContainer.current) return;

    const initCesium = async () => {
      try {
        viewerRef.current = new Viewer(cesiumContainer.current!, {
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          navigationHelpButton: false,
          sceneModePicker: false,
          fullscreenButton: false,
          selectionIndicator: false,
          infoBox: false,
          creditContainer: document.createElement('div'),
        });

        const viewer = viewerRef.current;
        viewer.scene.globe.enableLighting = true;
        viewer.scene.globe.translucency.enabled = true;
        viewer.scene.globe.translucency.frontFaceAlphaByDistance = new NearFarScalar(100.0, 0.4, 8000000.0, 1.0);
        viewer.scene.globe.depthTestAgainstTerrain = true;
        
        // Initial view focused on Indian Ocean
        viewer.scene.camera.setView({
          destination: Cartesian3.fromDegrees(72.0, 12.0, 15000000.0),
        });

        dataSourceRef.current = new CustomDataSource('observations');
        viewer.dataSources.add(dataSourceRef.current);

        viewer.terrainProvider = await createWorldTerrainAsync();

        // Click handler to route to 4D viz
        const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((click: any) => {
          if (!viewerRef.current) return;
          const pickedObject = viewerRef.current.scene.pick(click.position);
          if (defined(pickedObject) && pickedObject.id && pickedObject.id.properties) {
            const props = pickedObject.id.properties;
            const id = props.id.getValue();
            const lat = props.latitude.getValue();
            const lon = props.longitude.getValue();
            const type = props.type.getValue();
            const depth = props.depth.getValue();
            const time = props.time?.getValue() || '';

            navigate(`/visualization?obs=${encodeURIComponent(id)}&lat=${lat}&lon=${lon}&type=${type}&depth=${depth}&time=${encodeURIComponent(time)}`);
          }
        }, ScreenSpaceEventType.LEFT_CLICK);

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
  }, [navigate]);

  // Handle Rotation state
  useEffect(() => {
    if (!viewerRef.current) return;
    
    const spinRate = 0.0005; 
    const tickListener = () => {
      if (!isExploring && viewerRef.current) {
        viewerRef.current.scene.camera.rotate(Cartesian3.UNIT_Z, spinRate);
      }
    };

    viewerRef.current.clock.onTick.addEventListener(tickListener);
    return () => {
      if (viewerRef.current) {
        viewerRef.current.clock.onTick.removeEventListener(tickListener);
      }
    };
  }, [isExploring]);

  // Render Data Points based on active layers
  useEffect(() => {
    if (!dataSourceRef.current || !points || points.length === 0) return;
    
    const ds = dataSourceRef.current;
    ds.entities.removeAll();

    if (!isExploring) return; // Only show points when exploring

    points.forEach(point => {
      // Check if layer is active
      const isActive = obsLayers[point.instrument_type]?.visible;
      if (!isActive) return;

      let color = Color.WHITE;
      let size = 10;

      switch(point.instrument_type) {
        case 'argo': color = Color.fromCssColorString('#00e5ff'); size = 12; break;
        case 'glider': color = Color.fromCssColorString('#ff0055'); size = 14; break;
        case 'ctd': color = Color.fromCssColorString('#00ff00'); size = 10; break;
        case 'bgc': color = Color.fromCssColorString('#ffd700'); size = 12; break;
      }

      ds.entities.add({
        position: Cartesian3.fromDegrees(point.longitude, point.latitude, 0),
        point: {
          pixelSize: size,
          color: color.withAlpha(0.8),
          outlineColor: Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        properties: {
          id: point.id,
          latitude: point.latitude,
          longitude: point.longitude,
          type: point.instrument_type,
          depth: point.depth,
          time: point.timestamp,
        }
      });
    });
  }, [points, isExploring, obsLayers]);

  const handleZoomIn = () => {
    if (viewerRef.current) {
      viewerRef.current.camera.zoomIn(1000000);
    }
  };

  const handleZoomOut = () => {
    if (viewerRef.current) {
      viewerRef.current.camera.zoomOut(1000000);
    }
  };

  return (
    <div className="absolute inset-0 z-0">
      <div ref={cesiumContainer} className="w-full h-full" style={{ touchAction: 'none' }} />
      <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-10">
        <button 
          onClick={handleZoomIn}
          className="bg-slate-900/80 backdrop-blur border border-slate-700 text-white p-3 rounded-full hover:bg-slate-800 transition-colors shadow-lg flex items-center justify-center w-12 h-12"
          title="Zoom In"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
        <button 
          onClick={handleZoomOut}
          className="bg-slate-900/80 backdrop-blur border border-slate-700 text-white p-3 rounded-full hover:bg-slate-800 transition-colors shadow-lg flex items-center justify-center w-12 h-12"
          title="Zoom Out"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </div>
    </div>
  );
}

export function GlobeLanding() {
  const [isExploring, setIsExploring] = useState(false);
  const [points, setPoints] = useState<Observation[]>([]);

  useEffect(() => {
    // Load points to display on the 2D Cesium globe
    fetch('/ocean_data_points.json')
      .then(res => res.json())
      .then(data => {
        const rawInstruments = data.instruments || [];
        const mappedPoints = rawInstruments.map((inst: any) => ({
          id: inst.id,
          instrument_type: inst.type || 'argo',
          longitude: inst.coordinates?.[0] ?? 0,
          latitude: inst.coordinates?.[1] ?? 0,
          depth: Math.abs(inst.coordinates?.[2] ?? 0),
          timestamp: new Date().toISOString(),
          data_source: 'simulated',
          quality: 'valid',
          variables: ['temperature'],
          platform_id: inst.id,
        }));
        setPoints(mappedPoints);
      })
      .catch(console.error);
  }, []);

  if (isExploring) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-slate-950 text-white relative">
        <MapLeftSidebar />
        
        <div className="flex-1 flex flex-col relative h-full overflow-hidden">
          {/* Main 2D Canvas Area */}
          <div className="flex-1 relative w-full h-full">
             <CesiumGlobeBackground isExploring={true} points={points} />
             
             {/* Instructions overlay */}
             <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur border border-slate-700 px-6 py-3 rounded-full text-sm font-medium z-10 pointer-events-none shadow-xl text-blue-100 flex items-center gap-3">
               <Globe2 size={16} className="text-blue-400" />
               Select a data point on the map to launch 4D Visualization
             </div>
          </div>
        </div>

        <MapRightPanel />
      </div>
    );
  }

  // State 1: Landing Page
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 text-white flex flex-col relative overflow-hidden">
      {/* 3D Background */}
      <CesiumGlobeBackground isExploring={false} points={points} />
      
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none z-0" />
      
      {/* Dark overlay to make text readable over the globe */}
      <div className="absolute inset-0 bg-slate-950/60 pointer-events-none z-0" />

      <nav className="p-6 md:px-12 flex justify-between items-center z-10 relative">
        <div className="flex items-center gap-3">
          <Waves className="text-blue-500" size={32} />
          <span className="text-xl font-bold tracking-wider">INCOIS <span className="text-blue-500">3D</span></span>
        </div>
      </nav>

      <main className="flex-1 flex flex-col justify-center items-center px-6 text-center z-10 max-w-5xl mx-auto relative mt-12 mb-16">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight drop-shadow-lg">
          Next-Generation <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
            Ocean Data Visualization
          </span>
        </h1>
        <p className="text-slate-300 text-lg md:text-xl mb-10 max-w-2xl drop-shadow-md font-medium">
          An interactive, browser-native 3D platform rendering high-resolution ocean models and real-time autonomous instrument profiles for rapid operational forecasting.
        </p>

        <button 
          onClick={() => setIsExploring(true)}
          className="group flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)] hover:shadow-[0_0_60px_-15px_rgba(59,130,246,0.7)]"
        >
          Go further
          <ChevronRight className="group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full">
          {[
            { icon: Globe2, title: '3D Volumetric Rendering', desc: 'Interact with temperature and salinity models across the full water column.' },
            { icon: Activity, title: 'Instrument Overlay', desc: 'Co-display of Argo float and Glider profiles with geospatially accurate markers.' },
            { icon: Waves, title: 'Hazard Assessment', desc: 'Rapid intuitive analysis for search-and-rescue and operational decision-making.' }
          ].map((feature, idx) => (
            <div key={idx} className="bg-slate-900/60 backdrop-blur-md border border-slate-700 p-6 rounded-2xl text-left shadow-xl hover:border-slate-600 transition-colors">
              <feature.icon className="text-blue-400 mb-4" size={28} />
              <h3 className="font-bold text-lg mb-2 text-white">{feature.title}</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
