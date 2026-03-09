# Project Overview — Telegram Automation Platform

---

This project is a web-based **Telegram Automation Platform** powered by a Python backend that controls Telegram user accounts. The system allows users to automate any repetitive Telegram action — sending stickers, messages, photos, videos, documents, or forwarding messages — based on time, date, or custom rules.

## Origin Story

The idea started from a specific pain point: employees must send specific attendance stickers at fixed times (duty start, break, break end, duty out) in a Telegram group every day. Since Telegram Premium is not available, they cannot use Telegram's built-in scheduling and must do this manually — a repetitive, time-consuming process that's easy to forget.

But instead of building a narrow tool that only solves attendance, this project takes the **platform approach**: attendance automation becomes just one **template** among many. The system is designed to support any Telegram automation use case.

## Product Identity

This is not an "attendance tool". It is a:

- **Telegram Automation System**
- **Telegram Scheduler Platform**
- **Telegram Workflow Engine**

Where "Office Attendance" is simply a ready-made template — one of many.

The system will be hosted on a VPS and controlled through a browser interface.

---

## Architecture

### Technologies

**Backend**

- Python
- Telegram Userbot (Telethon or Pyrogram)
- REST API system (FastAPI)
- Background scheduler (APScheduler + Queue/Worker system)

**Frontend**

- React (Vite)
- shadcn
- react-hot-toast
- react-hook-form
- zod
- tailwindcss
- Mobile first responsive design

**Database**

- MongoDB Atlas

**Hosting**

- VPS server (24/7 running)

---

## Core Purpose

The main goal is to create a stable, generalized automation platform where:

- Each user logs into their Telegram account once.
- They create "Tasks" — automated actions that run on a schedule.
- Each task specifies: which account, which group/channel, what action, what content, what time, what repeat rule, and what skip days.
- The system runs automatically based on the configured rules.
- No daily manual work needed.

**Vision: "Set once, forget forever."**

---

## Wide Use Cases

### 1. Office Attendance (Original Use Case)
- Duty in sticker at 9 AM
- Break sticker at 1 PM
- Back from break sticker at 2 PM
- Duty out sticker at 6 PM
- Skip on weekly holidays and leave days

This becomes a **ready-made template** that users can select and customize.

### 2. Group Activity Automation
- Daily good morning message
- Daily report / status update
- Reminder messages
- Recurring announcements

### 3. Content Posting Automation (Channel Owners)
- Send posts at fixed times
- Daily content scheduling
- Weekly campaign messages
- Scheduled media posts

### 4. Business Notification Automation
- Daily announcements
- Offer reminders
- Event reminders
- Customer notifications

### 5. Community Management (Admins)
- Welcome message reminders
- Rule reminder posts
- Weekly notices
- Monthly updates

### 6. Personal Productivity
- Study reminders
- Work reminders
- Habit tracking messages
- Daily self-check posts

---

## Key Features

### 1. Multi Telegram Account Support

Each user can connect one or more Telegram accounts.

Each account will have its own tasks and settings.

### 2. Generalized Task System

Users create "Tasks" instead of rigid attendance slots.

Each task contains:

- Telegram account (which account to use)
- Target group/channel (where to send)
- Action type (what to do)
- Content (the actual sticker/text/media)
- Time (when to send)
- Repeat rule (how often)
- Skip days (when to pause)

### 3. Action Types (Flexible)

The system supports multiple action types:

1. **Send Sticker** — select from user's sticker packs
2. **Send Text Message** — plain text or formatted
3. **Send Photo** — image with optional caption
4. **Send Video** — video with optional caption
5. **Send Document** — file attachment
6. **Forward Message** — forward from another chat/channel

### 4. Scheduler Types (Flexible Repeat Rules)

Users can choose how tasks repeat:

- **Daily** — every day at set time
- **Weekly** — specific days of the week (e.g., Mon/Wed/Fri)
- **Monthly** — specific day of month (e.g., 1st, 15th)
- **Custom days** — pick exact days
- **Specific dates only** — one-time or specific date list (e.g., only 15 Feb, 20 Feb, 25 Feb)

### 5. Smart Skip System (Off Days)

Users can define:

- Weekly off days (e.g., Friday, Saturday)
- Festival / holiday dates
- Leave days
- Temporary pause (pause/resume schedule)

On skip days, the task does not execute.

