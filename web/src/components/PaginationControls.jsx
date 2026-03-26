import React from "react";

export default function PaginationControls({
  page,
  totalPages,
  onPageChange
}) {
  if (!totalPages || totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);

  for (let i = start; i <= end; i += 1) {
    pages.push(i);
  }

  return (
    <div
      className="card"
      style={{
        padding: 16,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap"
      }}
    >
      <div style={{ color: "var(--muted)" }}>
        Page <strong style={{ color: "var(--text)" }}>{page}</strong> of{" "}
        <strong style={{ color: "var(--text)" }}>{totalPages}</strong>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </button>

        {start > 1 && (
          <>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => onPageChange(1)}
            >
              1
            </button>
            {start > 2 && (
              <span style={{ alignSelf: "center", color: "var(--muted)", padding: "0 4px" }}>
                ...
              </span>
            )}
          </>
        )}

        {pages.map((pageNumber) => (
          <button
            key={pageNumber}
            className={pageNumber === page ? "btn" : "btn btn-secondary"}
            type="button"
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && (
              <span style={{ alignSelf: "center", color: "var(--muted)", padding: "0 4px" }}>
                ...
              </span>
            )}
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => onPageChange(totalPages)}
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}