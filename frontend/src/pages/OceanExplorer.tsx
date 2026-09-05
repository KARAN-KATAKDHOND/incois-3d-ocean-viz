// === Ocean Explorer ===
// Main 3D workstation page — the core of the application.

import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { OceanScene } from '../3d/OceanScene';
import { TopBar } from '../components/layout/TopBar';
import { LeftSidebar } from '../components/layout/LeftSidebar';
import { RightPanel } from '../components/layout/RightPanel';
import { TimelineController } from '../components/panels/TimelineController';
import { InstrumentDetailPanel } from '../components/panels/InstrumentDetailPanel';
import { FloatingLegend } from '../components/panels/FloatingLegend';
import { ProbePanel } from '../components/panels/ProbePanel';
import { CrossSectionPanel } from '../components/panels/CrossSectionPanel';
import { DatasetPanel } from '../components/panels/DatasetPanel';
import { ComparePanel } from '../components/panels/ComparePanel';
import { useOceanStore } from '../stores/oceanStore';
import { datasetApi } from '../services/api';
import type { InstrumentType } from '../types/ocean';

function isInstrumentType(value: string | null): value is InstrumentType {
  return value === 'argo' || value === 'glider' || value === 'ctd' || value === 'bgc';
}

export function OceanExplorer() {
  const [searchParams] = useSearchParams();
  const setDatasetMeta = useOceanStore((s) => s.setDatasetMeta);
  const setLoading = useOceanStore((s) => s.setLoading);
  const setSelectedObservation = useOceanStore((s) => s.setSelectedObservation);
  const activePage = useOceanStore((s) => s.activePage);
  const appMode = useOceanStore((s) => s.appMode);
  
  const setModelLayer = useOceanStore((s) => s.setModelLayer);
  const setObsLayer = useOceanStore((s) => s.setObsLayer);
  
  const routeObservationId = searchParams.get('obs');
  const routeLatitude = searchParams.get('lat');
  const routeLongitude = searchParams.get('lon');
  const routeDepth = searchParams.get('depth');
  const routeType = searchParams.get('type');
  const routeSource = searchParams.get('source');
  const routeTime = searchParams.get('time');
  const routeVariables = searchParams.get('variables');

  // Load dataset metadata on mount
  useEffect(() => {
    setLoading(true, 'Loading dataset...');
    datasetApi.get('north-indian-ocean-demo')
      .then(setDatasetMeta)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Handle active page transitions (e.g. Observations view)
  useEffect(() => {
    if (activePage === 'observations') {
      // Hide all model layers
      setModelLayer('temperature', { visible: false });
      setModelLayer('salinity', { visible: false });
      setModelLayer('currents', { visible: false });
      // Show all observation layers
      setObsLayer('argo', { visible: true });
      setObsLayer('glider', { visible: true });
      setObsLayer('ctd', { visible: true });
      setObsLayer('bgc', { visible: true });
    } else if (activePage === 'explorer') {
      // Restore default 3D Ocean layers (or whatever defaults are sensible)
      setModelLayer('temperature', { visible: true });
      setObsLayer('argo', { visible: true });
      setObsLayer('glider', { visible: true });
    }
  }, [activePage, setModelLayer, setObsLayer]);

  useEffect(() => {
    if (!routeObservationId || !routeLatitude || !routeLongitude) return;

    const latitude = Number(routeLatitude);
    const longitude = Number(routeLongitude);
    const depth = Math.abs(Number(routeDepth || 0));

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    setSelectedObservation({
      id: routeObservationId,
      instrument_type: isInstrumentType(routeType) ? routeType : 'argo',
      latitude,
      longitude,
      depth: Number.isFinite(depth) ? depth : 0,
      timestamp: routeTime || '2026-01-01T12:00:00Z',
      data_source: routeSource || 'Coverage globe',
      quality: 'valid',
      variables: routeVariables ? routeVariables.split(',').filter(Boolean) : ['temperature', 'salinity'],
      platform_id: routeObservationId,
    });
  }, [
    routeDepth,
    routeLatitude,
    routeLongitude,
    routeObservationId,
    routeSource,
    routeTime,
    routeType,
    routeVariables,
    setSelectedObservation,
  ]);

  return (
    <div className="w-full h-full flex flex-col">
      <TopBar />
      <div className="flex-1 flex relative overflow-hidden">
        <LeftSidebar />

        {/* Main 3D viewport */}
        <div className="flex-1 relative">
          <OceanScene />

          {/* Floating panels */}
          <FloatingLegend />
          {/* Hide Instrument Detail if we're in the Compare view to avoid double UI */}
          {activePage !== 'compare' && <InstrumentDetailPanel />}
          <ProbePanel />
          <DatasetPanel />
          <ComparePanel />
          <CrossSectionPanel />

          {/* Explore mode overlay */}
          {appMode === 'explore' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 glass-panel px-6 py-3 text-center animate-fade-in">
              <div className="text-sm font-semibold" style={{ color: '#00e5ff' }}>
                🌊 Explore Mode
              </div>
              <div className="text-xs mt-1" style={{ color: '#7ec8e3' }}>
                Click on the ocean to see what's below the surface. 
                Use the controls on the right to change what you see.
              </div>
            </div>
          )}
        </div>

        <RightPanel />
      </div>
      <TimelineController />
    </div>
  );
}
