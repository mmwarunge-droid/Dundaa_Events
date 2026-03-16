/*
SearchBar
---------
Controlled input used to filter events.
*/

export default function SearchBar({ query, setQuery }) {
  return (
    <input
      className="input"
      placeholder="Search events..."
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      style={{ width: "100%", marginBottom: 12 }}
    />
  );
}