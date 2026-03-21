'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

// ─── CONFIG (zéro import Leaflet ici) ─────────────────────────────────────────
const categoryConfig: Record<string, { color: string; label: string; dot: string }> = {
  voirie:    { color: '#f97316', label: 'Voirie / Chaussée',    dot: 'bg-orange-500' },
  proprete:  { color: '#22c55e', label: 'Propreté / Déchets',   dot: 'bg-green-500'  },
  eclairage: { color: '#eab308', label: 'Éclairage public',     dot: 'bg-yellow-500' },
  eau:       { color: '#3b82f6', label: "Fuite d'eau / Inond.", dot: 'bg-blue-500'   },
  autre:     { color: '#8b5cf6', label: 'Autre',                dot: 'bg-violet-500' },
}

const statutConfig: Record<string, { label: string; bg: string; text: string }> = {
  nouveau:  { label: 'Nouveau',  bg: '#fee2e2', text: '#b91c1c' },
  en_cours: { label: 'En cours', bg: '#fef9c3', text: '#a16207' },
  resolu:   { label: 'Résolu',   bg: '#dcfce7', text: '#15803d' },
}

interface Signalement {
  id: string
  titre: string
  description: string | null
  categorie: string
  latitude: number
  longitude: number
  statut: string
  photo_url: string | null
  created_at: string
}

interface Toast { id: number; message: string; type: 'success' | 'error' }

