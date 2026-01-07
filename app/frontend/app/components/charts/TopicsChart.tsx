
import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import 'echarts-wordcloud';
import { Button } from "@/app/components/ui/button"
import { BarChart3, Cloud } from 'lucide-react';

interface TopicsChartProps {
    data: any[];
}

export function TopicsChart({ data }: TopicsChartProps) {
    const [viewMode, setViewMode] = useState<'bar' | 'cloud'>('bar');
    const [selectedDate, setSelectedDate] = useState<string>('All');

    // 1. Extract and Sort Dates
    const availableDates = useMemo(() => {
        if (!data) return [];
        const dates = new Set<string>();
        data.forEach(item => {
            const d = item.created_at || item.date;
            if (d) {
                // Handle various date formats, assume ISO or standard string
                try {
                    const dateStr = new Date(d).toISOString().split('T')[0];
                    dates.add(dateStr);
                } catch (e) { }
            }
        });
        return Array.from(dates).sort();
    }, [data]);

    // 2. Filter Data by Date
    const filteredData = useMemo(() => {
        if (selectedDate === 'All') return data;
        return data.filter(item => {
            const d = item.created_at || item.date;
            if (!d) return false;
            try {
                return new Date(d).toISOString().split('T')[0] === selectedDate;
            } catch (e) { return false; }
        });
    }, [data, selectedDate]);

    const chartOption = useMemo(() => {
        if (!filteredData || filteredData.length === 0) return {};

        // Extract Hashtags from filtered data
        const tagCounts = new Map<string, number>();

        filteredData.forEach(item => {
            const entities = item.entities || item.extended_entities;
            if (entities?.hashtags && Array.isArray(entities.hashtags)) {
                entities.hashtags.forEach((t: any) => {
                    const text = t.text;
                    if (text) tagCounts.set(text, (tagCounts.get(text) || 0) + 1);
                });
            }

            if (!tagCounts.size) {
                const text = item.full_text || item.text || "";
                const matches = text.match(/#[\w\u4e00-\u9fa5]+/g);
                if (matches) {
                    matches.forEach((m: string) => {
                        const tag = m.substring(1);
                        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
                    });
                }
            }
        });

        const sortedTags = Array.from(tagCounts.entries())
            .sort((a, b) => b[1] - a[1]);

        // --- Word Cloud Option ---
        if (viewMode === 'cloud') {
            return {
                tooltip: {
                    show: true
                },
                series: [{
                    type: 'wordCloud',
                    shape: 'circle',
                    left: 'center',
                    top: 'center',
                    width: '100%',
                    height: '100%',
                    right: null,
                    bottom: null,
                    sizeRange: [12, 60],
                    rotationRange: [-90, 90],
                    rotationStep: 45,
                    gridSize: 8,
                    drawOutOfBound: false,
                    layoutAnimation: true,
                    textStyle: {
                        fontFamily: 'sans-serif',
                        fontWeight: 'bold',
                        color: function () {
                            // Random nice colors
                            return 'rgb(' + [
                                Math.round(Math.random() * 160),
                                Math.round(Math.random() * 160),
                                Math.round(Math.random() * 160)
                            ].join(',') + ')';
                        }
                    },
                    emphasis: {
                        focus: 'self',
                        textStyle: {
                            textShadowBlur: 10,
                            textShadowColor: '#333'
                        }
                    },
                    data: sortedTags.map(t => ({ name: t[0], value: t[1] }))
                }]
            };
        }

        // --- Bar Chart Option (Standard) ---
        const top10 = sortedTags.slice(0, 10);
        const categories = top10.map(t => t[0]);
        const values = top10.map(t => t[1]);

        return {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                top: '10%', // Save space
                containLabel: true
            },
            xAxis: {
                type: 'value',
                boundaryGap: [0, 0.01]
            },
            yAxis: {
                type: 'category',
                data: categories.reverse(),
                axisLabel: {
                    interval: 0,
                    width: 80,
                    overflow: 'truncate'
                }
            },
            series: [{
                name: 'Count',
                type: 'bar',
                data: values.reverse(),
                itemStyle: {
                    color: new Function('params', `
                        const colors = ['#5470C6', '#91CC75', '#FAC858', '#EE6666', '#73C0DE', '#3BA272', '#FC8452', '#9A60B4', '#EA7CCC'];
                        return colors[params.dataIndex % colors.length];
                    `)
                },
                label: {
                    show: true,
                    position: 'right'
                }
            }]
        };
    }, [filteredData, viewMode]);

    return (
        <div className="w-full h-[520px] bg-white rounded-xl shadow-sm border border-zinc-100 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-50">
                <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                    {viewMode === 'bar' ? <BarChart3 className="w-4 h-4 text-violet-500" /> : <Cloud className="w-4 h-4 text-violet-500" />}
                    Top Hashtags
                    {selectedDate !== 'All' && <span className="text-xs font-normal text-zinc-500 ml-2 bg-zinc-100 px-2 py-0.5 rounded-full">{selectedDate}</span>}
                </h3>
                <div className="flex bg-zinc-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('bar')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'bar' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
                    >
                        <BarChart3 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('cloud')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'cloud' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
                    >
                        <Cloud className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 w-full min-h-0 relative p-4">
                {filteredData && filteredData.length > 0 ? (
                    <ReactECharts
                        option={chartOption}
                        style={{ height: '100%', width: '100%' }}
                        notMerge={true} // Important for swapping chart types
                    />
                ) : (
                    <div className="h-full flex items-center justify-center text-zinc-400">
                        No hashtag data found {selectedDate !== 'All' && `for ${selectedDate}`}
                    </div>
                )}
            </div>

            {/* Footer: Date Slider */}
            {availableDates.length > 1 && (
                <div className="px-6 py-3 border-t border-zinc-50 bg-zinc-50/30">
                    <div className="flex items-center gap-4">
                        <span className={`text-xs font-medium ${selectedDate === 'All' ? 'text-violet-600' : 'text-zinc-400'}`}>All Time</span>

                        <input
                            type="range"
                            min="-1"
                            max={availableDates.length - 1}
                            value={selectedDate === 'All' ? -1 : availableDates.indexOf(selectedDate)}
                            onChange={(e) => {
                                const idx = parseInt(e.target.value);
                                if (idx === -1) setSelectedDate('All');
                                else setSelectedDate(availableDates[idx]);
                            }}
                            className="flex-1 h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                        />

                        <span className={`text-xs font-medium ${selectedDate !== 'All' ? 'text-violet-600' : 'text-zinc-400'}`}>
                            {selectedDate === 'All' ? 'Select Date' : selectedDate}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
