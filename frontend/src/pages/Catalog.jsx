import { Link } from 'react-router-dom'
import { SPECIES } from '../lib/farm'
import { useApi } from '../lib/useApi'
import './Catalog.css'

export default function Catalog() {
  const { data } = useApi('/api/summary/')
  return (
    <>
      <h1>Animal Catalog</h1>
      <p className="tagline">Pick a group to see each animal's profile, vital stats and records.</p>
      <div className="catalog-buttons">
        {SPECIES.map((s) => (
          <Link key={s.key} to={`/catalog/${s.group}`} className={`catalog-btn ${s.key}`}>
            <span className="catalog-btn-label">{s.label}</span>
            <span className="catalog-btn-count">{data ? `${data.species[s.key]} animals` : ' '}</span>
          </Link>
        ))}
        <Link to="/catalog/incubator" className="catalog-btn incubator">
          <span className="catalog-btn-label">Incubator</span>
          <span className="catalog-btn-count">{data ? `${data.incubating} eggs` : ' '}</span>
        </Link>
      </div>
    </>
  )
}