**Monthly-Only Mode:**
Tasks can optionally be set to "Only This Month" — the task will only run during the current month and auto-deactivate when the month ends. This is useful for day-offs that change every month (e.g., rotating shift schedules). When enabled, users can pick specific days of the current month to skip. Re-enabling the task in a new month automatically refreshes the active period and clears old skip days.

### 6. Template System (Advanced Batch Engine)

The system moves beyond simple "copy-paste" templates to a sophisticated **Batch Instantiation Engine**.

- **Structural Blueprints**: Templates define the *structure* of a workflow (e.g., "Send 4 messages at specific times") without imposing specific content.
- **Batch Identity**: When a template is used, all created tasks are linked by a unique `batch_id`. This allows the system to understand that these 4 tasks "belong together" as a single logic unit (e.g., "Daily Attendance Routine").
- **Deep Customization (The "White-Glove" Experience)**: 
  - Unlike standard templates that just copy data, our engine pauses before creation to let the user customize *every single aspect*.
  - Users can override the Schedule (e.g., change "Daily" to "Mon-Wed-Fri"), Time, Content, and even Anti-Ban settings for *each individual task* in the batch.
- **Smart Defaults**: The system pre-fills intelligent defaults (e.g., "09:00 AM" for Duty In) but allows full override.

This turns a rigid "template" into a flexible "starting point" for powerful automation.

### 7. Background Automation Engine

The server will:

- Run continuously (24/7)
- Execute tasks at correct times
- Skip on off days
- Retry on failure (exponential backoff)
- Prevent duplicate sends
- Log success/failure for every execution
- Auto-reconnect disconnected Telegram sessions

---

## User Flow

### Registration

User creates an account using:

- Email
- Password

Basic email verification can be added for safety.

---

### Login

User logs in using:

- Email
- Password

After login, user goes directly to the **Dashboard**.

---

### Dashboard (New — Overview Page)

The main landing page after login shows:

- Total connected Telegram accounts
- Active tasks/schedules count
- Upcoming next actions (next 5)
- Recent activity log (last 10 actions)
- Quick action buttons (Create Task, Add Account)

---

### Main Menu (User Side)

- **Dashboard** — Overview
- **Telegram Accounts** — Manage connected accounts
- **Tasks / Scheduler** — Create, view, edit automated tasks
- **Templates** — Browse and use ready-made templates
- **Settings** — Profile, default timezone, global off days, activity logs

> **Design Note**: The sidebar is intentionally lean (5 items) to support a mobile bottom navigation bar. Activity Logs and Off Days are accessible as tabs within the Settings page.

**Mobile Navigation:**
- A fixed **bottom navigation bar** (Home, Accounts, Tasks, Templates, Settings) appears on screens below `md` breakpoint.
- The desktop sidebar is hidden on mobile — the bottom bar replaces it entirely.
- **Admin users** see a hamburger icon (☰) in the mobile header that opens a **slide-out drawer** with admin-only pages (Admin Dashboard, Users, TG Accounts, All Tasks, System).
- A **Logout button** is available in Settings → General tab for all users on mobile.

---

### Telegram Accounts Page

This page shows:

- All connected Telegram accounts
- Button: "Add Telegram Account"

Each account card shows:

- Phone number
- Status (Active / Disconnected / Locked)
- Last activity
- Number of active tasks

Clicking an account opens its details.

---

### Add Telegram Account Flow

User clicks "Add Telegram Account".

Steps:

1. Enter phone number
2. Receive Telegram login code
3. Enter code
4. (If 2FA enabled) Enter 2FA password
5. Account connected

After success:

- Redirect to accounts page
- New account appears in list

---

### Task / Scheduler Page (New — Generalized Structure)

Shows all created tasks in a list/card view.

Each task card shows:

- Task name
- Action type icon (sticker, text, photo, etc.)
- Target group/channel name
- Next execution time
- Status (active / paused / failed)

**"Create New Task"** button opens a step-by-step flow:
1. Select Telegram account
2. Select target group/channel
3. Select action type (sticker / text / photo / video / document / forward)
4. Choose content (pick sticker, type text, upload media, etc.)
5. Set time
6. Set repeat rule (daily / weekly / monthly / custom / specific dates)
7. Add skip days (optional)
8. Name the task
9. Save

Users can also:

- Edit existing tasks
- **Quick Edit** any section from the task detail page (see below)
- Enable/disable individual tasks
- Delete tasks
- View task execution history

