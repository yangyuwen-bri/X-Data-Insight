"use client"

import * as React from "react"
import { SearchForm } from "@/app/components/SearchForm"
import { type SearchResponse, type ScrapeRequest, triggerScrape } from "@/app/lib/api"
import { Button } from "@/app/components/ui/button"
import { ExportDialog } from "@/app/components/ExportDialog"
import { DataSourceModal } from "@/app/components/DataSourceModal"
import { useDatasetStore } from "@/app/store/useDatasetStore"
import { Loader2, Download, CheckCircle, RefreshCw, X, Plus, Sparkles, BarChart3 } from "lucide-react"

export default function Home() {
  const [searchResult, setSearchResult] = React.useState<SearchResponse | null>(null)

  // Editable State
  const [keywords, setKeywords] = React.useState<string[]>([])
  const [hashtags, setHashtags] = React.useState<string[]>([])
  const [maxItems, setMaxItems] = React.useState<number>(500)

  // Advanced Filters State
  const [startDate, setStartDate] = React.useState("")
  const [endDate, setEndDate] = React.useState("")
  const [sortOrder, setSortOrder] = React.useState("Latest")
  const [language, setLanguage] = React.useState("all")

  const [newKeyword, setNewKeyword] = React.useState("")
  const [newHashtag, setNewHashtag] = React.useState("")

  const [scrapeStatus, setScrapeStatus] = React.useState<string | null>(null)
  const [taskId, setTaskId] = React.useState<string | null>(null)
  const [dataset, setDataset] = React.useState<any[] | null>(null)
  const [isPolling, setIsPolling] = React.useState(false)
  const [isExportOpen, setIsExportOpen] = React.useState(false) // Export Modal State
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = React.useState(false) // Analysis Modal State
  const [isLoadingDataset, setIsLoadingDataset] = React.useState(false) // New Loading State

  const { setDataset: setGlobalDataset, setEventName, setDatasetId } = useDatasetStore()

  // Sync dataset to global store when it updates
  React.useEffect(() => {
    if (dataset) {
      setGlobalDataset(dataset)
      if (searchResult?.event_name) {
        setEventName(searchResult.event_name)
      }
    }
  }, [dataset, searchResult, setGlobalDataset, setEventName])

  // Initialize editable state when search result changes
  React.useEffect(() => {
    if (searchResult) {
      setKeywords(searchResult.keywords)
      setHashtags(searchResult.hashtags)
      setStartDate(searchResult.time_range_start || "")
      setEndDate(searchResult.time_range_end || "")
    }
  }, [searchResult])

  const addKeyword = () => {
    if (newKeyword.trim()) {
      setKeywords([...keywords, newKeyword.trim()])
      setNewKeyword("")
    }
  }

  const removeKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index))
  }

  const addHashtag = () => {
    if (newHashtag.trim()) {
      const tag = newHashtag.startsWith("#") ? newHashtag : `#${newHashtag}`
      setHashtags([...hashtags, tag.trim()])
      setNewHashtag("")
    }
  }

  const removeHashtag = (index: number) => {
    setHashtags(hashtags.filter((_, i) => i !== index))
  }

  // Polling Effect
  React.useEffect(() => {
    let interval: NodeJS.Timeout
    if (taskId && isPolling) {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/scrape/${taskId}`)
          const data = await res.json()
          setScrapeStatus(data.status)

          if (data.status === 'SUCCEEDED') {
            setIsPolling(false)
            fetchDataset(taskId)
          } else if (data.status === 'FAILED' || data.status === 'ABORTED') {
            setIsPolling(false)
          }
        } catch (e) {
          console.error(e)
        }
      }, 3000) // Poll every 3 seconds
    }
    return () => clearInterval(interval)
  }, [taskId, isPolling])

  const fetchDataset = async (runId: string) => {
    setIsLoadingDataset(true)
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
      const res = await fetch(`${API_BASE_URL}/scrape/${runId}/dataset`)
      const data = await res.json()
      setDataset(data)
      setDatasetId(runId)
    } catch (e) {
      console.error("Failed to fetch dataset", e)
    } finally {
      setIsLoadingDataset(false)
    }
  }

  const handleScrape = async () => {
    if (!searchResult) return
    try {
      setScrapeStatus("STARTING")
      const req: ScrapeRequest = {
        run_name: `Scrape-${searchResult.event_name}`,
        search_terms: keywords.concat(hashtags),
        max_items: maxItems,
        tweet_language: language,
        sort: sortOrder,
        start_date: startDate || undefined,
        end_date: endDate || undefined
      }
      const res = await triggerScrape(req)
      setTaskId(res.task_id)
      setScrapeStatus(res.status)
      setIsPolling(true)
    } catch (e) {
      setScrapeStatus("Start Failed")
    }
  }

  const downloadCsv = () => {
    if (!dataset) return
    const headers = ["User", "Tweet", "Views", "Likes", "Retweets", "Replies", "Date", "URL"]
    const csvContent = [
      headers.join(","),
      ...dataset.map(row => [
        `"${row.author?.userName || ""}"`,
        `"${(row.text || "").replace(/"/g, '""')}"`,
        row.viewCount || 0,
        row.favoriteCount || 0,
        row.retweetCount || 0,
        row.replyCount || 0,
        `"${row.createdAt || ""}"`,
        `"${row.url || ""}"`
      ].join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `${searchResult?.event_name}_dataset.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-zinc-50">
      {/* Top Header */}
      <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center w-full">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Event Data Scraper</h1>
          <p className="text-zinc-500 mt-2">AI-powered intelligent event research and data collection.</p>
        </div>
        <Button
          onClick={() => setIsAnalysisModalOpen(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-200"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Visual Analysis
        </Button>
      </div>

      {!searchResult ? (
        <div className="w-full max-w-2xl mt-40 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <SearchForm onSearchSuccess={setSearchResult} />
        </div>
      ) : (
        <div className="w-full max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-zinc-200">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-semibold">{searchResult.event_name}</h2>
              <Button variant="outline" onClick={() => setSearchResult(null)}>Back</Button>
            </div>

            <div className="text-zinc-600 mb-6">
              {searchResult.summary.split(/(\[\d+\])/g).map((part, i) => {
                const match = part.match(/\[(\d+)\]/);
                if (match && searchResult.citations) {
                  const index = parseInt(match[1]) - 1;
                  const url = searchResult.citations[index];
                  if (url) {
                    return (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="text-violet-600 hover:underline mx-0.5 text-xs align-super">
                        [{match[1]}]
                      </a>
                    );
                  }
                }
                return part;
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Editable Keywords */}
              <div>
                <h3 className="font-medium mb-3 text-zinc-900 flex items-center gap-2">
                  Keywords
                  <span className="bg-zinc-100 text-zinc-500 px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums">
                    {keywords.length}
                  </span>
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {keywords.map((k, i) => (
                    <div key={i} className="flex items-center px-3 py-1 bg-zinc-100 rounded-full text-sm text-zinc-700 font-mono group hover:bg-zinc-200 transition-colors">
                      {k}
                      <button onClick={() => removeKeyword(i)} className="ml-2 text-zinc-400 hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                    placeholder="Add keyword"
                    className="flex-1 px-3 py-1 text-sm border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <Button onClick={addKeyword} variant="outline" className="px-3 h-8">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Editable Hashtags */}
              <div>
                <h3 className="font-medium mb-3 text-zinc-900 flex items-center gap-2">
                  Hashtags
                  <span className="bg-zinc-100 text-zinc-500 px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums">
                    {hashtags.length}
                  </span>
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {hashtags.map((h, i) => (
                    <div key={i} className="flex items-center px-3 py-1 bg-violet-50 text-violet-700 rounded-full text-sm font-mono group hover:bg-violet-100 transition-colors">
                      {h}
                      <button onClick={() => removeHashtag(i)} className="ml-2 text-violet-400 hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newHashtag}
                    onChange={(e) => setNewHashtag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addHashtag()}
                    placeholder="Add hashtag"
                    className="flex-1 px-3 py-1 text-sm border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <Button onClick={addHashtag} variant="outline" className="px-3 h-8">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Configuration */}
            <div className="mb-8 p-4 bg-zinc-50 rounded-md border border-zinc-100">
              <h3 className="font-medium mb-3 text-zinc-900">Scrape Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Max Items */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-zinc-600 font-medium">Max Items</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="100"
                      max="3000"
                      step="100"
                      value={maxItems}
                      onChange={(e) => setMaxItems(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="font-mono bg-white px-2 py-1 rounded border border-zinc-200 text-sm w-24 text-center">{maxItems} tweets</span>
                  </div>
                </div>

                {/* Date Range */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-zinc-600 font-medium">Time Range</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="flex-1 px-3 py-1.5 text-sm border border-zinc-200 rounded-md"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    <span className="text-zinc-400 self-center">-</span>
                    <input
                      type="date"
                      className="flex-1 px-3 py-1.5 text-sm border border-zinc-200 rounded-md"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Sort Order */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-zinc-600 font-medium">Sort Order</label>
                  <div className="flex gap-2">
                    {['Latest', 'Top'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSortOrder(s)}
                        className={`flex-1 px-3 py-1.5 text-sm rounded-md border transition-colors ${sortOrder === s ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-zinc-600 font-medium">Language</label>
                  <div className="flex gap-2">
                    {[
                      { label: 'All', value: 'all' },
                      { label: 'Chinese', value: 'zh' },
                      { label: 'English', value: 'en' }
                    ].map((l) => (
                      <button
                        key={l.value}
                        onClick={() => setLanguage(l.value)}
                        className={`flex-1 px-3 py-1.5 text-sm rounded-md border transition-colors ${language === l.value ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'}`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-100 flex justify-end items-center gap-4">
              {scrapeStatus && (
                <div className="flex items-center gap-2 text-sm font-medium">
                  {isPolling ? <RefreshCw className="animate-spin h-4 w-4 text-violet-500" /> : <CheckCircle className="h-4 w-4 text-emerald-500" />}
                  Status: <span className="uppercase">{scrapeStatus}</span>
                </div>
              )}

              {!taskId && (
                <Button onClick={handleScrape} className="bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-100">
                  Confirm & Scrape Data
                </Button>
              )}
            </div>

            {/* Loading Skeleton */}
            {isLoadingDataset && (
              <div className="mt-8 animate-in fade-in duration-500">
                <div className="flex justify-between items-center mb-4">
                  <div className="h-7 w-48 bg-zinc-200 rounded animate-pulse" />
                  <div className="h-8 w-32 bg-zinc-200 rounded animate-pulse" />
                </div>
                <div className="border border-zinc-200 rounded-lg overflow-hidden">
                  <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-3 flex gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <div key={i} className="h-4 bg-zinc-200 rounded animate-pulse flex-1" />
                    ))}
                  </div>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="px-4 py-3 border-b border-zinc-100 flex gap-4">
                      <div className="h-4 w-24 bg-zinc-100 rounded animate-pulse" />
                      <div className="h-4 w-full bg-zinc-100 rounded animate-pulse" />
                      <div className="h-4 w-12 bg-zinc-100 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isLoadingDataset && dataset && (
              <div className="mt-8 animate-in fade-in duration-500">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Collected Data ({dataset.length} items)</h3>
                  <Button onClick={() => setIsExportOpen(true)} variant="outline" className="h-8">
                    <Download className="mr-2 h-4 w-4" />
                    Export Data
                  </Button>
                </div>

                <div className="overflow-x-auto border border-zinc-200 rounded-lg max-h-96">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 font-medium text-zinc-700">User</th>
                        <th className="px-4 py-3 font-medium text-zinc-700">Tweet</th>
                        <th className="px-4 py-3 font-medium text-zinc-700 w-20">Views</th>
                        <th className="px-4 py-3 font-medium text-zinc-700 w-20">Likes</th>
                        <th className="px-4 py-3 font-medium text-zinc-700 w-20">RTs</th>
                        <th className="px-4 py-3 font-medium text-zinc-700 w-20">Replies</th>
                        <th className="px-4 py-3 font-medium text-zinc-700 w-32">Date</th>
                        <th className="px-4 py-3 font-medium text-zinc-700">Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataset.slice(0, 100).map((row, i) => (
                        <tr key={i} className="border-b border-zinc-100 hover:bg-zinc-50">
                          <td className="px-4 py-3 font-medium truncate max-w-[150px]" title={row.author?.userName}>
                            {row.author?.userName || "N/A"}
                          </td>
                          <td className="px-4 py-3 max-w-md truncate" title={row.full_text || row.text}>
                            {row.full_text || row.text || "No text"}
                          </td>
                          <td className="px-4 py-3 text-zinc-500">{row.viewCount || "-"}</td>
                          <td className="px-4 py-3 text-zinc-500">{row.likeCount ?? row.favoriteCount ?? 0}</td>
                          <td className="px-4 py-3 text-zinc-500">{row.retweetCount || 0}</td>
                          <td className="px-4 py-3 text-zinc-500">{row.replyCount || 0}</td>
                          <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">{new Date(row.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-violet-500">
                            <a href={row.url} target="_blank" rel="noreferrer" className="hover:underline">Link</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {dataset && (
              <ExportDialog
                isOpen={isExportOpen}
                onClose={() => setIsExportOpen(false)}
                data={dataset}
                filename={`${searchResult.event_name}_dataset`}
              />
            )}
          </div>
        </div>
      )}

      <DataSourceModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
      />
    </main>
  )
}

