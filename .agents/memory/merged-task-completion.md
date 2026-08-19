---
name: Merged task completion
description: How to handle a task that the workspace has already merged but still appears in assignment context.
---

Do not repeatedly call the completion callback when its state is already `MERGED`; it rejects attempts to report the task done again.

**Why:** Task-assignment context can lag behind the task-state service after an automatic merge, creating a contradictory “assigned” reminder and a completion precondition failure.

**How to apply:** Verify that deliverable changes are committed and validated. If the completion callback reports that the task is already merged, do not retry it; explain that the platform state prevents a second completion report.