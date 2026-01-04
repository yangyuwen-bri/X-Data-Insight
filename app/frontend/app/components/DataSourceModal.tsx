import * as React from "react"
import { Button } from "@/app/components/ui/button"
import { useDatasetStore } from "@/app/store/useDatasetStore"
import { useRouter } from "next/navigation"
import { Upload, FileSpreadsheet, Database, X, Loader2 } from "lucide-react"
import Papa from "papaparse"
import { flattenObject, unflattenObject } from "@/app/lib/utils"
import { uploadDataset } from "@/app/lib/api"

interface DataSourceModalProps {
    isOpen: boolean
    onClose: () => void
}

export function DataSourceModal({ isOpen, onClose }: DataSourceModalProps) {
    const router = useRouter()
    const { dataset: currentDataset, setDataset, setEventName, setDatasetId } = useDatasetStore()
    const [isProcessing, setIsProcessing] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const handleUseCurrent = () => {
        if (!currentDataset || currentDataset.length === 0) return
        router.push('/analysis')
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsProcessing(true)
        setError(null)
        setEventName(file.name.replace(/\.[^/.]+$/, "")) // Use filename as event name

        const processAndUpload = async (parsedData: any[]) => {
            setDataset(parsedData)
            try {
                const result = await uploadDataset(file)
                console.log('Upload result:', result)
                if (result && result.dataset_id) {
                    setDatasetId(result.dataset_id)
                }
                router.push('/analysis')
                onClose()
            } catch (e) {
                setError("Failed to upload file to backend.")
            } finally {
                setIsProcessing(false)
            }
        }

        if (file.name.endsWith(".json")) {
            const reader = new FileReader()
            reader.onload = async (event) => {
                try {
                    const json = JSON.parse(event.target?.result as string)
                    if (Array.isArray(json)) {
                        setDataset(json)
                        // Upload to backend
                        await uploadDataset(file)
                        router.push('/analysis')
                    } else {
                        setError("Invalid JSON format: Expected an array of objects.")
                    }
                } catch (err) {
                    setError("Failed to parse JSON file.")
                } finally {
                    setIsProcessing(false)
                }
            }
            reader.readAsText(file)
        } else if (file.name.endsWith(".csv")) {
            Papa.parse(file, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: async (results) => {
                    if (results.data && Array.isArray(results.data)) {
                        // Unflatten data
                        const parsedData = results.data.map((row: any) => unflattenObject(row));
                        setDataset(parsedData)
                        // Upload to backend
                        try {
                            await uploadDataset(file)
                            router.push('/analysis')
                        } catch (e) {
                            setError("Failed to upload file to backend.")
                        }
                    } else {
                        setError("Failed to parse CSV: No data found.")
                    }
                    setIsProcessing(false)
                },
                error: (err) => {
                    setError(`CSV Parse Error: ${err.message}`)
                    setIsProcessing(false)
                }
            })
        } else {
            setError("Unsupported file format. Please upload JSON or CSV.")
            setIsProcessing(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900">Select Data Source</h2>
                        <p className="text-sm text-zinc-500 mt-1">Choose dataset for Visual Analysis</p>
                    </div>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Option 1: Current Dataset */}
                    <div className="relative group">
                        <div className={`
              h-full p-6 border-2 rounded-xl flex flex-col items-center justify-center text-center transition-all duration-200
              ${currentDataset && currentDataset.length > 0
                                ? "border-blue-100 bg-blue-50/50 hover:border-blue-500 hover:shadow-lg cursor-pointer"
                                : "border-zinc-100 bg-zinc-50 opacity-60 cursor-not-allowed"}
            `}
                            onClick={currentDataset && currentDataset.length > 0 ? handleUseCurrent : undefined}
                        >
                            <div className={`p-4 rounded-full mb-4 ${currentDataset ? "bg-blue-100 text-blue-600" : "bg-zinc-200 text-zinc-400"}`}>
                                <Database className="h-8 w-8" />
                            </div>
                            <h3 className="font-semibold text-lg mb-2 text-zinc-900">Current Session</h3>
                            <p className="text-sm text-zinc-500 mb-4">
                                Use the {currentDataset?.length || 0} items just scraped.
                            </p>
                            <Button disabled={!currentDataset || currentDataset.length === 0} className="w-full">
                                Analyze This
                            </Button>
                        </div>
                    </div>

                    {/* Option 2: Upload File */}
                    <div className="relative group">
                        <div className="h-full p-6 border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center text-center hover:border-violet-500 hover:bg-violet-50/50 transition-all duration-200">
                            <input
                                type="file"
                                accept=".json,.csv"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                disabled={isProcessing}
                            />
                            <div className="p-4 rounded-full bg-violet-100 text-violet-600 mb-4 group-hover:scale-110 transition-transform">
                                {isProcessing ? <Loader2 className="h-8 w-8 animate-spin" /> : <Upload className="h-8 w-8" />}
                            </div>
                            <h3 className="font-semibold text-lg mb-2 text-zinc-900">Upload File</h3>
                            <p className="text-sm text-zinc-500 mb-4">
                                Drag & drop or click to upload<br />
                                <span className="text-xs font-mono bg-zinc-100 px-1 rounded">.json</span> or <span className="text-xs font-mono bg-zinc-100 px-1 rounded">.csv</span>
                            </p>
                            <Button variant="outline" className="w-full pointer-events-none">
                                Select File
                            </Button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 px-8 py-3 text-sm flex items-center">
                        <X className="h-4 w-4 mr-2" />
                        {error}
                    </div>
                )}
            </div>
        </div>
    )
}
