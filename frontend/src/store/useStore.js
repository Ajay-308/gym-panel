import { create } from "zustand";

export const useStore = create((set) => ({
  gyms: [],
  selectedGymId: null,
  live: null,
  summary: null,
  analytics: null,
  crossGym: [],
  anomalies: [],
  activityFeed: [],
  wsConnected: false,
  loadError: null,

  setGyms: (gyms) => set({ gyms }),
  setSelectedGymId: (id) => set({ selectedGymId: id }),
  setLive: (live) => set({ live }),
  setSummary: (summary) => set({ summary }),
  setAnalytics: (analytics) => set({ analytics }),
  setCrossGym: (crossGym) => set({ crossGym }),
  setAnomalies: (anomalies) => set({ anomalies }),
  setActivityFeed: (activityFeed) => set({ activityFeed }),
  prependActivity: (item) =>
    set((s) => ({
      activityFeed: [item, ...s.activityFeed].slice(0, 20),
    })),
  setWsConnected: (wsConnected) => set({ wsConnected }),
  setLoadError: (loadError) => set({ loadError }),
}));
