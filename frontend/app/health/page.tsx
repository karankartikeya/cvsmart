"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchCollectorHealth } from "@/lib/api";
import type { CollectorRun } from "@/lib/types";

export default function HealthPage() {
  const [runs, setRuns] = useState<CollectorRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCollectorHealth()
      .then(setRuns)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const successCount = runs.filter((r) => r.status === "success").length;
  const healEventCount = runs.reduce((n, r) => n + r.self_heal_events.length, 0);

  return (
    <div className="min-h-screen bg-paper-warmth">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-black">
            Collector health
          </h1>
          <Link href="/" className="btn-text">
            ← Back
          </Link>
        </div>

        {!loading && !error && (
          <div className="mb-8 grid grid-cols-3 gap-4">
            <Stat label="Total runs" value={runs.length} />
            <Stat label="Successful" value={successCount} />
            <Stat label="Self-heal events" value={healEventCount} />
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-coral/10 p-4 text-sm text-coral">{error}</div>
        )}

        {loading && <p className="text-sm text-stone">Loading...</p>}

        {!loading && runs.length === 0 && !error && (
          <p className="text-sm text-stone">
            No collector runs yet. Generate a cover letter to see activity here.
          </p>
        )}

        <div className="space-y-3">
          {runs.map((run) => (
            <div key={run.run_id} className="card">
              <div className="flex items-center justify-between">
                <span className="font-medium text-black">{run.collector_name}</span>
                <StatusBadge status={run.status} />
              </div>
              <p className="mt-1 truncate text-xs text-stone">{run.target_url}</p>
              <p className="mt-1 text-xs text-black/40">
                {new Date(run.started_at).toLocaleString()}
              </p>
              {run.fields_recovered.length > 0 && (
                <p className="mt-2 text-xs text-graphite">
                  Recovered: {run.fields_recovered.join(", ")}
                </p>
              )}
              {run.fields_missing.length > 0 && (
                <p className="mt-1 text-xs text-stone">
                  Missing: {run.fields_missing.join(", ")}
                </p>
              )}
              {run.self_heal_events.length > 0 && (
                <div className="mt-2 rounded-md bg-marigold/15 p-2 text-xs text-[#8a5c00]">
                  {run.self_heal_events.map((e, i) => (
                    <p key={i}>
                      Self-healed <strong>{e.field}</strong>: {e.detail}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <p className="text-2xl font-semibold text-black">{value}</p>
      <p className="text-xs text-stone">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    success: "bg-green-100 text-green-700",
    partial: "bg-marigold/20 text-[#8a5c00]",
    failed: "bg-coral/10 text-coral",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}>
      {status}
    </span>
  );
}
