import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { z } from "zod";
import { AppHeader } from "@/components/AppHeader";
import {
  createRoom,
  deleteRoom,
  getProject,
  listRooms,
  updateProject,
  updateRoom,
  type Room,
} from "@/lib/projects-api";
import { useRoomSync } from "@/lib/useRoomSync";
import { useStore } from "@/lib/store";
import { Workspace } from "@/components/Workspace";

const searchSchema = z.object({ room: z.string().optional() });

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  validateSearch: searchSchema,
  component: ProjectPage,
});

function ProjectPage() {
  const { projectId } = Route.useParams();
  const { room: activeRoomId } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const projectQ = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
  });
  const roomsQ = useQuery({
    queryKey: ["rooms", projectId],
    queryFn: () => listRooms(projectId),
  });

  const setActiveRoom = (id: string | undefined) =>
    navigate({
      to: "/projects/$projectId",
      params: { projectId },
      search: { room: id },
      replace: true,
    });

  const createRoomMut = useMutation({
    mutationFn: () => createRoom(projectId, `Room ${(roomsQ.data?.length ?? 0) + 1}`),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["rooms", projectId] });
      setActiveRoom(r.id);
    },
  });

  // Auto-select first room or open the room from URL
  useEffect(() => {
    if (!roomsQ.data) return;
    if (activeRoomId && roomsQ.data.find((r) => r.id === activeRoomId)) return;
    if (roomsQ.data.length > 0) setActiveRoom(roomsQ.data[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomsQ.data, activeRoomId]);

  const activeRoom = roomsQ.data?.find((r) => r.id === activeRoomId);

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans">
      <AppHeader />
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-3">
            <Link
              to="/projects"
              className="inline-flex min-h-11 items-center text-[10px] uppercase tracking-widest text-muted-ink hover:text-ink"
            >
              ← Projects
            </Link>
            {projectQ.data ? <ProjectNameEditor project={projectQ.data} /> : null}
          </div>
        </div>

        {projectQ.data ? (
          <MasterPaletteEditor
            value={projectQ.data.master_palette ?? []}
            onChange={async (palette) => {
              await updateProject(projectId, { master_palette: palette });
              qc.invalidateQueries({ queryKey: ["project", projectId] });
              qc.invalidateQueries({ queryKey: ["projects"] });
            }}
          />
        ) : null}

        <div className="mt-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {(roomsQ.data ?? []).map((r) => (
              <RoomPill
                key={r.id}
                room={r}
                active={r.id === activeRoomId}
                onSelect={() => setActiveRoom(r.id)}
                onRename={async (name) => {
                  await updateRoom(r.id, { name });
                  qc.invalidateQueries({ queryKey: ["rooms", projectId] });
                }}
                onDelete={async () => {
                  if (!confirm(`Delete "${r.name}"?`)) return;
                  await deleteRoom(r.id);
                  qc.invalidateQueries({ queryKey: ["rooms", projectId] });
                  if (r.id === activeRoomId) setActiveRoom(undefined);
                }}
              />
            ))}
            <button
              onClick={() => createRoomMut.mutate()}
              disabled={createRoomMut.isPending}
              className="min-h-11 shrink-0 px-3 py-1.5 rounded-full text-xs border border-[rgba(26,26,46,0.25)] text-muted-ink hover:text-ink hover:border-ink/50 transition-colors whitespace-nowrap"
            >
              + New room
            </button>
          </div>
        </div>

        <div className="mt-6">
          {activeRoom && projectQ.data ? (
            <SyncedWorkspace room={activeRoom} masterPalette={projectQ.data.master_palette ?? []} />
          ) : (
            <div className="bg-paper ring-1 ring-border-card rounded-xl p-6 sm:p-12 text-center">
              <p className="font-serif text-2xl italic mb-2">Add your first room.</p>
              <button
                onClick={() => createRoomMut.mutate()}
                className="mt-3 min-h-11 bg-ink text-paper px-5 py-2.5 rounded-md text-sm font-medium hover:bg-accent"
              >
                + New room
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SyncedWorkspace({ room, masterPalette }: { room: Room; masterPalette: string[] }) {
  useRoomSync(room, masterPalette);
  const hydrated = useStore((s) => s.currentRoomId === room.id);
  if (!hydrated) {
    return (
      <div className="bg-paper ring-1 ring-border-card rounded-xl p-12 text-center">
        <p className="text-sm text-muted-ink italic">Loading room…</p>
      </div>
    );
  }
  return <Workspace />;
}

function ProjectNameEditor({ project }: { project: { id: string; name: string } }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.name);
  useEffect(() => setDraft(project.name), [project.name]);

  const save = async () => {
    if (draft && draft !== project.name) {
      await updateProject(project.id, { name: draft });
      qc.invalidateQueries({ queryKey: ["project", project.id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    }
    setEditing(false);
  };

  return editing ? (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") setEditing(false);
      }}
      className="min-w-0 w-full font-serif text-3xl bg-transparent border-b border-ink focus:outline-none"
    />
  ) : (
    <h1
      className="min-w-0 break-words font-serif text-3xl cursor-text"
      onClick={() => setEditing(true)}
      title="Click to rename"
    >
      {project.name}
    </h1>
  );
}

function MasterPaletteEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (palette: string[]) => void;
}) {
  const [draft, setDraft] = useState("#");
  const add = () => {
    if (!/^#[0-9a-fA-F]{6}$/.test(draft)) return;
    if (value.includes(draft.toLowerCase())) return;
    onChange([...value, draft.toLowerCase()]);
    setDraft("#");
  };
  const remove = (hex: string) => onChange(value.filter((c) => c !== hex));

  return (
    <div className="bg-paper ring-1 ring-border-card rounded-xl p-4 sm:p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 mb-3">
        <span className="text-[10px] uppercase tracking-widest text-muted-ink">Master palette</span>
        <span className="text-right text-[10px] text-muted-ink italic">
          Pre-fills each new room's brief.
        </span>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {value.map((c) => (
          <button
            key={c}
            onClick={() => remove(c)}
            className="size-11 rounded-md ring-1 ring-black/15 hover:ring-destructive transition-shadow relative group"
            style={{ backgroundColor: c }}
            title={`${c} — click to remove`}
          >
            <span className="absolute inset-0 grid place-items-center bg-paper/0 group-hover:bg-paper/70 text-destructive opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
              ×
            </span>
          </button>
        ))}
        <div className="flex items-center gap-2 ml-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="#hex"
            className="bg-canvas/70 ring-1 ring-black/5 rounded-md px-2 py-1 text-xs w-20 font-mono"
          />
          <button
            onClick={add}
            className="inline-flex min-h-11 items-center text-[10px] uppercase tracking-widest underline underline-offset-4 text-muted-ink hover:text-ink"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function RoomPill({
  room,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  room: Room;
  active: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draft, setDraft] = useState(room.name);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => setDraft(room.name), [room.name]);

  // Position the fixed menu below the trigger whenever it opens.
  useEffect(() => {
    if (menuOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.left });
    } else {
      setMenuPos(null);
    }
  }, [menuOpen]);

  // Close menu on outside click or Esc.
  useEffect(() => {
    if (!menuOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const base =
    "min-h-11 shrink-0 inline-flex items-center gap-1 rounded-full pl-3 pr-1 py-1 text-xs transition-colors whitespace-nowrap";
  const activeStyle = "bg-[#1A1A2E] text-[#F5F0E8]";
  const inactiveStyle =
    "border border-[rgba(26,26,46,0.25)] text-muted-ink hover:text-ink hover:border-ink/40";

  return (
    <div className={`relative group ${base} ${active ? activeStyle : inactiveStyle}`}>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft && draft !== room.name) onRename(draft);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setDraft(room.name);
              setEditing(false);
            }
          }}
          className="bg-transparent border-b border-current focus:outline-none text-xs min-w-0 w-28"
        />
      ) : (
        <button onClick={onSelect} className="self-stretch text-xs">
          {room.name}
        </button>
      )}
      <button
        ref={triggerRef}
        onClick={() => setMenuOpen((v) => !v)}
        className={`ml-1 size-9 grid place-items-center rounded-full text-[11px] leading-none sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity ${
          active ? "hover:bg-white/10" : "hover:bg-black/5"
        }`}
        aria-label="Room actions"
        title="More"
      >
        ···
      </button>
      {menuOpen && menuPos
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed bg-paper ring-1 ring-black/10 rounded-md shadow-md z-50 py-1 min-w-[140px]"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              <button
                onClick={() => {
                  setEditing(true);
                  setMenuOpen(false);
                }}
                className="block min-h-11 w-full px-3 py-1.5 text-left text-xs text-ink hover:bg-black/5"
              >
                Rename
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                className="block min-h-11 w-full px-3 py-1.5 text-left text-xs text-destructive hover:bg-black/5"
              >
                Delete
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
