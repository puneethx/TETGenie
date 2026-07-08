import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

export default function NotFound() {
  return (
    <div className="screen-center">
      <div className="stack center gap-4">
        <Logo size={48} withText={false} />
        <div className="h1">404</div>
        <p className="muted">This page went off the syllabus.</p>
        <Link to="/" className="btn btn-primary">Back to home</Link>
      </div>
    </div>
  )
}