export default function MapClient() {
  const mapRef        = useRef<HTMLDivElement>(null)
  const leafletMap    = useRef<any>(null)
  const markersRef    = useRef<any[]>([])
  const userMarkerRef = useRef<any>(null)
  const L             = useRef<any>(null)   // instance Leaflet chargée dynamiquement

  const [isModalOpen, setIsModalOpen]   = useState(false)
  const [signalements, setSignalements] = useState<Signalement[]>([])
  const [loadingMap, setLoadingMap]     = useState(true)
  const [toasts, setToasts]             = useState<Toast[]>([])
  const [mapReady, setMapReady]         = useState(false)

  const [titre, setTitre]               = useState('')
  const [description, setDescription]   = useState('')
  const [categorie, setCategorie]       = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [lat, setLat]                   = useState<number>(6.1725)
  const [lng, setLng]                   = useState<number>(1.2312)
  const [loading, setLoading]           = useState(false)
  const [filterCat, setFilterCat]       = useState<string>('all')
  const [isAdmin, setIsAdmin]           = useState(false)

  // ── Admin ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.role === 'admin') setIsAdmin(true)
    })
  }, [])

  // ── Toast ──────────────────────────────────────────────────────────────────
  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  // ── Helper icône ───────────────────────────────────────────────────────────
  const makeIcon = (Lf: any, color: string, isUser = false) => {
    const inner = isUser
      ? `<circle cx="16" cy="16" r="5" fill="white"/><circle cx="16" cy="16" r="3" fill="${color}"/>`
      : `<circle cx="16" cy="16" r="6" fill="white"/>`
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 26 16 26S32 26 32 16C32 7.163 24.837 0 16 0z"
        fill="${color}" stroke="white" stroke-width="2"/>${inner}</svg>`
    return Lf.divIcon({ html: svg, className: '', iconSize: [32, 42], iconAnchor: [16, 42], popupAnchor: [0, -44] })
  }

  // ── Init Leaflet DANS useEffect (jamais exécuté côté serveur) ──────────────
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return

    // ✅ import() dynamique = window n'est accédé qu'ici, côté client uniquement
    import('leaflet').then((leafletModule) => {
      const Lf = leafletModule.default

      // Injecter le CSS Leaflet dynamiquement
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id   = 'leaflet-css'
        link.rel  = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      // Fix icônes
      delete (Lf.Icon.Default.prototype as any)._getIconUrl
      Lf.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      L.current = Lf

      // Créer la carte
      const map = Lf.map(mapRef.current!, { zoomControl: true })
      leafletMap.current = map

      Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      // Géolocalisation
      const fallback = () => {
        map.setView([6.1725, 1.2312], 13)
        userMarkerRef.current = Lf.marker([6.1725, 1.2312], { icon: makeIcon(Lf, '#ef4444', true) })
          .addTo(map).bindPopup('<strong>Position par défaut — Lomé</strong>')
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const uLat = pos.coords.latitude
            const uLng = pos.coords.longitude
            setLat(uLat); setLng(uLng)
            map.setView([uLat, uLng], 13)
            userMarkerRef.current = Lf.marker([uLat, uLng], { icon: makeIcon(Lf, '#ef4444', true) })
              .addTo(map).bindPopup('<strong>Vous êtes ici</strong>')
          },
          fallback,
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        )
      } else {
        fallback()
      }

      setMapReady(true)
    })

    return () => {
      if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null }
    }
  }, [])

  // ── Mise à jour marqueurs ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !leafletMap.current || !L.current) return
    const Lf  = L.current
    const map = leafletMap.current

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const filtered = filterCat === 'all'
      ? signalements : signalements.filter(s => s.categorie === filterCat)

    filtered.forEach((s) => {
      const color    = categoryConfig[s.categorie]?.color ?? '#8b5cf6'
      const catConf  = categoryConfig[s.categorie]  ?? categoryConfig['autre']
      const statConf = statutConfig[s.statut]       ?? statutConfig['nouveau']
      const dateStr  = new Date(s.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

      const popupHtml = `
        <div style="min-width:200px;padding:4px 0">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px">
            <strong style="font-size:13px;color:#111">${s.titre}</strong>
            <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:9999px;background:${statConf.bg};color:${statConf.text};white-space:nowrap">
              ${statConf.label}
            </span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
            <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block"></span>
            <span style="font-size:11px;color:#666">${catConf.label}</span>
          </div>
          ${s.description ? `<p style="font-size:11px;color:#555;margin-bottom:8px">${s.description}</p>` : ''}
          ${s.photo_url ? `<img src="${s.photo_url}" style="width:100%;height:96px;object-fit:cover;border-radius:8px;margin-bottom:8px;border:1px solid #e5e7eb"/>` : ''}
          <p style="font-size:10px;color:#9ca3af">${dateStr}</p>
        </div>`

      const marker = Lf.marker([s.latitude, s.longitude], { icon: makeIcon(Lf, color) })
        .addTo(map).bindPopup(popupHtml, { minWidth: 220 })
      markersRef.current.push(marker)
    })
  }, [signalements, filterCat, mapReady])

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchSignalements = useCallback(async () => {
    setLoadingMap(true)
    try {
      const { data, error } = await supabase
        .from('signalements').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setSignalements(data ?? [])
    } catch {
      addToast('Erreur lors du chargement des signalements', 'error')
    } finally {
      setLoadingMap(false)
    }
  }, [addToast])

  useEffect(() => { fetchSignalements() }, [fetchSignalements])

  // ── File ───────────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { addToast('La photo dépasse 5 Mo', 'error'); return }
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titre.trim()) return addToast('Le titre est obligatoire', 'error')
    if (!categorie)    return addToast('Choisissez une catégorie', 'error')
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      let photo_url: string | null = null
      if (selectedFile) {
        const ext  = selectedFile.name.split('.').pop()
        const path = `signalements/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('photos').upload(path, selectedFile)
        if (uploadError) throw uploadError
        photo_url = supabase.storage.from('photos').getPublicUrl(path).data.publicUrl
      }
      const { error } = await supabase.from('signalements').insert({
        titre: titre.trim(), description: description.trim() || null,
        categorie, latitude: lat, longitude: lng,
        statut: 'nouveau', photo_url, user_id: user?.id ?? null,
      })
      if (error) throw error
      addToast('Signalement envoyé avec succès !', 'success')
      setTitre(''); setDescription(''); setCategorie('')
      setSelectedFile(null); setPhotoPreview(null); setIsModalOpen(false)
      fetchSignalements()
    } catch (err: any) {
      addToast(err.message ?? "Erreur lors de l'envoi", 'error')
    } finally {
      setLoading(false)
    }
  }

  const filteredCount = filterCat === 'all'
    ? signalements.length : signalements.filter(s => s.categorie === filterCat).length

  return (
    <div style={{ height: '100vh', width: '100vw' }} className="relative flex flex-col">

      {/* NAVBAR */}
      <header className="relative z-[1500] bg-white border-b border-gray-200 shadow-sm px-4 h-14 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm">CitySignal</span>
            <span className="text-xs text-gray-400 ml-1 hidden sm:inline">— Lomé, Togo</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          {loadingMap ? (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
          ) : (
            <span><span className="font-bold text-gray-800">{filteredCount}</span>{' '}signalement{filteredCount !== 1 ? 's' : ''}</span>
          )}
        </div>
      </header>

      {/* BOUTON ADMIN */}
      {isAdmin && (
        <div className="absolute top-32 right-6 z-[1000]">
          <Link href="/admin" className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg shadow-md transition-all flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Admin
          </Link>
        </div>
      )}

      {/* FILTRES */}
      <div className="relative z-[1400] bg-white/90 backdrop-blur-sm border-b border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto flex-shrink-0">
        <button onClick={() => setFilterCat('all')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all
            ${filterCat === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Tous
        </button>
        {Object.entries(categoryConfig).map(([key, val]) => (
          <button key={key} onClick={() => setFilterCat(key)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
              ${filterCat === key ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            style={filterCat === key ? { backgroundColor: val.color } : {}}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${filterCat === key ? 'bg-white/70' : val.dot}`} />
            {val.label}
          </button>
        ))}
      </div>

      {/* CARTE */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />

        {/* BOUTON FLOTTANT */}
        <button onClick={() => setIsModalOpen(true)}
          className="absolute bottom-6 right-6 z-[1000] bg-red-600 hover:bg-red-700 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
          aria-label="Signaler un problème">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
        </button>

        {/* LÉGENDE */}
        <div className="absolute bottom-6 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-3 hidden sm:block">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Résumé</p>
          {Object.entries(categoryConfig).map(([key, val]) => {
            const count = signalements.filter(s => s.categorie === key).length
            return (
              <div key={key} className="flex items-center gap-2 py-0.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: val.color }} />
                <span className="text-xs text-gray-600 flex-1">{val.label}</span>
                <span className="text-xs font-bold text-gray-800">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[2000] p-0 sm:p-4 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Nouveau signalement</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Signalez un problème urbain</p>
                </div>
                <button onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Titre du problème <span className="text-red-600">*</span>
                  </label>
                  <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)}
                    required maxLength={100} placeholder="Ex : Poubelle renversée rue principale"
                    className="w-full px-4 py-3.5 border border-gray-400 rounded-xl text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 placeholder-gray-500 bg-white shadow-sm" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Catégorie <span className="text-red-600">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(categoryConfig).map(([key, val]) => (
                      <button key={key} type="button" onClick={() => setCategorie(key)}
                        className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left
                                    ${categorie === key ? 'border-current text-white shadow-md' : 'border-gray-400 text-gray-700 hover:border-gray-600 hover:bg-gray-50'}`}
                        style={categorie === key ? { backgroundColor: val.color, borderColor: val.color } : {}}>
                        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${categorie === key ? 'bg-white/80' : val.dot}`} />
                        <span className="truncate">{val.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Description <span className="text-gray-500 font-normal text-sm">(optionnel)</span>
                  </label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                    rows={4} placeholder="Détails supplémentaires..."
                    className="w-full px-4 py-3.5 border border-gray-400 rounded-xl text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-y placeholder-gray-500 bg-white shadow-sm" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Photo <span className="text-gray-500 font-normal text-sm">(max 5 Mo)</span>
                  </label>
                  {!photoPreview ? (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-400 rounded-xl cursor-pointer hover:border-red-500 hover:bg-red-50/30 transition-all group">
                      <svg className="w-10 h-10 text-gray-500 group-hover:text-red-500 transition mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      <span className="text-sm text-gray-600 group-hover:text-red-600 transition">Cliquez pour ajouter une photo</span>
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden"/>
                    </label>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden border border-gray-400 shadow-sm">
                      <img src={photoPreview} alt="Aperçu" className="w-full h-44 object-cover"/>
                      <button type="button" onClick={() => { setSelectedFile(null); setPhotoPreview(null) }}
                        className="absolute top-3 right-3 w-8 h-8 bg-black/70 hover:bg-black/90 rounded-full flex items-center justify-center text-white transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-4 py-3.5 text-sm">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  <span className="font-medium text-gray-800">
                    Position : <span className="font-mono text-gray-900 font-semibold">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
                  </span>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} disabled={loading}
                    className="flex-1 px-5 py-3.5 bg-gray-200 text-gray-800 font-medium rounded-xl hover:bg-gray-300 transition disabled:opacity-50">
                    Annuler
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
                    {loading ? (
                      <><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Envoi en cours...</>
                    ) : (
                      <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                      </svg>Envoyer</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS */}
      <div className="fixed top-16 right-4 z-[3000] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div key={toast.id}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg text-sm font-medium max-w-xs
                        ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            {toast.type === 'success' ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
            )}
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}