### Task Detail Page Features

**Quick Edit:**
Each section of the task detail page (Configuration, Target, Content, Schedule, Skip Days) has a pencil icon button. Clicking it opens the **Task Editor Dialog** directly on the relevant tab — so users can change one thing without going through the full 7-step wizard. Changes save via the API and refresh the page.

The editor dialog has 5 tabs:
- **Details** — Task name and description
- **Target** — Group/channel picker (loads live list from the Telegram account)
- **Action** — Action type picker + content editor combined in one view
- **Schedule** — Schedule type, time, timezone, repeat days, random delay
- **Safety** — Simulate typing, skip days (weekly + specific dates), Only This Month

**Content Preview:**
A dedicated card on the detail page shows exactly what the task will send:
- Sticker tasks: actual thumbnail loaded from Telegram API + emoji + pack name
- Text tasks: full message preview with parse mode badge
- Photo/Video/Document: file icon, path, caption preview
- Forward: source chat ID and message ID

---

### Templates Page (The "Use Template" Wizard)

Browse available templates with rich previews (icon, description, task count).
When a user selects "Use Template", they enter a **3-Step Advanced Wizard**:

#### Step 1: Account Selection
- Choose which connected Telegram account will execute this batch of tasks.
- If only one account exists, this step is auto-skipped for speed.

#### Step 2: Target Selection
- Choose the **Target Audience** (Group or Channel).
- The system lists all available dialogs from the selected account.

#### Step 3: Advanced Batch Customization
This is the core of the power-user experience. The user sees a list of all tasks in the template and can:

1.  **Review the Batch**: See exactly what will be created (e.g., "Duty In", "Break Start", "Break End", "Duty Out").
2.  **Edit Individual Tasks**: Click "Edit" on any task to open the full **Task Editor Dialog**.
    - **Schedule**: Change from "Daily" to "Monthly" (e.g., "1st of every month") or "Specific Dates".
    - **Time**: Adjust the default time (e.g., change 09:00 to 09:30).
    - **Content**: Upload a photo, select a sticker, or write a custom message.
    - **Options**: Enable "Simulate Typing" or add "Skip Specific Dates" (e.g., skip a holiday).
3.  **Toggle Tasks**: Uncheck any task to exclude it from the batch (e.g., "I don't need a Break End task").

#### Step 4: Batch Instantiation
- Clicking "Create Tasks" sends the entire configuration to the backend.
- The backend generates a unique `batch_id`.
- All tasks are created transactionally.
- The user is redirected to the Tasks List, where they can see their new batch.

---

### Activity Logs (Settings → Activity Log tab)

Shows history of all task executions:

- Task name
- Action type
- Time scheduled vs. time sent
- Status (sent / failed / skipped)
- Failure reason (if failed)

Filterable by status. Paginated.

---

### Off Days (Settings → Off Days tab)

Global off days pause **ALL tasks** across **ALL Telegram accounts** at once.  
Use this for vacations, national holidays, or any day you want every automation to stop.

Users can configure:

**Global Off Days** (apply to all tasks):
- Weekly holidays (e.g., Friday, Saturday)
- Specific dates (festivals, vacations)

**Per-Task Skip Days** (configured when creating/editing a task):
- Each task can have its own additional skip days

> Individual tasks can also have their own skip days — configured separately in the task creation wizard.

---

## Admin Dashboard

Admin has full control over system and users.

### User Management

Admin can:

- View all users
- Lock/unlock user accounts
- Delete users and all their data
- Set per-user Telegram account limits
- Set per-user task limits

Admin can see:

- Total Telegram accounts per user
- Total tasks per user
- Activity logs per user

---

### Telegram Account Control

Admin can:

- View all Telegram accounts across all users
- Lock a specific Telegram account
- Stop all tasks on an account
- Force disconnect a session
- Prevent sending

Useful if:

- Abuse detected
- Spam risk
- Server load issues
- Security concerns

---

### System Controls

Admin panel includes:

- Restart scheduler engine
- Clear old logs
- Backup database
- Restore backup
- View system health (uptime, memory, active clients, queue depth)
- View failed task reports

---

### Admin Safety Tools (For Scale)

- Rate limit sending per account
- Anti-spam detection (too many messages in short time)
- Auto-pause risky accounts
- Monitor and flag abuse patterns
- Force logout Telegram sessions

---

## User Experience Focus

