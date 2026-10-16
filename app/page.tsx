"use client"

import * as React from "react"
import GlassFolder, { type FolderArt, type FolderFile } from "@/components/ui/glass-folder-cards"

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

// folders are a fixed 340px; shrink them to fit phones narrower than that plus a 16px gutter each side
const onResize = (cb: () => void) => {
  window.addEventListener("resize", cb)
  return () => window.removeEventListener("resize", cb)
}
const useFolderWidth = () =>
  React.useSyncExternalStore(onResize, () => Math.min(340, window.innerWidth - 32), () => 340)

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
}: {
  label: string
  url: string
  art: FolderArt
  tone: "light" | "dark"
  delay: number
}) {
  const page = useJson<{ results: Movie[] }>(url)
  const width = useFolderWidth()
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

  return (
    <main
      className="relative flex w-full flex-1 flex-col items-center overflow-hidden bg-background px-4 py-16"
      style={{ minHeight: "100svh" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 text-foreground opacity-[0.13]"
        style={{
          backgroundImage: "radial-gradient(currentColor 1.1px, transparent 1.4px)",
          backgroundSize: "22px 22px",
        }}
      />
      <h1 className="relative mb-12 text-3xl font-semibold tracking-tight">MovieBox</h1>

      <div className="relative grid max-w-[1180px] grid-cols-1 items-end justify-items-center gap-x-14 gap-y-10 md:grid-cols-2">
        <RankFolder label="오늘의 트렌딩" url="/api/movies/trending?period=day" art="aurora" tone="light" delay={0} />
        <RankFolder label="이번 주 트렌딩" url="/api/movies/trending?period=week" art="dusk" tone="dark" delay={140} />
        <RankFolder label="평점 TOP" url="/api/movies/top-rated?page=1" art="ember" tone="dark" delay={280} />
        <div className="flex flex-col items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            장르
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
          <RankFolder
            label={genreName + " 추천"}
            url={`/api/movies/recommend?genre=${genre}&page=1`}
            art="verdant"
            tone="light"
            delay={420}
          />
        </div>
      </div>

      <p className="relative mt-14 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
        Hover to lean · Click to open · 카드를 누르면 TMDB 상세
      </p>
      {/* required by TMDB API terms */}
      <p className="relative mt-4 text-xs text-muted-foreground">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
    </main>
  )
}
