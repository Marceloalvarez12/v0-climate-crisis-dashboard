"use client"

import useSWR from "swr"
import { fetcher } from "@/lib/api"
import type { Earthquake, WeatherSnapshot } from "@/lib/data/layers"

export interface EarthquakesResponse {
  count: number
  earthquakes: Earthquake[]
}

const SWR_CONFIG = {
  refreshInterval: 5 * 60 * 1000,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 30_000,
  keepPreviousData: true,
}

export function useEarthquakes(enabled: boolean) {
  const { data, error, isLoading } = useSWR<EarthquakesResponse>(
    enabled ? "/api/layers/earthquakes" : null,
    fetcher,
    SWR_CONFIG,
  )
  return { earthquakes: data?.earthquakes ?? [], error, isLoading }
}

export function useWeather(enabled: boolean, lat: number, lng: number, label?: string) {
  const url = enabled
    ? `/api/layers/weather?lat=${lat.toFixed(3)}&lng=${lng.toFixed(3)}${label ? `&label=${encodeURIComponent(label)}` : ""}`
    : null
  const { data, error, isLoading } = useSWR<WeatherSnapshot>(url, fetcher, {
    ...SWR_CONFIG,
    refreshInterval: 10 * 60 * 1000,
  })
  return { weather: data ?? null, error, isLoading }
}
