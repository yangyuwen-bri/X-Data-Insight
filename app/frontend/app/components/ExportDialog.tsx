import * as React from "react"
import { Button } from "@/app/components/ui/button"
import { flattenObject, cn } from "@/app/lib/utils"
import { Download, Check, X } from "lucide-react"

interface ExportDialogProps {
    data: any[]
    isOpen: boolean
    onClose: () => void
    filename?: string
}

export function ExportDialog({ data, isOpen, onClose, filename = "export" }: ExportDialogProps) {
    const [availableFields, setAvailableFields] = React.useState<string[]>([])
    const [selectedFields, setSelectedFields] = React.useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = React.useState("")

    React.useEffect(() => {
        if (data && data.length > 0) {
            // Analyze first 50 items to get a comprehensive list of keys
            const allKeys = new Set<string>()
            data.slice(0, 50).forEach(item => {
                const flat = flattenObject(item)
                Object.keys(flat).forEach(k => allKeys.add(k))
            })
            const sortedKeys = Array.from(allKeys).sort()
            setAvailableFields(sortedKeys)

            // Default selections (common useful fields)
            const defaults = new Set([
                "url", "createdAt", "full_text", "text", "viewCount", "bookmarkCount",
                "likeCount", "retweetCount", "replyCount", "quoteCount", "lang",
                "user.name", "user.screen_name", "author.userName", "author.name"
            ])
            // Filter defaults to only what actually exists
            const initialSelection = new Set(sortedKeys.filter(k => defaults.has(k) || k.includes("Count") || k.includes("text")))
            setSelectedFields(initialSelection)
        }
    }, [data])

    const [isSmartClean, setIsSmartClean] = React.useState(false)

    // Derived State: Cleaned Data
    const cleanedData = React.useMemo(() => {
        if (!isSmartClean) return data

        // 1. Deduplicate by URL or ID
        const seen = new Set()
        const unique = data.filter(item => {
            const key = item.url || item.id || JSON.stringify(item)
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })

        // 2. Remove Invalid Rows (e.g. no text, N/A)
        return unique.filter(item => {
            if (!item) return false
            const text = item.full_text || item.text
            if (!text || text === 'N/A' || text === '-') return false
            return true
        })
    }, [data, isSmartClean])

    const toggleField = (field: string) => {
        const next = new Set(selectedFields)
        if (next.has(field)) {
            next.delete(field)
        } else {
            next.add(field)
        }
        setSelectedFields(next)
    }

    const handleDownload = (format: 'csv' | 'json') => {
        if (selectedFields.size === 0) return

        const targetData = cleanedData // Use cleaned data if active
        const fields = Array.from(selectedFields)

        if (format === 'json') {
            const exportData = targetData.map(item => {
                const flat = flattenObject(item)
                const row: any = {}
                fields.forEach(f => row[f] = flat[f])
                return row
            })
            downloadFile(JSON.stringify(exportData, null, 2), `${filename}${isSmartClean ? '_cleaned' : ''}.json`, 'application/json')
        } else {
            // CSV
            const csvContent = [
                fields.join(","),
                ...targetData.map(item => {
                    const flat = flattenObject(item)
                    return fields.map(field => {
                        let val = flat[field]
                        if (val === undefined || val === null) return ""
                        if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`
                        return val
                    }).join(",")
                })
            ].join("\n")
            downloadFile(csvContent, `${filename}${isSmartClean ? '_cleaned' : ''}.csv`, 'text/csv;charset=utf-8;')
        }
        onClose()
    }

    const downloadFile = (content: string, name: string, type: string) => {
        const blob = new Blob([content], { type })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.setAttribute("download", name)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const filteredFields = availableFields.filter(f => f.toLowerCase().includes(searchQuery.toLowerCase()))

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="p-6 border-b border-zinc-200 flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Export Data</h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-zinc-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-hidden flex flex-col">
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Search fields..."
                            className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-between mb-2 text-sm text-zinc-500">
                        <span>{selectedFields.size} fields selected</span>
                        <div className="space-x-2">
                            <button onClick={() => setSelectedFields(new Set(availableFields))} className="hover:text-blue-600">Select All</button>
                            <button onClick={() => setSelectedFields(new Set())} className="hover:text-blue-600">Select None</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto border border-zinc-100 rounded-md p-2 grid grid-cols-2 gap-2 content-start">
                        {filteredFields.map(field => (
                            <label key={field} className="flex items-center space-x-2 p-2 hover:bg-zinc-50 rounded cursor-pointer text-sm">
                                <div className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                    selectedFields.has(field) ? "bg-blue-600 border-blue-600" : "border-zinc-300 bg-white"
                                )}>
                                    {selectedFields.has(field) && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={selectedFields.has(field)}
                                    onChange={() => toggleField(field)}
                                />
                                <span className="truncate" title={field}>{field}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-zinc-200 flex flex-col sm:flex-row justify-between items-center gap-3 bg-zinc-50 rounded-b-lg">
                    {/* Smart Clean Toggle */}
                    <label className="flex items-center gap-3 cursor-pointer bg-white px-3 py-2 rounded-md border border-zinc-200 shadow-sm hover:border-violet-300 transition-colors">
                        <div className="relative">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isSmartClean}
                                onChange={(e) => setIsSmartClean(e.target.checked)}
                            />
                            <div className="w-10 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-zinc-900 flex items-center gap-1">
                                ✨ AI Smart Clean
                            </span>
                            <span className="text-[10px] text-zinc-500">
                                {isSmartClean ?
                                    `Removed ${data.length - cleanedData.length} invalid items` :
                                    "Remove duplicates & noise"}
                            </span>
                        </div>
                    </label>

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handleDownload('json')}>
                            Download JSON
                        </Button>
                        <Button onClick={() => handleDownload('csv')} className="bg-violet-600 hover:bg-violet-700 text-white">
                            <Download className="mr-2 h-4 w-4" />
                            Download CSV
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
