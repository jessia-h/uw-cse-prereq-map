import { useState } from 'react'
import { courseData } from '../data/courses.ts'
import { searchCourses } from '../lib/search.ts'

const allCourses = [...courseData.courses, ...courseData.external]

/** Search by number or title. Enter picks the first result. */
export function SearchBox({ onSelect }: { onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const results = searchCourses(query, allCourses)

  const pick = (id: string) => {
    setQuery('')
    onSelect(id)
  }

  return (
    <form
      role="search"
      className="search"
      onSubmit={(e) => {
        e.preventDefault()
        if (results[0]) pick(results[0].id)
      }}
    >
      <label htmlFor="course-search">Search courses</label>
      <input
        id="course-search"
        type="search"
        autoComplete="off"
        placeholder="e.g. 451, CSE 332, or operating systems"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <p className="visually-hidden" role="status">
        {query.trim() && `${results.length} matching ${results.length === 1 ? 'course' : 'courses'}`}
      </p>
      {query.trim() && (
        <ul className="search__results">
          {results.length === 0 && <li className="search__empty">No matching courses.</li>}
          {results.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => pick(c.id)}>
                <strong>{c.id}</strong>
                {c.title && ` — ${c.title}`}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}
