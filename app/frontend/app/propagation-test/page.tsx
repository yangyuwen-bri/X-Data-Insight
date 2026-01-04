"use client";

import React, { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";

interface TweetNode {
    id: string; // User ID
    name: string; // Username
    value: number; // Influence (e.g. followers or mention count)
    category: number; // Community ID
    symbolSize?: number;
    draggable?: boolean;
    label?: { show?: boolean };
    original_tweet_id?: string;
    avatar?: string;
}

interface TweetLink {
    source: string;
    target: string;
    type: "quote" | "reply" | "retweet";
}

export default function PropagationTest() {
    const [graphData, setGraphData] = useState<{ nodes: TweetNode[]; links: TweetLink[]; categories: any[] } | null>(null);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("/newtest.json");
                if (!res.ok) throw new Error("File not found");
                const rawData = await res.json();
                console.log("Raw Data Loaded:", rawData.length);
                processGraph(rawData);
            } catch (error) {
                console.error("Failed to load data", error);
            }
        };
        fetchData();
    }, []);

    const processGraph = (data: any[]) => {
        console.log("Processing graph... First item:", data[0]);
        const nodesMap = new Map<string, TweetNode>();
        const links: TweetLink[] = [];
        const communityCount = new Map<string, number>();

        // Regex to extract username from URL (x.com/username/status/...)
        const extractUserFromUrl = (url: string) => {
            if (!url) return null;
            const match = url.match(/(?:twitter\.com|x\.com)\/([^/]+)\/status/);
            return match ? match[1] : null;
        };

        // Helper to ensure node exists
        const ensureNode = (userOrName: any, isObject: boolean = true) => {
            let name = "";
            let avatar = "";
            let followers = 10;

            if (isObject && userOrName) {
                name = userOrName.userName || userOrName.username || userOrName.screen_name;
                avatar = userOrName.profilePicture;
                followers = userOrName.followersCount || 10;
            } else if (!isObject && typeof userOrName === 'string') {
                name = userOrName;
            }

            if (!name) return null;

            if (!nodesMap.has(name)) {
                nodesMap.set(name, {
                    id: name,
                    name: name,
                    value: followers,
                    category: 0,
                    symbolSize: 10 + Math.log(followers) * 2,
                    avatar: avatar,
                    draggable: true,
                });
            }
            return name;
        };

        let quoteCount = 0;

        data.forEach((tweet, index) => {
            if (tweet.noResults) return;

            // Try to get Source User: from Object OR from URL
            let sourceUserName = null;
            if (tweet.author) {
                sourceUserName = ensureNode(tweet.author, true);
            } else if (tweet.url) {
                const extractedName = extractUserFromUrl(tweet.url);
                if (extractedName) sourceUserName = ensureNode(extractedName, false);
            }

            if (!sourceUserName) {
                if (index < 5) console.log("Skipping tweet (cannot identify user):", tweet);
                return;
            }

            // Check Quote
            if (tweet.quote) {
                let targetUserName = null;
                if (tweet.quote.author) {
                    targetUserName = ensureNode(tweet.quote.author, true);
                } else if (tweet.quote.url) {
                    // Try extracting from quote URL
                    const extractedName = extractUserFromUrl(tweet.quote.url);
                    if (extractedName) targetUserName = ensureNode(extractedName, false);
                }

                if (targetUserName) {
                    links.push({ source: sourceUserName, target: targetUserName, type: "quote" });
                    quoteCount++;

                    const targetNode = nodesMap.get(targetUserName);
                    if (targetNode) targetNode.category = 1;
                }
            }

            // NOTE: Check for Retweets if available in future data
            // if (tweet.isRetweet && tweet.retweetedTweet) ...
        });

        // Convert Map to Array
        const nodes = Array.from(nodesMap.values());
        console.log("Graph Generated -> Nodes:", nodes.length, "Links:", links.length);

        // Calculate incoming degrees for influence sizing
        const degreeMap = new Map<string, number>();
        links.forEach(l => {
            degreeMap.set(l.target, (degreeMap.get(l.target) || 0) + 1);
        });

        // Resize nodes by Influence (Degree Centrality)
        nodes.forEach(n => {
            const degree = degreeMap.get(n.name) || 0;
            n.symbolSize = 10 + (degree * 10); // Scale up
            n.value = degree;
            if (degree > 5) n.label = { show: true }; // Show label for influencers

            // Heuristic Source Tracing: Nodes with high out-degree but 0 in-degree are spreaders
            // Nodes with high in-degree are Sources/Viral Centers
            if (degree > 0) n.category = 1; // Mark as "Influenced"
        });

        const categories = [
            { name: "Participants" },
            { name: "Influencers/Sources" }
        ];

        setGraphData({ nodes, links, categories });
        setStats({
            totalNodes: nodes.length,
            totalLinks: links.length,
            quoteCount,
            keyInfluencer: nodes.sort((a, b) => b.value - a.value)[0]?.name || "None"
        });
    };

    if (!graphData) return <div className="p-10 text-violet-400">Loading Propagation Graph...</div>;

    const option = {
        title: {
            text: "Viral Propagation Network (Preview)",
            subtext: "Nodes: Users | Edges: Quotes/Retweets",
            top: "top",
            left: "center",
            textStyle: { colro: "#fff" }
        },
        tooltip: {},
        legend: [{
            data: graphData.categories.map(function (a) {
                return a.name;
            }),
            top: 50,
            textStyle: { color: "#ccc" }
        }],
        series: [
            {
                name: "Interaction",
                type: "graph",
                layout: "force",
                data: graphData.nodes,
                links: graphData.links,
                categories: graphData.categories,
                roam: true,
                label: {
                    show: false, // Default hidden to reduce clutter
                    position: "right",
                    formatter: "{b}"
                },
                lineStyle: {
                    color: "source",
                    curveness: 0.3
                },
                emphasis: {
                    focus: "adjacency",
                    lineStyle: {
                        width: 10
                    }
                },
                force: {
                    repulsion: 300,
                    edgeLength: [50, 200]
                }
            }
        ],
        backgroundColor: "#1a1a1a" // Dark theme
    };

    return (
        <div className="w-full h-screen bg-black flex flex-col items-center justify-center p-4">
            <div className="absolute top-4 left-4 z-10 bg-zinc-900/80 p-4 rounded-xl border border-violet-500/30 backdrop-blur">
                <h2 className="text-xl font-bold text-violet-300 mb-2">Analysis Stats</h2>
                <p className="text-zinc-400">Nodes (Users): <span className="text-white">{stats.totalNodes}</span></p>
                <p className="text-zinc-400">Links (Interactions): <span className="text-white">{stats.totalLinks}</span></p>
                <p className="text-zinc-400">Top Influencer: <span className="text-yellow-400">{stats.keyInfluencer}</span></p>
            </div>

            <div className="w-full h-[800px] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
            </div>
        </div>
    );
}
