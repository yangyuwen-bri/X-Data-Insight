import { create } from 'zustand'

interface DatasetState {
    dataset: any[] | null
    setDataset: (data: any[]) => void
    eventName: string
    setEventName: (name: string) => void
    datasetId: string | null
    setDatasetId: (id: string) => void
}

export const useDatasetStore = create<DatasetState>((set) => ({
    dataset: null,
    setDataset: (data) => set({ dataset: data }),
    eventName: "",
    setEventName: (name) => set({ eventName: name }),
    datasetId: null,
    setDatasetId: (id) => set({ datasetId: id }),
}))
