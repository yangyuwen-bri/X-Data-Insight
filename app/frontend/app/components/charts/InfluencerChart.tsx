import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

interface InfluencerChartProps {
    data: any[];
}

export function InfluencerChart({ data }: InfluencerChartProps) {
    const chartOption = useMemo(() => {
        if (!data || data.length === 0) return {};

        const userStats = new Map<string, { posts: number, engagement: number }>();

        data.forEach(item => {
            const username = item.author?.userName || item.user?.screen_name || item.author?.name || "Unknown";
            if (username === "Unknown") return;

            if (!userStats.has(username)) {
                userStats.set(username, { posts: 0, engagement: 0 });
            }

            const entry = userStats.get(username)!;
            entry.posts += 1;

            const likes = (item.likeCount ?? item.favoriteCount) || 0;
            const rts = item.retweetCount || 0;
            const replies = item.replyCount || 0;
            entry.engagement += (likes + rts + replies);
        });

        // Sort by Engagement first, then Posts
        const sortedUsers = Array.from(userStats.entries())
            .sort((a, b) => b[1].engagement - a[1].engagement)
            .slice(0, 10);

        const categories = sortedUsers.map(u => u[0]);
        const engagementData = sortedUsers.map(u => u[1].engagement);
        const postData = sortedUsers.map(u => u[1].posts);

        return {
            title: {
                text: 'Top Influencers',
                subtext: 'Ranked by Total Engagement',
                left: 'left',
                textStyle: { fontSize: 16, fontWeight: 'bold', color: '#333' }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' }
            },
            legend: {
                data: ['Engagement', 'Posts'],
                top: 0
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'value',
            },
            yAxis: {
                type: 'category',
                data: categories.reverse(),
            },
            series: [
                {
                    name: 'Engagement',
                    type: 'bar',
                    stack: 'total',
                    label: { show: true },
                    emphasis: { focus: 'series' },
                    data: engagementData.reverse(),
                    itemStyle: { color: '#FAC858' }
                },
                {
                    name: 'Posts',
                    type: 'bar',
                    stack: 'total',
                    label: { show: true, position: 'right' },
                    emphasis: { focus: 'series' },
                    data: postData.reverse(),
                    itemStyle: { color: '#5470C6' }
                }
            ]
        };
    }, [data]);

    return (
        <div className="w-full h-[420px] bg-white rounded-xl shadow-sm border border-zinc-100 p-4">
            {data && data.length > 0 ? (
                <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
            ) : (
                <div className="h-full flex items-center justify-center text-zinc-400">No user data found</div>
            )}
        </div>
    );
}
