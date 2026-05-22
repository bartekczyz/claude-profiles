/**
 * Recent-activity timeline. Real events arrive with the activity-log
 * phase; for now this renders the empty state so the detail pane's
 * vertical rhythm is set correctly.
 */
export function ProfileDetailRecentActivity() {
  return (
    <section className="mb-6">
      <div className="mb-2.5 font-mono text-eyebrow font-medium uppercase tracking-[0.1em] text-muted-strong">
        Recent activity
      </div>
      <p className="font-mono text-mono text-muted-strong">No activity yet.</p>
    </section>
  )
}
