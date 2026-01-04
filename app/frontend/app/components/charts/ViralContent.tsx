import React, { useMemo } from 'react';
import { Heart, Repeat, MessageCircle, ExternalLink } from 'lucide-react';

interface ViralContentProps {
    data: any[];
}

export function ViralContent({ data }: ViralContentProps) {
    const sortedTweets = useMemo(() => {
        if (!data || data.length === 0) return [];

        return [...data]
            .sort((a, b) => {
                const engA = (a.likeCount || 0) + (a.retweetCount || 0) + (a.replyCount || 0);
                const engB = (b.likeCount || 0) + (b.retweetCount || 0) + (b.replyCount || 0);
                return engB - engA;
            })
            .slice(0, 4); // Top 4
    }, [data]);

    if (!data || data.length === 0) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-6 h-full min-h-[420px] flex flex-col">
            <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
                <span className="text-xl">🔥</span> Most Viral Content
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                {sortedTweets.map((tweet, i) => (
                    <div key={i} className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 hover:border-violet-200 transition-colors flex flex-col h-full">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white font-bold text-xs uppercase shrink-0">
                                    {(tweet.author?.userName || "U")[0]}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-semibold text-sm text-zinc-900 truncate">{tweet.author?.name || tweet.author?.userName || "Unknown User"}</div>
                                    <div className="text-xs text-zinc-500 truncate">@{tweet.author?.userName || "unknown"}</div>
                                </div>
                            </div>
                            <div className="text-xs text-zinc-400 shrink-0">{new Date(tweet.createdAt).toLocaleDateString()}</div>
                        </div>

                        <p className="text-zinc-700 text-sm mb-4 line-clamp-3 flex-1">
                            {tweet.full_text || tweet.text}
                        </p>

                        <div className="flex justify-between items-center text-xs text-zinc-500 border-t border-zinc-200 pt-3">
                            <div className="flex gap-4">
                                <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-red-400" /> {tweet.likeCount || 0}</span>
                                <span className="flex items-center gap-1"><Repeat className="h-3 w-3 text-green-400" /> {tweet.retweetCount || 0}</span>
                                <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3 text-blue-400" /> {tweet.replyCount || 0}</span>
                            </div>
                            <a href={tweet.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-violet-600 hover:underline font-medium">
                                View <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
