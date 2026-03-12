export default function SearchBar({ query, setQuery }) {
  // Controlled input for event search/filtering.
  return (
    <input
      className="input"
      placeholder="Search events by keywords"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    />
  );
}
