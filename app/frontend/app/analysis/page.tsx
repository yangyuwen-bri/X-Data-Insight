"use client"

import Link from "next/link"
import { Button } from "@/app/components/ui/button"
import { ArrowLeft, BarChart3, Download } from "lucide-react"
import { useDatasetStore } from "@/app/store/useDatasetStore"
import { VolumeChart } from "@/app/components/charts/VolumeChart"
import { TopicsChart } from "@/app/components/charts/TopicsChart"
import { InfluencerChart } from "@/app/components/charts/InfluencerChart"
import { ViralContent } from "@/app/components/charts/ViralContent"
import { FloatingDataCopilot } from "@/app/components/FloatingDataCopilot"

export default function AnalysisPage() {
    const { dataset, eventName } = useDatasetStore()

    if (!dataset) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-zinc-900 mb-2">No Data Selected</h2>
                    <p className="text-zinc-500 mb-6">Please go back home and select a dataset to analyze.</p>
                    <Link href="/">
                        <Button>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Home
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-zinc-50/50 pb-12">
            <header className="bg-white border-b border-zinc-200 sticky top-0 z-10 backdrop-blur-sm bg-white/80">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" className="h-10 w-10 p-0 text-zinc-500 hover:text-zinc-900">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-violet-600" />
                                Analysis Dashboard
                            </h1>
                            <p className="text-xs text-zinc-500">
                                Event: <span className="font-medium text-zinc-700">{eventName || "Untitled Event"}</span>
                                <span className="mx-2">•</span>
                                {dataset.length} items
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <FloatingDataCopilot />
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow">
                        <div className="text-sm text-zinc-500 mb-1">Total Posts</div>
                        <div className="text-2xl font-bold text-zinc-900">{dataset.length.toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow">
                        <div className="text-sm text-zinc-500 mb-1">Total Estimated Views</div>
                        <div className="text-2xl font-bold text-zinc-900">
                            {dataset.reduce((acc, curr) => acc + (curr.viewCount || 0), 0).toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow">
                        <div className="text-sm text-zinc-500 mb-1">Total Interactions</div>
                        <div className="text-2xl font-bold text-zinc-900">
                            {dataset.reduce((acc, curr) => acc + (curr.likeCount || 0) + (curr.retweetCount || 0) + (curr.replyCount || 0), 0).toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow">
                        <div className="text-sm text-zinc-500 mb-1">Active Users</div>
                        <div className="text-2xl font-bold text-zinc-900">
                            {new Set(dataset.map(d => d.author?.userName || d.user?.screen_name)).size.toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Charts Area */}
                <div className="space-y-10">
                    {/* Row 1: Volume Trend (Full Width) */}
                    <div>
                        <VolumeChart data={dataset} />
                    </div>

                    {/* Row 2: Topics & Influencers */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <TopicsChart data={dataset} />
                        <InfluencerChart data={dataset} />
                    </div>

                    {/* Row 3: Viral Content (Full Width) */}
                    <div>
                        <ViralContent data={dataset} />
                    </div>
                </div>

                {/* AI Copilot Moved to Header */}
            </main>
        </div>
    )
}
