import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

interface TopicsChartProps {
    data: any[];
}

export function TopicsChart({ data }: TopicsChartProps) {
    const chartOption = useMemo(() => {
        if (!data || data.length === 0) return {};

        // 1. Extract Hashtags
        const tagCounts = new Map<string, number>();

        data.forEach(item => {
            // Try standard Twitter API structure first
            const entities = item.entities || item.extended_entities;
            if (entities?.hashtags && Array.isArray(entities.hashtags)) {
                entities.hashtags.forEach((t: any) => {
                    const text = t.text;
                    if (text) tagCounts.set(text, (tagCounts.get(text) || 0) + 1);
                });
            }

            // Fallback: Regex parse from text if no entities found
            if (!tagCounts.size) {
                const text = item.full_text || item.text || "";
                const matches = text.match(/#[\w\u4e00-\u9fa5]+/g);
                if (matches) {
                    matches.forEach((m: string) => {
                        const tag = m.substring(1); // remove #
                        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
                    });
                }
            }
        });

        // 2. Sort key by count
        const sortedTags = Array.from(tagCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10); // Top 10

        const categories = sortedTags.map(t => t[0]);
        const values = sortedTags.map(t => t[1]);

        return {
            title: {
                text: 'Top Hashtags',
                left: 'left',
                textStyle: { fontSize: 16, fontWeight: 'bold', color: '#333' }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'value',
                boundaryGap: [0, 0.01]
            },
            yAxis: {
                type: 'category',
                data: categories.reverse(), // Top items at top
                axisLabel: {
                    interval: 0,
                    width: 80,
                    overflow: 'truncate'
                }
            },
            series: [
                {
                    name: 'Count',
                    type: 'bar',
                    data: values.reverse(), // Match category order
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
                }
            ]
        };
    }, [data]);

    return (
        <div className="w-full h-[420px] bg-white rounded-xl shadow-sm border border-zinc-100 p-4">
            {data && data.length > 0 ? (
                <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
            ) : (
                <div className="h-full flex items-center justify-center text-zinc-400">No hashtag data found</div>
            )}
        </div>
    );
}
