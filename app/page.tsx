"use client"

import * as React from "react"
import GlassFolder, { type FolderArt, type FolderFile } from "@/components/ui/glass-folder-cards"
import KineticGrid from "@/components/ui/kinetic-grid"

type Movie = { id: number; title: string; posterPath: string | null; rating: number }
type Genre = { id: number; name: string }

// null while loading; keyed by url so a stale response never shows under a new one
function useJson<T>(url: string): T | null | "error" {
  const [state, setState] = React.useState<{ url: string; data: T | "error" } | null>(null)
  React.useEffect(() => {
    let live = true
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: T) => live && setState({ url, data }))
      .catch(() => live && setState({ url, data: "error" }))
    return () => {
      live = false
    }
  }, [url])
  return state?.url === url ? state.data : null
}

const GAP = 40
const onResize = (cb: () => void) => {
  window.addEventListener("resize", cb)
  return () => window.removeEventListener("resize", cb)
}
// clientWidth excludes the scrollbar; the server guesses a desktop width
const useViewportWidth = () =>
  React.useSyncExternalStore(onResize, () => document.documentElement.clientWidth, () => 1280)

// as many columns as fit at 280px (1, 2 or 4 so the four folders stay in even rows),
// folders sized to fill the row inside a 16px gutter each side
function layoutFor(vw: number) {
  const fits = Math.floor((vw - 32 + GAP) / (280 + GAP))
  const cols = fits >= 4 ? 4 : fits >= 2 ? 2 : 1
  const fill = Math.floor((vw - 32 - GAP * (cols - 1)) / cols)
  // snapped to 20px so dragging the window doesn't queue an art repaint per pixel
  const width = Math.min(560, fill >= 340 ? Math.floor(fill / 20) * 20 : fill)
  return { cols, width }
}

// the folder shows its last 4 files frontmost, so reverse to put #1 nearest the glass
function toFiles(movies: Movie[]): FolderFile[] {
  return movies
    .slice(0, 4)
    .reverse()
    .map((m, i, top) => ({
      name: `${top.length - i}. ${m.title}`,
      meta: `★ ${m.rating.toFixed(1)}`,
      image: m.posterPath ? `https://image.tmdb.org/t/p/w500${m.posterPath}` : undefined,
      href: `https://www.themoviedb.org/movie/${m.id}`,
    }))
}

function RankFolder({
  label,
  url,
  art,
  tone,
  delay,
  width,
}: {
  label: string
  url: string
  art: FolderArt
  tone: "light" | "dark"
  delay: number
  width: number
}) {
  const page = useJson<{ results: Movie[] }>(url)
  const files = page && page !== "error" ? toFiles(page.results) : []
  const meta = page === null ? "불러오는 중…" : page === "error" ? "불러오지 못했어요" : "TOP " + files.length
  // files are read once by GlassFolder, so remount when the data arrives
  return (
    <GlassFolder
      key={url + (page === null ? ":loading" : ":ready")}
      label={label}
      meta={meta}
      art={art}
      tone={tone}
      files={files}
      action="none"
      width={width}
      appearDelay={delay}
    />
  )
}

export default function Home() {
  const genres = useJson<Genre[]>("/api/genres")
  const [genre, setGenre] = React.useState(28)
  const genreList = genres && genres !== "error" ? genres : []
  const genreName = genreList.find((g) => g.id === genre)?.name ?? "장르"
  const { cols, width } = layoutFor(useViewportWidth())

  return (
    // the grid is dark, so switch the shadcn tokens to their dark values under it
    <KineticGrid className="dark">
    <main
      className="relative flex w-full flex-1 flex-col items-center justify-center overflow-hidden px-4 py-16 text-foreground"
      style={{ minHeight: "100svh" }}
    >
      <h1 className="relative mb-4 text-3xl font-semibold tracking-tight">MovieBox</h1>
      {/* open files rise in proportion to folder size, so the clearance scales with it */}
      <label
        className="relative flex items-center gap-2 text-sm text-muted-foreground"
        style={{ marginBottom: Math.round(width * 0.2) }}
      >
        추천 장르
        <select
          className="rounded-md border bg-background px-2 py-1 text-foreground"
          value={genre}
          onChange={(e) => setGenre(Number(e.target.value))}
        >
          {genreList.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>

      <div
        className="relative grid items-end justify-items-center"
        style={{ gridTemplateColumns: `repeat(${cols}, ${width}px)`, gap: GAP }}
      >
        <RankFolder label="오늘의 트렌딩" url="/api/movies/trending?period=day" art="aurora" tone="light" delay={0} width={width} />
        <RankFolder label="이번 주 트렌딩" url="/api/movies/trending?period=week" art="dusk" tone="dark" delay={140} width={width} />
        <RankFolder label="평점 TOP" url="/api/movies/top-rated?page=1" art="ember" tone="dark" delay={280} width={width} />
        <RankFolder
          label={genreName + " 추천"}
          url={`/api/movies/recommend?genre=${genre}&page=1`}
          art="verdant"
          tone="light"
          delay={420}
          width={width}
        />
      </div>

      <p className="relative mt-14 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
        Hover to lean · Click to open · 카드를 누르면 TMDB 상세
      </p>
      {/* required by TMDB API terms */}
      <p className="relative mt-4 text-xs text-muted-foreground">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
    </main>
    </KineticGrid>
  )
}
