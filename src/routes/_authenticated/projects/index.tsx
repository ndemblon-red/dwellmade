import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { createProject, deleteProject, listProjects } from "@/lib/projects-api";

export const Route = createFileRoute("/_authenticated/projects/")({
  component: ProjectsDashboard,
});

function ProjectsDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  const create = useMutation({
    mutationFn: () => createProject("Untitled project"),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: "/projects/$projectId", params: { projectId: p.id } });
    },
  });

  const del = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans">
      <AppHeader />
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-end justify-between border-b border-zinc-950/5 pb-6 mb-8">
          <div>
            <h1 className="font-serif text-4xl">
              Your <span className="italic">projects</span>
            </h1>
            <p className="text-sm text-muted-ink mt-1">
              Each project holds one or more rooms and a shared master palette.
            </p>
          </div>
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="bg-ink text-paper px-5 py-2.5 rounded-md text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            + New project
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-ink italic">Loading…</p>
        ) : !projects || projects.length === 0 ? (
          <div className="bg-paper ring-1 ring-border-card rounded-xl p-12 text-center">
            <p className="font-serif text-2xl italic mb-2">No projects yet.</p>
            <p className="text-sm text-muted-ink mb-6">
              Start a new one to begin redesigning a room.
            </p>
            <button
              onClick={() => create.mutate()}
              className="bg-ink text-paper px-5 py-2.5 rounded-md text-sm font-medium hover:bg-accent"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div
                key={p.id}
                className="p-5 hover:ring-ink/30 transition-shadow group"
                style={{
                  backgroundColor: "#FCE8EF",
                  border: "1px solid rgba(26, 26, 46, 0.08)",
                  borderRadius: 4,
                }}
              >
                <Link
                  to="/projects/$projectId"
                  params={{ projectId: p.id }}
                  className="block"
                >
                  <h3 className="font-serif text-2xl mb-2">{p.name}</h3>
                  <div className="flex gap-1 mb-3 h-3">
                    {(p.master_palette ?? []).slice(0, 8).map((c, i) => (
                      <span
                        key={i}
                        className="flex-1 rounded-sm ring-1 ring-black/10"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    {(!p.master_palette || p.master_palette.length === 0) && (
                      <span className="text-[10px] uppercase tracking-widest text-muted-ink">
                        no master palette
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-ink">
                    Updated {new Date(p.updated_at).toLocaleDateString()}
                  </p>
                </Link>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${p.name}"? This removes all its rooms.`))
                      del.mutate(p.id);
                  }}
                  className="mt-3 text-[10px] uppercase tracking-widest underline underline-offset-4 text-muted-ink hover:text-destructive opacity-0 group-hover:opacity-100"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
