'use client'

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L, { LatLngExpression } from 'leaflet'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

// ─── FIX ICONES LEAFLET ───────────────────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// ─── ICONES PAR CATEGORIE ─────────────────────────────────────────────────────
const categoryConfig: Record<string, { color: string; label: string; dot: string }> = {
  voirie:   { color: '#f97316', label: 'Voirie / Chaussée',     dot: 'bg-orange-500' },
  proprete: { color: '#22c55e', label: 'Propreté / Déchets',    dot: 'bg-green-500'  },
  eclairage:{ color: '#eab308', label: 'Éclairage public',      dot: 'bg-yellow-500' },
  eau:      { color: '#3b82f6', label: 'Fuite d\'eau / Inond.', dot: 'bg-blue-500'   },
  autre:    { color: '#8b5cf6', label: 'Autre',                  dot: 'bg-violet-500' },
}

const statutConfig: Record<string, { label: string; bg: string; text: string }> = {
  nouveau:     { label: 'Nouveau',     bg: 'bg-red-100',    text: 'text-red-700'    },
  en_cours:    { label: 'En cours',    bg: 'bg-yellow-100', text: 'text-yellow-700' },
  resolu:      { label: 'Résolu',      bg: 'bg-green-100',  text: 'text-green-700'  },
}

function makeCategoryIcon(categorie: string) {
  const color = categoryConfig[categorie]?.color ?? '#ef4444'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 26 16 26S32 26 32 16C32 7.163 24.837 0 16 0z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="white"/>
    </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize:   [32, 42],
    iconAnchor: [16, 42],
    popupAnchor:[0, -44],
  })
}

function makeUserIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 26 16 26S32 26 32 16C32 7.163 24.837 0 16 0z"
        fill="#ef4444" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="16" r="5" fill="white"/>
      <circle cx="16" cy="16" r="3" fill="#ef4444"/>
    </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize:   [32, 42],
    iconAnchor: [16, 42],
    popupAnchor:[0, -44],
  })
}

// ─── COMPOSANT RE-CENTER ──────────────────────────────────────────────────────
function RecenterMap({ position }: { position: LatLngExpression }) {
  const map = useMap()
  useEffect(() => { map.setView(position, 13) }, [position, map])
  return null
}

// ─── TYPES ────────────────────────────────────────────────────────────────────
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

