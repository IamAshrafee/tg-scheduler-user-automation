---
description: Resume development by loading full project context and identifying the next phase.
---

1. **Read Core Documentation**:
   - Read `project_overview.md` to understand the high-level vision (Telegram Automation Platform).
   - Read `roadmap.md` to see the full phased plan.
   - Read `task.md` (or check for `task.md` artifact) to see current progress checklist.

2. **Review Progress**:
   - List the directory to see any `XX_done_overview.md` files aimed at documenting past phases.
   - Read the latest `XX_done_overview.md` file (e.g., `01_done_overview.md`) to understand what was just finished.

3. **Codebase Scan**:
   - Briefly list the `backend/` and `frontend/` directories to verify structure matches the documentation.
   - Check `backend/app/models` and `backend/app/routes` to see implemented features.

4. **Identify Next Step**:
   - Based on `task.md` and `roadmap.md`, identify the next incomplete Phase or Task.
   - **Action**: Use `task_boundary` to set the new task (e.g., "Starting Phase 2: Auth Mechanism").
   - **Notify User**: "Ready to resume. Context loaded. Previous phase was X. Moving to Phase Y: [Name]."
