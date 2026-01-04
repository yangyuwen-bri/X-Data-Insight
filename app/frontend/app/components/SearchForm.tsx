"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { searchEvent, type SearchResponse } from "@/app/lib/api"
import { Button } from "@/app/components/ui/button"
import { Loader2 } from "lucide-react"

interface SearchFormProps {
    onSearchSuccess: (data: SearchResponse) => void
}

export function SearchForm({ onSearchSuccess }: SearchFormProps) {
    const { register, handleSubmit, formState: { errors } } = useForm<{ eventName: string }>()
    const [isLoading, setIsLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const onSubmit = async (data: { eventName: string }) => {
        setIsLoading(true)
        setError(null)
        try {
            const result = await searchEvent(data.eventName)
            onSearchSuccess(result)
        } catch (err) {
            setError("Failed to fetch event data. Please try again.")
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="w-full max-w-lg mx-auto">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="relative">
                    <input
                        {...register("eventName", { required: true })}
                        className="flex h-14 w-full rounded-2xl border-0 bg-white px-6 py-4 text-lg shadow-xl shadow-zinc-200/50 ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                        placeholder="e.g. 2025 Beijing Hospital Incident"
                        autoFocus
                    />
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="absolute right-2 top-2 h-10 px-6 rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition-colors"
                    >
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            "Research"
                        )}
                    </Button>
                </div>
                {errors.eventName && <span className="text-red-500 text-xs ml-2">Please enter an event name</span>}

                {error && (
                    <div className="text-sm text-red-500 text-center">
                        {error}
                    </div>
                )}
            </form>
        </div>
    )
}
