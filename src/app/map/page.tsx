'use client'
// src/app/map/page.tsx
import dynamic from 'next/dynamic'

const MapClient = dynamic(() => import('./MapClient'), { ssr: false })

export default function MapPage() {
  return <MapClient />
}
