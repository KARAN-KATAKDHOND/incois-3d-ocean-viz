import { create } from 'zustand';

export const useMapStore = create((set) => ({
  // Active Data Layers
  activeLayers: {
    sst: false,        // Sea Surface Temperature
    salinity: false,   // Salinity
    argo: false,       // Argo Floats
    gliders: false,    // Underwater Gliders
  },
  
  // Visualization Controls
  layerOpacity: 0.8,
  verticalExaggeration: 1.0,
  
  // Temporal Controls (Timeline)
  timeStep: 0,

  // Actions
  toggleLayer: (layerId) => set((state) => ({
    activeLayers: { 
      ...state.activeLayers, 
      [layerId]: !state.activeLayers[layerId] 
    }
  })),
  
  // Add this inside your useMapStore create() function:
  theme: 'dark',
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { theme: newTheme };
  }),
  
  setLayerOpacity: (opacity) => set({ layerOpacity: opacity }),
  setVerticalExaggeration: (exaggeration) => set({ verticalExaggeration: exaggeration }),
  setTimeStep: (step) => set({ timeStep: step }),
}));