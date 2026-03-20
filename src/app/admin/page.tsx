'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const categoryConfig: Record<string, { color: string; label: string; bg: string }> = {
  voirie:    { color: '#f97316', label: 'Voirie / Chaussée',     bg: 'bg-orange-500/15 text-orange-400 ring-orange-500/30' },
  proprete:  { color: '#22c55e', label: 'Propreté / Déchets',    bg: 'bg-green-500/15 text-green-400 ring-green-500/30'   },
  eclairage: { color: '#eab308', label: 'Éclairage public',      bg: 'bg-yellow-500/15 text-yellow-400 ring-yellow-500/30'},
  eau:       { color: '#3b82f6', label: "Fuite d'eau / Inond.",  bg: 'bg-blue-500/15 text-blue-400 ring-blue-500/30'      },
  autre:     { color: '#8b5cf6', label: 'Autre',                 bg: 'bg-violet-500/15 text-violet-400 ring-violet-500/30'},
}

const statutConfig: Record<string, { label: string; color: string; bg: string; next: string; nextLabel: string }> = {
  nouveau:  { label: 'Nouveau',  color: '#ef4444', bg: 'bg-red-500/15 text-red-400 ring-red-500/30',         next: 'en_cours', nextLabel: 'Prendre en charge' },
  en_cours: { label: 'En cours', color: '#f59e0b', bg: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',   next: 'resolu',   nextLabel: 'Marquer résolu'    },
  resolu:   { label: 'Résolu',   color: '#22c55e', bg: 'bg-green-500/15 text-green-400 ring-green-500/30',   next: 'nouveau',  nextLabel: 'Rouvrir'           },
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

// ─── MAIN ADMIN PAGE ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const [signalements, setSignalements]   = useState<Signalement[]>([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [filterCat, setFilterCat]         = useState('all')
  const [filterStatut, setFilterStatut]   = useState('all')
  const [sortBy, setSortBy]               = useState<'date' | 'statut' | 'categorie'>('date')
  const [sortDir, setSortDir]             = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected]           = useState<Signalement | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [toasts, setToasts]               = useState<Toast[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab]         = useState<'table' | 'stats'>('table')

  // ── Toast ─────────────────────────────────────────────────────────────────
  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('signalements')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setSignalements(data ?? [])
    } catch (err: any) {
      addToast('Erreur de chargement : ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Update statut ─────────────────────────────────────────────────────────
  const handleUpdateStatut = async (id: string, newStatut: string) => {
    setActionLoading(id + '_statut')
    try {
      const { error } = await supabase
        .from('signalements')
        .update({ statut: newStatut })
        .eq('id', id)
      if (error) throw error
      setSignalements(prev => prev.map(s => s.id === id ? { ...s, statut: newStatut } : s))
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, statut: newStatut } : null)
      addToast('Statut mis à jour avec succès', 'success')
    } catch (err: any) {
      addToast('Erreur : ' + err.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setActionLoading(id + '_delete')
    try {
      const { error } = await supabase
        .from('signalements')
        .delete()
        .eq('id', id)
      if (error) throw error
      setSignalements(prev => prev.filter(s => s.id !== id))
      if (selected?.id === id) setSelected(null)
      setConfirmDelete(null)
      addToast('Signalement supprimé', 'success')
    } catch (err: any) {
      addToast('Erreur : ' + err.message, 'error')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Déconnexion ───────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  // ── Filter & sort ─────────────────────────────────────────────────────────
  const filtered = signalements
    .filter(s => {
      const matchSearch = s.titre.toLowerCase().includes(search.toLowerCase()) ||
        (s.description ?? '').toLowerCase().includes(search.toLowerCase())
      const matchCat    = filterCat    === 'all' || s.categorie === filterCat
      const matchStatut = filterStatut === 'all' || s.statut    === filterStatut
      return matchSearch && matchCat && matchStatut
    })
    .sort((a, b) => {
      let valA: string, valB: string
      if (sortBy === 'date')      { valA = a.created_at; valB = b.created_at }
      else if (sortBy === 'statut')    { valA = a.statut;      valB = b.statut }
      else                        { valA = a.categorie;   valB = b.categorie }
      return sortDir === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB)
    })

  const toggleSort = (col: 'date' | 'statut' | 'categorie') => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const total     = signalements.length
  const nouveaux  = signalements.filter(s => s.statut === 'nouveau').length
  const enCours   = signalements.filter(s => s.statut === 'en_cours').length
  const resolus   = signalements.filter(s => s.statut === 'resolu').length
  const tauxRes   = total > 0 ? Math.round((resolus / total) * 100) : 0

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        :root {
          --bg:    #0c0f14;
          --surface: #121722;
          --card:  #161d2b;
          --border: #1e2840;
          --muted: #3a4560;
          --text:  #e2e8f7;
          --sub:   #7a88a8;
          --red:   #ef4444;
          --red-d: #dc2626;
        }
        body { margin:0; background:var(--bg); color:var(--text); font-family:'DM Sans',sans-serif; }
        .mono { font-family:'DM Mono',monospace; }
        .syne { font-family:'Syne',sans-serif; }
        .scrollbar-hide::-webkit-scrollbar { display:none; }
        .scrollbar-hide { -ms-overflow-style:none; scrollbar-width:none; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:var(--bg); }
        ::-webkit-scrollbar-thumb { background:var(--border); border-radius:99px; }
        tr:hover td { background:#181f30 !important; }

        @keyframes fadeIn  { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        @keyframes slideUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:none } }
        @keyframes pulse2  { 0%,100% { opacity:1 } 50% { opacity:.4 } }
        .animate-fadeIn  { animation: fadeIn  .3s ease forwards }
        .animate-slideUp { animation: slideUp .35s ease forwards }
        .animate-pulse2  { animation: pulse2  1.5s infinite }

        .kpi-card { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:20px 24px; transition:border-color .2s, transform .2s; }
        .kpi-card:hover { border-color:var(--muted); transform:translateY(-2px); }

        .badge { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:99px; font-size:11px; font-weight:600; font-family:'DM Sans',sans-serif; ring:1px; }
        .btn-primary { background:var(--red); color:#fff; border:none; border-radius:10px; padding:8px 16px; font-size:13px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:background .15s,transform .1s; display:inline-flex; align-items:center; gap:6px; }
        .btn-primary:hover { background:var(--red-d); transform:scale(1.02); }
        .btn-primary:active { transform:scale(.98); }
        .btn-ghost { background:transparent; color:var(--sub); border:1px solid var(--border); border-radius:10px; padding:8px 14px; font-size:13px; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .15s; }
        .btn-ghost:hover { border-color:var(--muted); color:var(--text); background:var(--card); }

        .input-field { background:var(--card); border:1px solid var(--border); border-radius:10px; padding:9px 14px; font-size:13px; color:var(--text); font-family:'DM Sans',sans-serif; outline:none; transition:border-color .15s; }
        .input-field:focus { border-color:#3b82f6; }
        .input-field::placeholder { color:var(--muted); }

        .select-field { appearance:none; background:var(--card); border:1px solid var(--border); border-radius:10px; padding:9px 32px 9px 14px; font-size:13px; color:var(--text); font-family:'DM Sans',sans-serif; outline:none; cursor:pointer; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%237a88a8' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; }
        .select-field:focus { border-color:#3b82f6; }

        .th { padding:10px 16px; text-align:left; font-size:11px; font-weight:600; color:var(--sub); text-transform:uppercase; letter-spacing:.06em; border-bottom:1px solid var(--border); white-space:nowrap; cursor:pointer; user-select:none; background:var(--surface); }
        .th:hover { color:var(--text); }
        .td { padding:13px 16px; font-size:13px; border-bottom:1px solid #1a2035; vertical-align:middle; transition:background .1s; }

        .progress-bar { height:6px; background:var(--border); border-radius:99px; overflow:hidden; }
        .progress-fill { height:100%; border-radius:99px; transition:width .5s ease; }

        .drawer { position:fixed; right:0; top:0; height:100vh; width:400px; background:var(--surface); border-left:1px solid var(--border); z-index:500; overflow-y:auto; display:flex; flex-direction:column; animation:slideUp .3s ease; box-shadow:-20px 0 60px rgba(0,0,0,.5); }
        @media (max-width:640px) { .drawer { width:100%; } }

        .tab-btn { padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; transition:all .15s; border:none; font-family:'DM Sans',sans-serif; }
        .tab-active { background:#1e2840; color:#e2e8f7; }
        .tab-inactive { background:transparent; color:var(--sub); }
        .tab-inactive:hover { color:var(--text); }
      `}</style>

      <div style={{ minHeight:'100vh', background:'var(--bg)' }}>

        {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
        <div style={{ position:'fixed', left:0, top:0, bottom:0, width:220, background:'var(--surface)', borderRight:'1px solid var(--border)', zIndex:100, display:'flex', flexDirection:'column', padding:'24px 16px' }} className="hidden lg:flex">
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:32 }}>
            <div style={{ width:32, height:32, background:'#ef4444', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <div>
              <div className="syne" style={{ fontSize:14, fontWeight:700, color:'#e2e8f7' }}>CitySignal</div>
              <div style={{ fontSize:10, color:'#ef4444', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase' }}>Admin</div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {[
              { icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label:'Tableau de bord', active:true },
              { icon:'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', label:'Carte', href:'/map' },
            ].map(item => (
              <a key={item.label} href={item.href ?? '#'}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, textDecoration:'none',
                  background: item.active ? '#1e2840' : 'transparent',
                  color: item.active ? '#e2e8f7' : '#7a88a8',
                  fontSize:13, fontWeight:500, transition:'all .15s' }}
                onMouseEnter={e => { if (!item.active) (e.currentTarget as HTMLElement).style.color = '#e2e8f7' }}
                onMouseLeave={e => { if (!item.active) (e.currentTarget as HTMLElement).style.color = '#7a88a8' }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon}/>
                </svg>
                {item.label}
              </a>
            ))}
          </nav>

          {/* Footer */}
          <div style={{ marginTop:'auto', padding:'12px', background:'#0c0f14', borderRadius:12, border:'1px solid var(--border)' }}>
            <div style={{ fontSize:10, color:'var(--sub)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Connecté en tant que</div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Administrateur</div>
            <div style={{ fontSize:11, color:'var(--sub)' }}>Lomé, Togo</div>
          </div>
        </div>

        {/* ── MAIN ────────────────────────────────────────────────────────── */}
        <div style={{ marginLeft:220, padding:'32px 28px', minHeight:'100vh' }} className="lg:ml-[220px] ml-0 p-4 lg:p-7">

          {/* Header – Bouton Déconnexion ajouté ici */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
            <div>
              <h1 className="syne" style={{ margin:0, fontSize:26, fontWeight:800, color:'#e2e8f7', letterSpacing:'-.02em' }}>
                Tableau de bord
              </h1>
              <p style={{ margin:'4px 0 0', color:'var(--sub)', fontSize:13 }}>
                Gestion des signalements — CitySignal Lomé
              </p>
            </div>

            {/* Bouton Déconnexion – ajouté ici */}
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                window.location.href = '/login'
              }}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl shadow-md transition-all hover:shadow-lg flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Déconnexion
            </button>
          </div>

          {/* ── KPIs ───────────────────────────────────────────────────────── */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:16, marginBottom:28 }}>
            {[
              { label:'Total signalements', value:total,    color:'#3b82f6', icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
              { label:'Nouveaux',           value:nouveaux, color:'#ef4444', icon:'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' },
              { label:'En cours',           value:enCours,  color:'#f59e0b', icon:'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
              { label:'Résolus',            value:resolus,  color:'#22c55e', icon:'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            ].map((kpi, i) => (
              <div key={kpi.label} className="kpi-card animate-fadeIn" style={{ animationDelay:`${i * 60}ms` }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
                  <div style={{ fontSize:12, color:'var(--sub)', fontWeight:500, textTransform:'uppercase', letterSpacing:'.05em' }}>
                    {kpi.label}
                  </div>
                  <div style={{ width:32, height:32, borderRadius:8, background:`${kpi.color}20`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="16" height="16" fill="none" stroke={kpi.color} strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={kpi.icon}/>
                    </svg>
                  </div>
                </div>
                <div className="syne" style={{ fontSize:34, fontWeight:800, color:'var(--text)', lineHeight:1 }}>{kpi.value}</div>
                {kpi.label === 'Résolus' && (
                  <div style={{ marginTop:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--sub)', marginBottom:4 }}>
                      <span>Taux de résolution</span>
                      <span className="mono">{tauxRes}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width:`${tauxRes}%`, background:'#22c55e' }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── STATS PAR CATÉGORIE ──────────────────────────────────────── */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:20, marginBottom:24 }}>
            <div style={{ fontSize:12, color:'var(--sub)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:16 }}>
              Répartition par catégorie
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {Object.entries(categoryConfig).map(([key, val]) => {
                const count = signalements.filter(s => s.categorie === key).length
                const pct   = total > 0 ? (count / total) * 100 : 0
                return (
                  <div key={key} style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:val.color, flexShrink:0 }} />
                    <div style={{ fontSize:13, color:'var(--text)', flex:1, minWidth:120 }}>{val.label}</div>
                    <div style={{ flex:3 }}>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width:`${pct}%`, background:val.color }} />
                      </div>
                    </div>
                    <div className="mono" style={{ fontSize:12, color:'var(--sub)', width:24, textAlign:'right' }}>{count}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── FILTRES & SEARCH ─────────────────────────────────────────── */}
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:16, alignItems:'center' }}>
            <div style={{ position:'relative', flex:1, minWidth:200 }}>
              <svg style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--muted)' }} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input
                className="input-field"
                style={{ width:'100%', paddingLeft:36 }}
                placeholder="Rechercher un signalement..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="select-field" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ minWidth:170 }}>
              <option value="all">Toutes catégories</option>
              {Object.entries(categoryConfig).map(([k,v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select className="select-field" value={filterStatut} onChange={e => setFilterStatut(e.target.value)} style={{ minWidth:150 }}>
              <option value="all">Tous les statuts</option>
              <option value="nouveau">Nouveau</option>
              <option value="en_cours">En cours</option>
              <option value="resolu">Résolu</option>
            </select>
            <div style={{ fontSize:13, color:'var(--sub)', marginLeft:'auto', whiteSpace:'nowrap' }}>
              <span className="mono" style={{ color:'var(--text)', fontWeight:600 }}>{filtered.length}</span>
              {' '}résultat{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* ── TABLE ────────────────────────────────────────────────────── */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }}>
            {loading ? (
              <div style={{ padding:60, textAlign:'center', color:'var(--sub)' }}>
                <div style={{ width:32, height:32, border:'3px solid var(--border)', borderTopColor:'#ef4444', borderRadius:'50%', margin:'0 auto 16px', animation:'spin 1s linear infinite' }} />
                <div>Chargement des données...</div>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding:60, textAlign:'center', color:'var(--sub)' }}>
                <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin:'0 auto 12px', display:'block', opacity:.4 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <div style={{ fontSize:14 }}>Aucun signalement trouvé</div>
              </div>
            ) : (
              <div style={{ overflowX:'auto' }} className="scrollbar-hide">
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
                  <thead>
                    <tr>
                      <th className="th">Signalement</th>
                      <th className="th" onClick={() => toggleSort('categorie')} style={{ cursor:'pointer' }}>
                        Catégorie {sortBy === 'categorie' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                      </th>
                      <th className="th" onClick={() => toggleSort('statut')} style={{ cursor:'pointer' }}>
                        Statut {sortBy === 'statut' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                      </th>
                      <th className="th" onClick={() => toggleSort('date')} style={{ cursor:'pointer' }}>
                        Date {sortBy === 'date' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                      </th>
                      <th className="th">Coordonnées</th>
                      <th className="th" style={{ textAlign:'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => {
                      const cat  = categoryConfig[s.categorie] ?? categoryConfig['autre']
                      const stat = statutConfig[s.statut]      ?? statutConfig['nouveau']
                      return (
                        <tr key={s.id} style={{ animationDelay:`${i * 30}ms` }}>
                          {/* Signalement */}
                          <td className="td" style={{ maxWidth:220 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              {s.photo_url && (
                                <img src={s.photo_url} alt="" style={{ width:36, height:36, borderRadius:8, objectFit:'cover', border:'1px solid var(--border)', flexShrink:0 }} />
                              )}
                              <div>
                                <div style={{ fontWeight:600, color:'var(--text)', fontSize:13, marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:160 }}>
                                  {s.titre}
                                </div>
                                {s.description && (
                                  <div style={{ fontSize:11, color:'var(--sub)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:160 }}>
                                    {s.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          {/* Catégorie */}
                          <td className="td">
                            <span className={`badge ring-1 ${cat.bg}`} style={{ background:`${cat.color}18`, color:cat.color, '--tw-ring-color':cat.color + '33' } as any}>
                              <span style={{ width:6, height:6, borderRadius:'50%', background:cat.color, flexShrink:0 }} />
                              {cat.label}
                            </span>
                          </td>
                          {/* Statut */}
                          <td className="td">
                            <span className={`badge ring-1 ${stat.bg}`}>
                              <span style={{ width:6, height:6, borderRadius:'50%', background:stat.color, flexShrink:0 }} />
                              {stat.label}
                            </span>
                          </td>
                          {/* Date */}
                          <td className="td mono" style={{ fontSize:12, color:'var(--sub)', whiteSpace:'nowrap' }}>
                            {formatDate(s.created_at)}
                          </td>
                          {/* Coords */}
                          <td className="td mono" style={{ fontSize:11, color:'var(--muted)', whiteSpace:'nowrap' }}>
                            {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                          </td>
                          {/* Actions */}
                          <td className="td" style={{ textAlign:'right' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end' }}>
                              {/* Voir détail */}
                              <button
                                onClick={() => setSelected(s)}
                                style={{ padding:'6px 10px', background:'#1e2840', border:'1px solid var(--border)', borderRadius:8, color:'var(--sub)', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5, transition:'all .15s' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--muted)' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--sub)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
                              >
                                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                </svg>
                                Voir
                              </button>
                              {/* Changer statut */}
                              <button
                                onClick={() => handleUpdateStatut(s.id, stat.next)}
                                disabled={actionLoading === s.id + '_statut'}
                                style={{ padding:'6px 10px', background:'#1e2840', border:'1px solid var(--border)', borderRadius:8, color:'#3b82f6', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5, transition:'all .15s' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e2840'; (e.currentTarget as HTMLElement).style.borderColor = '#3b82f6' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
                              >
                                {actionLoading === s.id + '_statut' ? (
                                  <div style={{ width:12, height:12, border:'2px solid #3b82f650', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
                                ) : (
                                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                  </svg>
                                )}
                                {stat.nextLabel}
                              </button>
                              {/* Supprimer */}
                              <button
                                onClick={() => setConfirmDelete(s.id)}
                                style={{ padding:'6px 8px', background:'transparent', border:'1px solid var(--border)', borderRadius:8, color:'#ef444460', cursor:'pointer', display:'flex', alignItems:'center', transition:'all .15s' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; (e.currentTarget as HTMLElement).style.borderColor = '#ef4444'; (e.currentTarget as HTMLElement).style.background = '#ef444415' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#ef444460'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                              >
                                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── DRAWER DÉTAIL ────────────────────────────────────────────────── */}
        {selected && (
          <>
            <div
              style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:400, backdropFilter:'blur(4px)' }}
              onClick={() => setSelected(null)}
            />
            <div className="drawer">
              {/* Header */}
              <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexShrink:0 }}>
                <div>
                  <div style={{ fontSize:11, color:'var(--sub)', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600, marginBottom:6 }}>
                    Détail signalement
                  </div>
                  <h2 className="syne" style={{ margin:0, fontSize:18, fontWeight:700, color:'var(--text)', lineHeight:1.3 }}>
                    {selected.titre}
                  </h2>
                </div>
                <button onClick={() => setSelected(null)}
                  style={{ padding:8, background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, color:'var(--sub)', cursor:'pointer', display:'flex', marginTop:4 }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
                {/* Photo */}
                {selected.photo_url && (
                  <div style={{ marginBottom:20, borderRadius:12, overflow:'hidden', border:'1px solid var(--border)' }}>
                    <img src={selected.photo_url} alt="Photo" style={{ width:'100%', height:200, objectFit:'cover', display:'block' }} />
                  </div>
                )}

                {/* Badges */}
                <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
                  {(() => {
                    const cat  = categoryConfig[selected.categorie] ?? categoryConfig['autre']
                    const stat = statutConfig[selected.statut] ?? statutConfig['nouveau']
                    return (
                      <>
                        <span className="badge" style={{ background:`${cat.color}18`, color:cat.color, fontSize:12 }}>
                          <span style={{ width:7, height:7, borderRadius:'50%', background:cat.color }} />
                          {cat.label}
                        </span>
                        <span className="badge" style={{ background:`${stat.color}18`, color:stat.color, fontSize:12 }}>
                          <span style={{ width:7, height:7, borderRadius:'50%', background:stat.color }} />
                          {stat.label}
                        </span>
                      </>
                    )
                  })()}
                </div>

                {/* Description */}
                {selected.description && (
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:11, color:'var(--sub)', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600, marginBottom:8 }}>Description</div>
                    <p style={{ margin:0, fontSize:14, color:'var(--text)', lineHeight:1.7, background:'var(--card)', padding:'14px 16px', borderRadius:10, border:'1px solid var(--border)' }}>
                      {selected.description}
                    </p>
                  </div>
                )}

                {/* Infos */}
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:11, color:'var(--sub)', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600, marginBottom:10 }}>Informations</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:0, background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                    {[
                      { label:'ID', value:selected.id.slice(0,8) + '...', mono:true },
                      { label:'Date', value:formatDate(selected.created_at) },
                      { label:'Latitude', value:selected.latitude.toFixed(6), mono:true },
                      { label:'Longitude', value:selected.longitude.toFixed(6), mono:true },
                    ].map((row, i, arr) => (
                      <div key={row.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <span style={{ fontSize:12, color:'var(--sub)' }}>{row.label}</span>
                        <span className={row.mono ? 'mono' : ''} style={{ fontSize:12, color:'var(--text)', fontWeight:500 }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Changer statut */}
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:11, color:'var(--sub)', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600, marginBottom:10 }}>Changer le statut</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {Object.entries(statutConfig).map(([key, val]) => (
                      <button key={key}
                        onClick={() => handleUpdateStatut(selected.id, key)}
                        disabled={selected.statut === key || !!actionLoading}
                        style={{
                          display:'flex', alignItems:'center', gap:10, padding:'12px 14px',
                          background: selected.statut === key ? `${val.color}20` : 'var(--card)',
                          border: `1px solid ${selected.statut === key ? val.color + '40' : 'var(--border)'}`,
                          borderRadius:10, cursor: selected.statut === key ? 'default' : 'pointer',
                          color: selected.statut === key ? val.color : 'var(--sub)',
                          fontSize:13, fontWeight:500, textAlign:'left', transition:'all .15s',
                          fontFamily:'DM Sans, sans-serif', opacity: actionLoading ? .6 : 1
                        }}
                      >
                        <span style={{ width:8, height:8, borderRadius:'50%', background:val.color, flexShrink:0 }} />
                        {val.label}
                        {selected.statut === key && (
                          <span style={{ marginLeft:'auto', fontSize:11, fontWeight:600 }}>Actuel</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div style={{ padding:'16px 24px', borderTop:'1px solid var(--border)', display:'flex', gap:10, flexShrink:0 }}>
                <button className="btn-ghost" style={{ flex:1 }} onClick={() => setSelected(null)}>
                  Fermer
                </button>
                <button
                  onClick={() => setConfirmDelete(selected.id)}
                  style={{ flex:1, padding:'9px 16px', background:'#ef444415', color:'#ef4444', border:'1px solid #ef444430', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontFamily:'DM Sans,sans-serif', transition:'all .15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#ef444425'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#ef444415'}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                  Supprimer
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── MODAL CONFIRM DELETE ─────────────────────────────────────────── */}
        {confirmDelete && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(6px)' }}>
            <div className="animate-slideUp" style={{ background:'var(--surface)', border:'1px solid #ef444440', borderRadius:20, padding:28, maxWidth:360, width:'100%', boxShadow:'0 25px 80px rgba(0,0,0,.6)' }}>
              <div style={{ width:52, height:52, background:'#ef444418', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                <svg width="24" height="24" fill="none" stroke="#ef4444" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                </svg>
              </div>
              <h3 className="syne" style={{ margin:'0 0 8px', fontSize:18, fontWeight:700, color:'var(--text)', textAlign:'center' }}>
                Confirmer la suppression
              </h3>
              <p style={{ margin:'0 0 24px', fontSize:13, color:'var(--sub)', textAlign:'center', lineHeight:1.6 }}>
                Cette action est irréversible. Le signalement et sa photo seront définitivement supprimés.
              </p>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn-ghost" style={{ flex:1 }} onClick={() => setConfirmDelete(null)}>
                  Annuler
                </button>
                <button
                  className="btn-primary"
                  style={{ flex:1, justifyContent:'center', background:'#ef4444' }}
                  disabled={actionLoading === confirmDelete + '_delete'}
                  onClick={() => handleDelete(confirmDelete)}
                >
                  {actionLoading === confirmDelete + '_delete' ? (
                    <div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
                  ) : 'Supprimer définitivement'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TOASTS ───────────────────────────────────────────────────────── */}
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
          {toasts.map((toast) => (
            <div key={toast.id} className="animate-fadeIn"
              style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderRadius:12,
                background: toast.type === 'success' ? '#16a34a' : '#dc2626', color:'#fff',
                fontSize:13, fontWeight:500, boxShadow:'0 8px 32px rgba(0,0,0,.4)', maxWidth:300, fontFamily:'DM Sans,sans-serif' }}
            >
              {toast.type === 'success' ? (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              ) : (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              )}
              {toast.message}
            </div>
          ))}
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg) } }
        `}</style>
      </div>
    </>
  )
}