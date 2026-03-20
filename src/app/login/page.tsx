'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirect     = searchParams.get('redirect') || '/admin'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }

    // Vérifie le rôle admin
    const role = data.user?.user_metadata?.role
    if (role !== 'admin') {
      await supabase.auth.signOut()
      setError('Accès refusé : vous n\'êtes pas administrateur')
      setLoading(false)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955
                   11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824
                   10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-white text-lg">CitySignal</p>
            <p className="text-xs text-gray-500">Administration</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@citysignal.tg"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl
                         text-white text-sm placeholder-gray-600
                         focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl
                         text-white text-sm placeholder-gray-600
                         focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30
                            text-red-400 text-sm rounded-xl px-4 py-3">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0
                         001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold
                       rounded-xl transition text-sm disabled:opacity-60 flex items-center
                       justify-center gap-2 mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