// ─── TOAST ────────────────────────────────────────────────────────────────────
interface Toast { id: number; message: string; type: 'success' | 'error' }

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────
export default function MapPage() {
  const [position, setPosition]       = useState<LatLngExpression | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [signalements, setSignalements] = useState<Signalement[]>([])
  const [loadingMap, setLoadingMap]   = useState(true)
  const [toasts, setToasts]           = useState<Toast[]>([])

  // États du formulaire
  const [titre, setTitre]             = useState('')
  const [description, setDescription] = useState('')
  const [categorie, setCategorie]     = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [lat, setLat]                 = useState<number | null>(null)
  const [lng, setLng]                 = useState<number | null>(null)
  const [loading, setLoading]         = useState(false)
  const [filterCat, setFilterCat]     = useState<string>('all')

  // État pour savoir si l'utilisateur est admin
  const [isAdmin, setIsAdmin] = useState(false)

  const defaultPosition: LatLngExpression = [6.1725, 1.2312]

  // Vérifier si l'utilisateur est admin connecté
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.role === 'admin') {
        setIsAdmin(true)
      }
    }
    checkAdmin()
  }, [])

  // ── Toast helper ─────────────────────────────────────────────────────────────
  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  // ── Géolocalisation ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLat = pos.coords.latitude
          const newLng = pos.coords.longitude
          setPosition([newLat, newLng])
          setLat(newLat)
          setLng(newLng)
        },
        () => {
          setPosition(defaultPosition)
          setLat(6.1725)
          setLng(1.2312)
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      )
    } else {
      setPosition(defaultPosition)
      setLat(6.1725)
      setLng(1.2312)
    }
  }, [])

  // ── Chargement des signalements ───────────────────────────────────────────────
  const fetchSignalements = useCallback(async () => {
    setLoadingMap(true)
    try {
      const { data, error } = await supabase
        .from('signalements')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setSignalements(data ?? [])
    } catch (err: any) {
      console.error('Erreur fetch signalements:', err)
    } finally {
      setLoadingMap(false)
    }
  }, [])

  useEffect(() => { fetchSignalements() }, [fetchSignalements])

  // ── Sélection fichier + preview ───────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast('Fichier trop lourd (max 5 Mo)', 'error')
        return
      }
      setSelectedFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  // ── Upload photo vers Supabase Storage ────────────────────────────────────────
  const uploadPhoto = async (file: File): Promise<string | null> => {
    const ext      = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const filePath = `signalements/${fileName}`

    const { error } = await supabase.storage
      .from('photos')
      .upload(filePath, file, { contentType: file.type, upsert: false })

    if (error) throw error

    const { data } = supabase.storage.from('photos').getPublicUrl(filePath)
    return data.publicUrl
  }

  // ── Soumission ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titre.trim() || !categorie || !lat || !lng) {
      addToast('Remplissez les champs obligatoires (titre, catégorie)', 'error')
      return
    }
    setLoading(true)
    try {
      let photo_url: string | null = null
      if (selectedFile) {
        photo_url = await uploadPhoto(selectedFile)
      }

      const { error } = await supabase
        .from('signalements')
        .insert({
          titre:       titre.trim(),
          description: description.trim() || null,
          categorie,
          latitude:    lat,
          longitude:   lng,
          statut:      'nouveau',
          photo_url,
        })

      if (error) throw error

      addToast('Signalement envoyé avec succes !', 'success')
      setTitre('')
      setDescription('')
      setCategorie('')
      setSelectedFile(null)
      setPhotoPreview(null)
      setIsModalOpen(false)
      fetchSignalements() // Recharge les marqueurs
    } catch (err: any) {
      console.error('Erreur Supabase:', err)
      addToast('Erreur : ' + (err.message || 'Problème inconnu'), 'error')
    } finally {
      setLoading(false)
    }
  }

  // ── Filtrage ──────────────────────────────────────────────────────────────────
  const filteredSignalements = filterCat === 'all'
    ? signalements
    : signalements.filter(s => s.categorie === filterCat)

  // ── Formatage date ────────────────────────────────────────────────────────────
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
    })

  // ─────────────────────────────────────────────────────────────────────────────
  if (!position) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 font-medium">Localisation en cours...</p>
        <p className="text-sm text-gray-400">Autorisez la géolocalisation si demandé</p>
      </div>
    )
  }

  return (
    <div className="h-screen w-full relative flex flex-col">

      {/* ── NAVBAR ─────────────────────────────────────────────────────────────── */}
      <header className="relative z-[1500] bg-white border-b border-gray-200 shadow-sm px-4 h-14 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm">CitySignal</span>
            <span className="text-xs text-gray-400 ml-1 hidden sm:inline">— Lomé, Togo</span>
          </div>
        </div>

        {/* Compteur */}
        <div className="flex items-center gap-3 text-sm text-gray-500">
          {loadingMap ? (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
          ) : (
            <span>
              <span className="font-bold text-gray-800">{filteredSignalements.length}</span>
              {' '}signalement{filteredSignalements.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </header>

      {/* ── BOUTON ADMIN – placé plus bas (top-32 au lieu de top-20) ───────────── */}
      {isAdmin && (
        <div className="absolute top-32 right-6 z-[1000]">
          <Link
            href="/admin"
            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg shadow-md transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Admin
          </Link>
        </div>
      )}

      {/* ── BARRE FILTRES ──────────────────────────────────────────────────────── */}
      <div className="relative z-[1400] bg-white/90 backdrop-blur-sm border-b border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto flex-shrink-0">
        <button
          onClick={() => setFilterCat('all')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all
            ${filterCat === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Tous
        </button>
        {Object.entries(categoryConfig).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setFilterCat(key)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
              ${filterCat === key
                ? 'text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            style={filterCat === key ? { backgroundColor: val.color } : {}}
          >
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${filterCat === key ? 'bg-white/70' : val.dot}`}
            />
            {val.label}
          </button>
        ))}
      </div>

      {/* ── CARTE ──────────────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        <MapContainer
          center={position}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <RecenterMap position={position} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Marqueur utilisateur */}
          <Marker position={position} icon={makeUserIcon()}>
            <Popup>
              <div className="text-center">
                <p className="font-semibold text-gray-800 text-sm">Vous etes ici</p>
                <p className="text-xs text-gray-500 mt-1">
                  {Array.isArray(position) ? `${position[0].toFixed(5)}, ${position[1].toFixed(5)}` : ''}
                </p>
              </div>
            </Popup>
          </Marker>

          {/* Marqueurs signalements */}
          {filteredSignalements.map((s) => {
            const catConf    = categoryConfig[s.categorie] ?? categoryConfig['autre']
            const statConf   = statutConfig[s.statut]     ?? statutConfig['nouveau']
            return (
              <Marker
                key={s.id}
                position={[s.latitude, s.longitude]}
                icon={makeCategoryIcon(s.categorie)}
              >
                <Popup minWidth={220}>
                  <div className="py-1 min-w-[200px]">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-gray-900 text-sm leading-tight flex-1">
                        {s.titre}
                      </h3>
                      <span
                        className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full
                          ${statConf.bg} ${statConf.text}`}
                      >
                        {statConf.label}
                      </span>
                    </div>

                    {/* Catégorie */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: catConf.color }}
                      />
                      <span className="text-xs text-gray-500">{catConf.label}</span>
                    </div>

                    {/* Description */}
                    {s.description && (
                      <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                        {s.description}
                      </p>
                    )}

                    {/* Photo */}
                    {s.photo_url && (
                      <img
                        src={s.photo_url}
                        alt="Photo du signalement"
                        className="w-full h-28 object-cover rounded-lg mb-2 border border-gray-200"
                      />
                    )}

                    {/* Date */}
                    <p className="text-[10px] text-gray-400 mt-1">
                      {formatDate(s.created_at)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>

        {/* ── BOUTON FLOTTANT ───────────────────────────────────────────────────── */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="absolute bottom-6 right-6 z-[1000] bg-red-600 hover:bg-red-700
                     text-white w-14 h-14 rounded-full flex items-center justify-center
                     shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
          aria-label="Signaler un problème"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
        </button>

        {/* ── LÉGENDE COMPTEURS ─────────────────────────────────────────────────── */}
        <div className="absolute bottom-6 left-4 z-[1000] bg-white/90 backdrop-blur-sm
                        rounded-xl shadow-lg border border-gray-200 p-3 hidden sm:block">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Résumé
          </p>
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

      {/* ── MODAL ──────────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center
                     z-[2000] p-0 sm:p-4 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl
                       w-full sm:max-w-md max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle mobile */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Nouveau signalement</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Signalez un problème urbain</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full
                             bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Titre – amélioré pour lisibilité */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Titre du problème <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={titre}
                    onChange={(e) => setTitre(e.target.value)}
                    required
                    maxLength={100}
                    placeholder="Ex : Poubelle renversée rue principale"
                    className="w-full px-4 py-3.5 border border-gray-400 rounded-xl text-base text-gray-900
                               focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500
                               placeholder-gray-500 bg-white shadow-sm"
                  />
                </div>

                {/* Catégorie – amélioré */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Catégorie <span className="text-red-600">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(categoryConfig).map(([key, val]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setCategorie(key)}
                        className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left
                                    ${categorie === key
                                      ? 'border-current text-white shadow-md'
                                      : 'border-gray-400 text-gray-700 hover:border-gray-600 hover:bg-gray-50'}`}
                        style={categorie === key
                          ? { backgroundColor: val.color, borderColor: val.color }
                          : {}}
                      >
                        <span
                          className={`w-3 h-3 rounded-full flex-shrink-0
                            ${categorie === key ? 'bg-white/80' : val.dot}`}
                        />
                        <span className="truncate">{val.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description – amélioré */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Description <span className="text-gray-500 font-normal text-sm">(optionnel)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Détails supplémentaires..."
                    className="w-full px-4 py-3.5 border border-gray-400 rounded-xl text-base text-gray-900
                               focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500
                               resize-y placeholder-gray-500 bg-white shadow-sm"
                  />
                </div>

                {/* Photo – amélioré */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                    Photo <span className="text-gray-500 font-normal text-sm">(max 5 Mo)</span>
                  </label>
                  {!photoPreview ? (
                    <label className="flex flex-col items-center justify-center w-full h-32
                                      border-2 border-dashed border-gray-400 rounded-xl cursor-pointer
                                      hover:border-red-500 hover:bg-red-50/30 transition-all group">
                      <svg className="w-10 h-10 text-gray-500 group-hover:text-red-500 transition mb-2"
                           fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0
                             012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0
                             00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      <span className="text-sm text-gray-600 group-hover:text-red-600 transition">
                        Cliquez pour ajouter une photo
                      </span>
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden"/>
                    </label>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden border border-gray-400 shadow-sm">
                      <img src={photoPreview} alt="Aperçu"
                           className="w-full h-44 object-cover"/>
                      <button
                        type="button"
                        onClick={() => { setSelectedFile(null); setPhotoPreview(null) }}
                        className="absolute top-3 right-3 w-8 h-8 bg-black/70 hover:bg-black/90
                                   rounded-full flex items-center justify-center text-white transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Position – amélioré */}
                <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-4 py-3.5 text-sm">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  <span className="font-medium text-gray-800">
                    Position : <span className="font-mono text-gray-900 font-semibold">
                      {lat?.toFixed(5)}, {lng?.toFixed(5)}
                    </span>
                  </span>
                </div>

                {/* Boutons – légèrement améliorés pour contraste */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={loading}
                    className="flex-1 px-5 py-3.5 bg-gray-200 text-gray-800 font-medium rounded-xl
                               hover:bg-gray-300 transition disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl
                               transition flex items-center justify-center gap-2
                               disabled:opacity-60 disabled:cursor-not-allowed shadow-sm`}
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                        </svg>
                        Envoyer
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── TOASTS ─────────────────────────────────────────────────────────────── */}
      <div className="fixed top-16 right-4 z-[3000] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg text-sm font-medium
                        animate-in slide-in-from-right duration-300 max-w-xs
                        ${toast.type === 'success'
                          ? 'bg-green-600 text-white'
                          : 'bg-red-600 text-white'}`}
          >
            {toast.type === 'success' ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0
                         001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
            )}
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}