import { Link, Navigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { Splash } from '../components/guards'
import Logo from '../components/Logo'
import Icon from '../components/Icon'
import './home.css'

const FEATURES = [
  { icon: 'book', title: 'Telugu + English', te: 'తెలుగు + ఇంగ్లీష్', desc: 'Every question in both languages — exactly like the real AP TET paper.' },
  { icon: 'calendar', title: 'A fresh paper daily', te: 'ప్రతిరోజూ కొత్త పేపర్', desc: '150 questions each day across all 5 subjects, weighted like the real exam.' },
  { icon: 'check', title: 'Answers + explanations', te: 'జవాబులు + వివరణలు', desc: 'See the correct option with a short 1–2 line reason for every question.' },
  { icon: 'trophy', title: 'Leaderboard & rank', te: 'ర్యాంక్ & లీడర్‌బోర్డ్', desc: 'See where you stand and share your score — practice with the whole community.' },
]

export default function Home() {
  const { theme, toggleTheme } = useTheme()
  const { isAuthenticated, isAdmin, loading } = useAuth()

  // If a signed-in user opens the public landing (e.g. from a home-screen
  // shortcut / saved PWA), take them straight into the app instead of showing
  // the login/signup marketing page.
  if (loading) return <Splash />
  if (isAuthenticated) return <Navigate to={isAdmin ? '/admin' : '/app'} replace />

  return (
    <div className="landing">
      <div className="landing-top">
        <Logo size={30} />
        <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={21} />
        </button>
      </div>

      <section className="hero">
        <span className="hero-badge">
          <Icon name="sparkles" size={14} /> AP TET · SGT · Paper I
        </span>
        <h1>
          Become <span className="accent">exam-ready</span>,<br /> one paper a day.
        </h1>
        <p className="hero-te telugu">ప్రతిరోజూ ఒక పరీక్షతో TET కు సిద్ధమవండి.</p>
        <p>
          Daily mock exams for TET SGT Paper I in Telugu &amp; English — built from real
          previous-year papers, with answers and explanations.
        </p>
      </section>

      <section className="offer" aria-label="Subscription offer">
        <span className="offer-ribbon">🎉 This month only</span>
        <div className="price-row">
          <span className="price-old">₹300</span>
          <span className="price"><small>₹</small>149</span>
          <span style={{ opacity: 0.9 }}>for 30 days</span>
        </div>
        <span className="per-day">30 papers · just ₹5 / day</span>
        <ul>
          <li><span className="tick"><Icon name="check" size={12} /></span> A new 150-question paper every day for 30 days</li>
          <li><span className="tick"><Icon name="check" size={12} /></span> Attempt with answers, or exam-mode without</li>
          <li><span className="tick"><Icon name="check" size={12} /></span> Instant score, rank &amp; a shareable result card</li>
          <li><span className="tick"><Icon name="check" size={12} /></span> Retake any paper to beat your best score</li>
        </ul>
      </section>

      <p className="center muted" style={{ fontSize: 'var(--fs-sm)', marginTop: 'calc(-1 * var(--sp-2))' }}>
        Previous-year question papers are <strong style={{ color: 'var(--green-500)' }}>free for everyone</strong> — start practising today.
      </p>

      {/* Telugu introduction — most of our users are Telugu speakers */}
      <section className="intro-te card">
        <h4>TETGenie అంటే ఏమిటి? 🧞</h4>
        <p className="telugu">
          TETGenie మీకు <strong>AP TET · SGT · పేపర్ I</strong> కోసం ప్రతిరోజూ కొత్త మాదిరి ప్రశ్నపత్రాలను
          అందిస్తుంది. ప్రతి ప్రశ్న <strong>తెలుగు మరియు ఇంగ్లీష్</strong> రెండు భాషల్లోనూ ఉంటుంది — సరైన సమాధానం,
          చిన్న వివరణతో సహా. మునుపటి సంవత్సరాల ప్రశ్నపత్రాలు <strong>అందరికీ ఉచితం</strong>.
          ప్రాక్టీస్ చేయండి, మీ స్కోర్ చూసుకోండి, ర్యాంక్ పొందండి, మరియు మీ ఫలితాన్ని WhatsApp లో పంచుకోండి.
        </p>
      </section>

      <section className="features">
        {FEATURES.map((f) => (
          <div key={f.title} className="feature card">
            <span className="f-icon"><Icon name={f.icon} size={22} /></span>
            <div>
              <h4>{f.title} <span className="telugu f-te">· {f.te}</span></h4>
              <p>{f.desc}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="cta-stack">
        <Link to="/signup" className="btn btn-primary btn-lg btn-block">
          Create free account
        </Link>
        <Link to="/login" className="btn btn-ghost btn-lg btn-block">
          I already have an account
        </Link>
      </div>

      <footer className="landing-footer">
        Made for AP TET aspirants · Telugu · English<br />
        © {new Date().getFullYear()} TETGenie
      </footer>
    </div>
  )
}
