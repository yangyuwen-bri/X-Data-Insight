import React, { useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { flattenObject } from '@/app/lib/utils'; // If you need helper, though we might not need it for this simple chart

interface VolumeChartProps {
    data: any[];
}

export function VolumeChart({ data }: VolumeChartProps) {
    const chartOption = useMemo(() => {
        if (!data || data.length === 0) return {};

        // 1. Process Data: Group by Date (or Hour if short span)
        // For simplicity, let's group by Day first, or specific timestamp buckets.
        // Given tweets often span days, "YYYY-MM-DD" is safe.

        // Create a map of date -> counts
        const dateMap = new Map<string, { count: number, engagement: number }>();

        data.forEach(item => {
            // Parse date. createdAt format is usually "Fri Mar 27 06:42:41 +0000 2020" or ISO
            const d = new Date(item.createdAt);
            if (isNaN(d.getTime())) return;

            const dateKey = d.toISOString().split('T')[0]; // YYYY-MM-DD

            if (!dateMap.has(dateKey)) {
                dateMap.set(dateKey, { count: 0, engagement: 0 });
            }

            const entry = dateMap.get(dateKey)!;
            entry.count += 1;

            // Aggregate engagement: Likes + Retweets + Replies
            const likes = (item.likeCount ?? item.favoriteCount) || 0;
            const rts = item.retweetCount || 0;
            const replies = item.replyCount || 0;
            entry.engagement += (likes + rts + replies);
        });

        // Convert keys to sorted array
        const sortedDates = Array.from(dateMap.keys()).sort();
        const volumeSeries = sortedDates.map(date => dateMap.get(date)?.count || 0);
        const engagementSeries = sortedDates.map(date => dateMap.get(date)?.engagement || 0);

        return {
            title: {
                text: 'Volume & Engagement Trend',
                left: 'left',
                textStyle: { fontSize: 16, fontWeight: 'bold', color: '#333' }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross' }
            },
            legend: {
                data: ['Volume (Tweets)', 'Engagement (Actions)'],
                top: 0
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '10%', // Check zoom slider space
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: sortedDates,
                boundaryGap: false,
                axisLine: { lineStyle: { color: '#ccc' } },
                axisLabel: { color: '#666' }
            },
            yAxis: [
                {
                    type: 'value',
                    name: 'Volume',
                    position: 'left',
                    axisLine: { show: true, lineStyle: { color: '#5470C6' } },
                    splitLine: { lineStyle: { type: 'dashed' } }
                },
                {
                    type: 'value',
                    name: 'Engagement',
                    position: 'right',
                    axisLine: { show: true, lineStyle: { color: '#91CC75' } },
                    splitLine: { show: false }
                }
            ],
            dataZoom: [
                {
                    type: 'slider',
                    show: true,
                    xAxisIndex: 0,
                    start: 0,
                    end: 100,
                    height: 20,
                    bottom: 0
                }
            ],
            series: [
                {
                    name: 'Volume (Tweets)',
                    type: 'line',
                    smooth: true,
                    showSymbol: false,
                    areaStyle: { opacity: 0.1 },
                    data: volumeSeries,
                    itemStyle: { color: '#5470C6' }
                },
                {
                    name: 'Engagement (Actions)',
                    type: 'line',
                    yAxisIndex: 1, // Use right axis
                    smooth: true,
                    showSymbol: false,
                    data: engagementSeries,
                    itemStyle: { color: '#91CC75' },
                    lineStyle: { type: 'dashed' }
                }
            ]
        };
    }, [data]);

    return (
        <div className="w-full h-[400px] bg-white rounded-xl shadow-sm border border-zinc-100 p-4">
            {data && data.length > 0 ? (
                <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
            ) : (
                <div className="h-full flex items-center justify-center text-zinc-400">No time data available</div>
            )}
        </div>
    );
}
