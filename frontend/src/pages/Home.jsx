import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import Logo from '../components/Logo'
import Icon from '../components/Icon'
import './home.css'

const FEATURES = [
  { icon: 'book', title: 'Telugu + English', desc: 'Every question in both languages — exactly like the real AP TET paper.' },
  { icon: 'calendar', title: 'A fresh paper daily', desc: '150 questions each day across all 5 subjects, weighted like the real exam.' },
  { icon: 'check', title: 'Answers + explanations', desc: 'See the correct option with a short 1–2 line reason for every question.' },
  { icon: 'trophy', title: 'Leaderboard & rank', desc: 'See where you stand and share your score — practice with the whole community.' },
]

export default function Home() {
  const { theme, toggleTheme } = useTheme()
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
        <p>
          Daily mock exams for TET SGT Paper I in Telugu &amp; English — built from real
          previous-year papers, with answers and explanations.
        </p>
      </section>

      <section className="offer" aria-label="Subscription offer">
        <div className="price-row">
          <span className="price">
            <small>₹</small>149
          </span>
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

      <section className="features">
        {FEATURES.map((f) => (
          <div key={f.title} className="feature card">
            <span className="f-icon"><Icon name={f.icon} size={22} /></span>
            <div>
              <h4>{f.title}</h4>
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
