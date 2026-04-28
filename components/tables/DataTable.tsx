"use client";

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: "left" | "right" | "center";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pageSize?: number;
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  getRowStyle?: (row: T) => React.CSSProperties;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  pageSize = 25,
  searchable = false,
  searchKeys = [],
  getRowStyle,
  onRowClick,
  emptyMessage = "Tidak ada data untuk periode ini",
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return data;
    return data.filter((row) =>
      searchKeys.some((k) =>
        String(row[k] ?? "").toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [data, search, searchKeys]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton h-11 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {searchable && (
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Cari..."
            className="w-full sm:w-72 pl-8 pr-4 py-2 text-sm rounded-lg outline-none transition-colors"
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#3B82F6")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: "var(--bg-tertiary)" }}>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
                  style={{
                    color: "var(--text-muted)",
                    width: col.width,
                    textAlign: col.align || "left",
                    cursor: col.sortable ? "pointer" : "default",
                    userSelect: "none",
                  }}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                >
                  <div className="flex items-center gap-1.5">
                    {col.label}
                    {col.sortable && (
                      <span style={{ color: sortKey === String(col.key) ? "#3B82F6" : "var(--text-muted)" }}>
                        {sortKey === String(col.key) ? (
                          sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                        ) : (
                          <ChevronDown size={12} className="opacity-40" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <circle cx="20" cy="20" r="19" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                      <path d="M14 20h12M20 14v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
                    </svg>
                    {emptyMessage}
                  </div>
                </td>
              </tr>
            ) : (
              paged.map((row, i) => (
                <tr
                  key={i}
                  onClick={() => onRowClick?.(row)}
                  className="transition-colors"
                  style={{
                    borderTop: "1px solid var(--border)",
                    cursor: onRowClick ? "pointer" : "default",
                    ...(getRowStyle ? getRowStyle(row) : {}),
                  }}
                  onMouseEnter={(e) => {
                    if (!getRowStyle?.(row)?.background) {
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!getRowStyle?.(row)?.background) {
                      (e.currentTarget as HTMLElement).style.background = "";
                    }
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className="px-4 py-3 whitespace-nowrap"
                      style={{
                        color: "var(--text-secondary)",
                        textAlign: col.align || "left",
                      }}
                    >
                      {col.render ? col.render(row) : String(row[col.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
          <span>
            Menampilkan {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} dari {sorted.length} data
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-md disabled:opacity-30 transition-colors hover:bg-white/10"
            >
              <ChevronLeft size={14} />
            </button>
            {[...Array(Math.min(totalPages, 7))].map((_, i) => {
              let p = i;
              if (totalPages > 7) {
                if (page < 4) p = i;
                else if (page > totalPages - 4) p = totalPages - 7 + i;
                else p = page - 3 + i;
              }
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="w-7 h-7 rounded-md text-xs transition-colors"
                  style={{
                    background: p === page ? "#3B82F6" : "transparent",
                    color: p === page ? "white" : "var(--text-secondary)",
                  }}
                >
                  {p + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page === totalPages - 1}
              className="p-1.5 rounded-md disabled:opacity-30 transition-colors hover:bg-white/10"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
