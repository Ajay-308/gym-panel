import { create } from "zustand";

export const useDashboardStore = create((set) => ({
  gyms: [],
  selectedGymId: null,
  live: null,
  summary: null,
  analytics: null,
  analyticsLoading: false,
  analyticsError: null,
  crossGym: [],
  anomalies: [],
  activity: [],
  tab: "dashboard",
  loadingGyms: true,
  error: null,

  setGyms: (gyms) => set({ gyms }),
  selectGym: (id) => set({ selectedGymId: id }),
  setLive: (live) => set({ live }),
  setSummary: (summary) => set({ summary }),
  setAnalytics: (analytics) => set({ analytics }),
  setAnalyticsLoading: (analyticsLoading) => set({ analyticsLoading }),
  setAnalyticsError: (analyticsError) => set({ analyticsError }),
  setCrossGym: (crossGym) => set({ crossGym }),
  setAnomalies: (anomalies) => set({ anomalies }),
  setActivity: (activity) => set({ activity }),
  prependActivity: (item) =>
    set((s) => ({
      activity: [item, ...s.activity].filter(Boolean).slice(0, 20),
    })),
  setTab: (tab) => set({ tab }),
  setLoadingGyms: (loadingGyms) => set({ loadingGyms }),
  setError: (error) => set({ error }),
}));
