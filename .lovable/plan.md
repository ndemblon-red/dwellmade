# Day 1 launch audit: build, types, security, and database

## Goal

Run a reproducible technical launch gate, capture every result, and separate launch blockers from lower-priority cleanup. This audit is read-only until a failure is confirmed; any fixes will be limited to confirmed issues and re-tested afterward.

## Checks

1. **Production build**
   - Run `bun run build`, not the development build.
   - Confirm the client and server bundles complete and at least one page is prerendered.
   - Treat any build, SSR, route-generation, or prerender error as a launch blocker.

2. **Strict TypeScript check**
   - Run `tsgo --noEmit` against the existing strict `tsconfig.json`.
   - The project currently has no dedicated `typecheck` package script, so use the TypeScript checker directly for this audit.
   - Report errors by file and root cause rather than suppressing them.

3. **Code-quality check**
   - Run the existing `bun run lint` command.
   - Separate correctness errors from formatting-only findings; correctness errors block launch, while formatting cleanup does not unless it obscures a real defect.

4. **Dependency and security scan**
   - Run the dependency scanner against the current `bun.lock` and review the persisted Security findings.
   - Confirm there are no unresolved critical or high-severity dependency vulnerabilities.
   - Do not ignore findings. Upgrade only affected packages, regenerate the lockfile, re-scan, and mark a finding fixed only after scanner verification.

5. **Database lint**
   - Run the managed database linter and review each warning in the context of dwellmade’s private, user-owned project data.
   - Prioritise exposed tables, missing row-level access controls, unsafe policies/functions, and sensitive-column exposure.
   - Do not change the schema during the audit; propose a focused migration for any confirmed issue.

6. **Slow-query review**
   - Pull the 10 queries with the highest cumulative execution time.
   - Classify each by call count, average latency, worst-case latency, and whether it belongs to app code or backend infrastructure.
   - For a confirmed app-owned offender, inspect its execution plan before proposing an index or query rewrite. Do not optimize low-volume noise without evidence.

## Deliverable

Provide one launch report with:

| Gate | Result | Launch impact | Follow-up |
|---|---|---|---|
| Production build | Pass/fail | Blocker or clear | Exact failing stage |
| Type check | Pass/fail | Blocker or clear | Error count and affected files |
| Lint | Pass/fail | Blocker/advisory | Correctness vs formatting |
| Dependencies/security | Pass/fail | Blocker or clear | Severity and affected packages |
| Database lint | Pass/fail | Blocker/advisory | Confirmed risks only |
| Slow queries | Pass/advisory | Performance risk | Evidence-based candidates |

End with a short, ordered remediation list: **must fix before launch**, **fix this week**, and **monitor after launch**. Re-run each failed gate after its fix and only mark it passed when the relevant tool confirms it.