The system must feel:

- Simple
- Fast
- Clear
- Error-free

Important design points:

- Clean dashboard
- Easy navigation
- Big buttons
- Clear status messages
- Step-by-step task creation wizard

Example statuses:

- "Next: Send duty in sticker at 11:00 AM"
- "Task paused (Off day)"
- "Telegram account disconnected"
- "3 tasks active, 1 paused"

---

## Safety & Security

This is very important because Telegram accounts are sensitive.

Security steps:

1. Store Telegram sessions safely and encrypted.
2. Never store raw passwords.
3. Use secure login tokens (JWT).
4. Limit API requests (rate limiting).
5. Detect spam-like behavior.
6. Auto stop if too many errors happen.
7. Anti-spam protection (detect too many messages in short time).
8. Auto-pause accounts at risk of Telegram ban.

---

## Timezone Handling

Timezone is a first-class concept in this platform:

- Each user sets a **default timezone** in their Settings (e.g., "Asia/Dhaka").
- When creating a task, the timezone is **inherited from user settings** by default.
- Users can **override the timezone per task** if needed (e.g., a task targeting a group in a different timezone).
- All schedule times (duty in at 9:00 AM, etc.) are interpreted in the task's timezone.
- The scheduler engine converts all times to UTC internally for accurate execution.
- **Frontend always converts UTC back to the task's timezone for display** using the shared `frontend/src/lib/time.js` utility.
- **All times are displayed in 12-hour format** (AM/PM) across the entire platform.
- Activity logs display times in the user's timezone.
- The dashboard's "Upcoming Actions" and "Next Execution" respect the task's timezone.
- Static schedule times (e.g., "daily at 09:00") are also converted to 12-hour format ("daily at 9:00 AM").

---

## Stability & Error Prevention

To make the system solid:

- Background worker should retry failed sends (exponential backoff).
- Maintain logs:
    - Sent successfully
    - Failed sends
    - Skipped (off day, paused, etc.)
    - Time mismatches
- Auto reconnect Telegram sessions if disconnected.
- Prevent duplicate sending.
- All timezone conversions must be correct (use `pytz` or `zoneinfo`).
- Queue system for concurrent task execution.
- Task recovery on server restart (no data loss).

---

## Scalability

System should be ready for growth:

- Multiple users
- Multiple Telegram accounts per user
- Many tasks running at once
- Hundreds of concurrent schedules

Use:

- Job queue (task queue system)
- Worker system (process tasks in parallel)
- Smart scheduling (batch same-time tasks)
- Failure recovery (auto-retry, circuit breaker)

---

## Future Possibilities

- Temporary pause button (per task or global)
- Subscription / SaaS model:
    - Free tier: 1 account, 5 tasks
    - Pro tier: 5 accounts, unlimited tasks
    - Business tier: Unlimited everything
- Webhook triggers (send on external event)
- Conditional logic (if X then send Y)
- Analytics dashboard (send success rates, activity trends)
- Mobile app wrapper

---

## Developer Extensibility (Adding New Templates)

The system is designed to be easily extensible by developers. New "Built-in Templates" can be added without writing migration scripts or complex DB operations.

### How it Works
1.  **Code-Based Definition**: Templates are defined as Python dictionaries in `backend/app/models/template.py` under `BUILT_IN_TEMPLATES`.
2.  **Auto-Seeding**: On server startup, the system checks if these templates exist in the database. If not, it creates them automatically.
3.  **Structural Integrity**: Developers define the *Task Configuration* (Action Type, Schedule Type, Default Time) but leave the *Content* blank.

### Example Template Structure
```python
{
    "name": "Weekend Vibes",
    "tasks": [
        { "name": "Saturday Morning", "action_type": "send_sticker", "schedule_type": "weekly", "default_time": "10:00" },
        { "name": "Sunday Evening", "action_type": "send_text", "schedule_type": "weekly", "default_time": "18:00" }
    ]
}
```

Refer to the comprehensive `template_creation_guide.md` in the project root for full documentation on adding new templates, supported action types, and limitations.

---

## Final Vision

This system is a **Telegram Automation Operating System**.

Where "Office Attendance" is just one module. The platform supports any automation use case.

User connects Telegram once.

User creates tasks once.

System handles everything automatically.

No more manual scheduling.

No more forgetting.

No more stress.

Just simple, powerful automation that runs quietly in the background — forever.