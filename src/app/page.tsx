import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600&display=swap');

        * { box-sizing: border-box; }

        .font-display { font-family: 'Playfair Display', serif; }
        .font-body    { font-family: 'DM Sans', sans-serif; }

        /* ── Grain overlay ── */
        .grain::after {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 100;
          opacity: 0.35;
        }

        /* ── Animated gradient mesh ── */
        .mesh {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 20% 20%, rgba(220,38,38,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 60% 80% at 80% 80%, rgba(220,38,38,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 40% 40% at 60% 10%, rgba(255,255,255,0.03) 0%, transparent 50%);
          animation: meshShift 12s ease-in-out infinite alternate;
        }
        @keyframes meshShift {
          0%   { opacity: 0.7; transform: scale(1); }
          100% { opacity: 1;   transform: scale(1.05); }
        }

        /* ── Grid lines ── */
        .grid-lines {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 80px 80px;
        }

        /* ── Floating badge ── */
        .badge-pill {
          background: rgba(220,38,38,0.12);
          border: 1px solid rgba(220,38,38,0.3);
          backdrop-filter: blur(10px);
          animation: fadeSlideDown 0.8s ease both;
        }
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Hero title ── */
        .hero-title {
          animation: fadeSlideUp 0.9s ease 0.15s both;
        }
        .hero-sub {
          animation: fadeSlideUp 0.9s ease 0.3s both;
        }
        .hero-cta {
          animation: fadeSlideUp 0.9s ease 0.45s both;
        }
        .hero-stats {
          animation: fadeSlideUp 0.9s ease 0.6s both;
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── CTA button pulse ring ── */
        .btn-primary {
          position: relative;
          background: #dc2626;
          transition: all 0.3s ease;
        }
        .btn-primary::before {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 18px;
          background: rgba(220,38,38,0.4);
          opacity: 0;
          transition: opacity 0.3s;
        }
        .btn-primary:hover::before { opacity: 1; }
        .btn-primary:hover { background: #b91c1c; transform: translateY(-2px); box-shadow: 0 20px 60px rgba(220,38,38,0.35); }
        .btn-primary:active { transform: translateY(0); }

        /* ── Feature cards ── */
        .feature-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          transition: all 0.3s ease;
          animation: fadeSlideUp 0.9s ease both;
        }
        .feature-card:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(220,38,38,0.3);
          transform: translateY(-4px);
        }
        .feature-card:nth-child(1) { animation-delay: 0.7s; }
        .feature-card:nth-child(2) { animation-delay: 0.85s; }
        .feature-card:nth-child(3) { animation-delay: 1s; }

        /* ── Stat divider line ── */
        .stat-line {
          width: 1px;
          height: 40px;
          background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.15), transparent);
        }

        /* ── Scroll indicator ── */
        .scroll-dot {
          animation: scrollBounce 2s ease-in-out infinite;
        }
        @keyframes scrollBounce {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50%       { transform: translateY(6px); opacity: 0.4; }
        }

        /* ── Nav blur ── */
        .nav-blur {
          background: rgba(10,10,10,0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        /* ── Red accent line ── */
        .accent-line {
          display: inline-block;
          width: 40px;
          height: 3px;
          background: #dc2626;
          border-radius: 2px;
          vertical-align: middle;
          margin-right: 12px;
        }

        /* ── Map preview mock ── */
        .map-mock {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          animation: fadeSlideUp 1s ease 0.5s both;
          overflow: hidden;
        }
        .map-pin {
          animation: pinBounce 2s ease-in-out infinite;
        }
        @keyframes pinBounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50%       { transform: translateY(-4px) scale(1.1); }
        }
        .map-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 0.2; transform: scale(1.6); }
        }

        .btn-ghost {
          border: 1px solid rgba(255,255,255,0.12);
          transition: all 0.25s ease;
        }
        .btn-ghost:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.2);
        }
      `}</style>

      {/* ── GRAIN ── */}
      <div className="grain" />

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav className="nav-blur fixed top-0 left-0 right-0 z-50 px-6 md:px-10 h-16 flex items-center justify-between font-body">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-900/40">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <span className="font-display font-bold text-white text-lg tracking-tight">CitySignal</span>
          <span className="hidden sm:block text-[10px] text-red-400/70 font-body font-medium tracking-widest uppercase mt-0.5 ml-1">Lomé</span>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/map"
            className="btn-ghost hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-300 font-medium font-body">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
            </svg>
            Carte
          </Link>
          <Link href="/login"
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold font-body rounded-xl transition-all shadow-lg shadow-red-900/30 hover:shadow-red-900/50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="hidden sm:block">Connexion Admin</span>
            <span className="sm:hidden">Admin</span>
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-16 overflow-hidden">
        <div className="mesh" />
        <div className="grid-lines" />

        <div className="relative z-10 max-w-5xl mx-auto w-full">

          {/* Badge */}
          <div className="flex justify-center mb-8">
            <div className="badge-pill inline-flex items-center gap-2 px-4 py-2 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-xs font-body font-medium text-red-300 tracking-wide uppercase">
                Plateforme citoyenne active — Togo
              </span>
            </div>
          </div>

          {/* Title */}
          <h1 className="hero-title font-display text-center leading-[1.05] tracking-tight mb-6">
            <span className="block text-5xl md:text-7xl lg:text-8xl font-black text-white">
              Votre ville,
            </span>
            <span className="block text-5xl md:text-7xl lg:text-8xl font-black italic text-red-500 mt-1">
              votre voix.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="hero-sub font-body text-center text-gray-400 text-lg md:text-xl max-w-xl mx-auto leading-relaxed mb-10">
            Signalez nids-de-poule, déchets, éclairages défectueux et fuites d'eau.
            Ensemble, construisons un <span className="text-white font-medium">Lomé plus propre et plus sûr</span>.
          </p>

          {/* CTA */}
          <div className="hero-cta flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/map"
              className="btn-primary font-body inline-flex items-center gap-3 px-8 py-4 text-white text-base font-semibold rounded-2xl shadow-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
              </svg>
              Ouvrir la carte interactive
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
            <a href="#features"
              className="btn-ghost font-body inline-flex items-center gap-2 px-8 py-4 text-gray-300 text-base font-medium rounded-2xl">
              En savoir plus
            </a>
          </div>

          {/* Map mock preview */}
          <div className="map-mock rounded-3xl p-1 max-w-2xl mx-auto">
            <div className="relative rounded-[22px] overflow-hidden bg-[#111] h-64 flex items-center justify-center">
              {/* Fake grid */}
              <div className="absolute inset-0"
                style={{
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                  backgroundSize: '40px 40px'
                }} />
              {/* Fake roads */}
              <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 600 300">
                <line x1="0" y1="150" x2="600" y2="150" stroke="white" strokeWidth="3"/>
                <line x1="0" y1="90"  x2="600" y2="90"  stroke="white" strokeWidth="1.5"/>
                <line x1="0" y1="210" x2="600" y2="210" stroke="white" strokeWidth="1.5"/>
                <line x1="200" y1="0" x2="200" y2="300" stroke="white" strokeWidth="1.5"/>
                <line x1="400" y1="0" x2="400" y2="300" stroke="white" strokeWidth="1.5"/>
                <line x1="100" y1="0" x2="100" y2="300" stroke="white" strokeWidth="1"/>
                <line x1="300" y1="0" x2="300" y2="300" stroke="white" strokeWidth="1"/>
                <line x1="500" y1="0" x2="500" y2="300" stroke="white" strokeWidth="1"/>
              </svg>

              {/* Pins */}
              {[
                { x: '30%',  y: '40%', color: '#f97316', delay: '0s'    },
                { x: '55%',  y: '60%', color: '#22c55e', delay: '0.4s'  },
                { x: '70%',  y: '35%', color: '#eab308', delay: '0.8s'  },
                { x: '20%',  y: '65%', color: '#3b82f6', delay: '1.2s'  },
                { x: '80%',  y: '70%', color: '#8b5cf6', delay: '1.6s'  },
              ].map((pin, i) => (
                <div key={i} className="absolute" style={{ left: pin.x, top: pin.y }}>
                  <div className="relative map-pin" style={{ animationDelay: pin.delay }}>
                    <div className="absolute -inset-3 rounded-full map-pulse"
                      style={{ background: pin.color, animationDelay: pin.delay }} />
                    <div className="w-4 h-4 rounded-full border-2 border-white shadow-lg relative z-10"
                      style={{ background: pin.color }} />
                  </div>
                </div>
              ))}

              {/* User location */}
              <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
                <div className="relative">
                  <div className="absolute -inset-5 rounded-full bg-red-500/20 map-pulse" />
                  <div className="absolute -inset-2 rounded-full bg-red-500/30" />
                  <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-white shadow-xl relative z-10" />
                </div>
              </div>

              {/* Overlay label */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                <div className="bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/10">
                  <p className="text-[10px] text-gray-400 font-body font-medium uppercase tracking-wider">Lomé, Togo</p>
                  <p className="text-sm text-white font-body font-bold">Vue en direct</p>
                </div>
                <div className="bg-red-600/90 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  <span className="text-xs text-white font-body font-bold">EN DIRECT</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="hero-stats flex items-center justify-center gap-8 mt-10">
            {[
              { value: '100%', label: 'Gratuit & citoyen' },
              { value: '5',    label: 'Catégories' },
              { value: '24/7', label: 'Disponible' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-8">
                {i > 0 && <div className="stat-line" />}
                <div className="text-center">
                  <p className="font-display text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-gray-500 font-body font-medium mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 scroll-dot">
          <span className="text-[10px] text-gray-600 font-body tracking-widest uppercase">Découvrir</span>
          <div className="w-px h-8 bg-gradient-to-b from-gray-600 to-transparent" />
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section id="features" className="relative py-24 px-6 md:px-10 bg-[#0d0d0d]">
        <div className="max-w-5xl mx-auto">

          {/* Section label */}
          <div className="mb-14 text-center">
            <p className="font-body text-sm text-red-500 font-semibold tracking-widest uppercase mb-3">
              <span className="accent-line" />
              Comment ça marche
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white">
              Simple, rapide, efficace.
            </h2>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                ),
                step: '01',
                title: 'Localisez',
                desc: 'Ouvrez la carte, votre position est détectée automatiquement. Naviguez jusqu\'au problème observé.',
                color: '#f97316',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                ),
                step: '02',
                title: 'Signalez',
                desc: 'Décrivez le problème, choisissez une catégorie et ajoutez une photo. En moins d\'une minute.',
                color: '#dc2626',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                ),
                step: '03',
                title: 'Suivez',
                desc: 'Chaque signalement est traité par l\'administration et mis à jour en temps réel sur la carte.',
                color: '#22c55e',
              },
            ].map((f, i) => (
              <div key={i} className="feature-card rounded-2xl p-7" style={{ animationDelay: `${0.7 + i * 0.15}s` }}>
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: `${f.color}18`, color: f.color }}>
                    {f.icon}
                  </div>
                  <span className="font-display text-5xl font-black text-white/5">{f.step}</span>
                </div>
                <h3 className="font-display text-xl font-bold text-white mb-2">{f.title}</h3>
                <p className="font-body text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORIES STRIP ─────────────────────────────────────────── */}
      <section className="py-16 px-6 border-t border-white/5 bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto">
          <p className="text-center font-body text-xs text-gray-600 uppercase tracking-widest mb-8">
            Catégories de signalement
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: 'Voirie / Chaussée',     color: '#f97316', icon: '🚧' },
              { label: 'Propreté / Déchets',    color: '#22c55e', icon: '🗑️' },
              { label: 'Éclairage public',       color: '#eab308', icon: '💡' },
              { label: 'Fuite d\'eau / Inond.', color: '#3b82f6', icon: '💧' },
              { label: 'Autre',                  color: '#8b5cf6', icon: '⚠️' },
            ].map((cat, i) => (
              <div key={i}
                className="flex items-center gap-2.5 px-5 py-3 rounded-full border font-body text-sm font-medium transition-all"
                style={{
                  borderColor: `${cat.color}30`,
                  background: `${cat.color}0d`,
                  color: cat.color,
                }}>
                <span>{cat.icon}</span>
                {cat.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ───────────────────────────────────────────────── */}
      <section className="relative py-28 px-6 overflow-hidden bg-[#0d0d0d]">
        <div className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 70% 70% at 50% 50%, rgba(220,38,38,0.08) 0%, transparent 70%)'
          }} />
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            Prêt à améliorer<br/>
            <span className="italic text-red-500">votre quartier ?</span>
          </h2>
          <p className="font-body text-gray-400 mb-10 text-lg">
            Rejoignez les citoyens qui prennent leur ville en main.
          </p>
          <Link href="/map"
            className="btn-primary font-body inline-flex items-center gap-3 px-10 py-5 text-white text-lg font-bold rounded-2xl shadow-2xl">
            Commencer maintenant
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-6 md:px-10 py-8 bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-600 rounded-md flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <span className="font-display font-bold text-white text-sm">CitySignal</span>
          </div>
          <p className="font-body text-xs text-gray-600 text-center">
            © 2025 CitySignal — Plateforme citoyenne de Lomé, Togo. Tous droits réservés.
          </p>
          <Link href="/login" className="font-body text-xs text-gray-600 hover:text-red-400 transition-colors">
            Administration →
          </Link>
        </div>
      </footer>
    </main>
  )
}