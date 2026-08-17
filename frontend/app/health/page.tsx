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
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Collector health
          </h1>
          <Link
            href="/"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
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
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {loading && <p className="text-sm text-zinc-500">Loading...</p>}

        {!loading && runs.length === 0 && !error && (
          <p className="text-sm text-zinc-500">
            No collector runs yet. Generate a cover letter to see activity here.
          </p>
        )}

        <div className="space-y-3">
          {runs.map((run) => (
            <div
              key={run.run_id}
              className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {run.collector_name}
                </span>
                <StatusBadge status={run.status} />
              </div>
              <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-500">
                {run.target_url}
              </p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">
                {new Date(run.started_at).toLocaleString()}
              </p>
              {run.fields_recovered.length > 0 && (
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                  Recovered: {run.fields_recovered.join(", ")}
                </p>
              )}
              {run.fields_missing.length > 0 && (
                <p className="mt-1 text-xs text-zinc-500">
                  Missing: {run.fields_missing.join(", ")}
                </p>
              )}
              {run.self_heal_events.length > 0 && (
                <div className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
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
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{value}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-500">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    success: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
    partial: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    failed: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}>
      {status}
    </span>
  );
}
