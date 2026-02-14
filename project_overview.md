Project Overview

---

This project is a web-based automation system powered by a Python backend that controls Telegram user accounts. The purpose of the system is to remove the need for daily manual scheduling of attendance stickers in a Telegram group.

In the current situation, employees must send specific stickers at fixed times such as duty start, break, break end, and duty end. Because Telegram Premium is not available, they must manually schedule these stickers every single day. This process is repetitive, time-consuming, and easy to forget.

This system will solve that problem by allowing users to connect their Telegram accounts once, define their daily schedule, and let the system automatically send the correct stickers at the correct times every day. Users can also define off days so the automation stops on those dates.

The system will be hosted on a VPS and controlled through a browser interface.

---

## Architecture

### Technologies

**Backend**

- Python
- Telegram Userbot (Telethon or Pyrogram)
- REST API system
- Background scheduler (cron or internal worker)

**Frontend**

- React (Vite)
- shadecn
- reac hot toast
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

The main goal is to create a stable and simple system where:

- Each employee logs into their Telegram account once.
- They select the attendance group.
- They choose stickers for:
    - Duty In
    - Break Start
    - Break End
    - Duty Out
- They set times once.
- The system runs daily automatically.
- Off days can be set to pause the schedule.

No daily manual work needed.

---

## Key Features

### 1. Multi Telegram Account Support

Each user can connect one or more Telegram accounts.

Each account will have its own schedule and settings.

### 2. Daily Scheduler

Users set times once:

- Duty In time
- Break start time
- Break end time
- Duty out time

The system repeats this daily automatically.

### 3. Exclude Days / Off Days

Users can mark:

- Weekly holidays
- Specific dates
- Leave days

On those days, no stickers will be sent.

### 4. Sticker Selection

User selects from their Telegram stickers:

- Duty in sticker
- Break sticker
- Back from break sticker
- Duty out sticker

These will be saved per account.

### 5. Group Selection

User selects the target Telegram group:

- Attendance group
- Selected once
- Saved permanently

### 6. Background Automation

The server will:

- Run continuously
- Check time
- Send stickers at correct times
- Skip off days
- Log success/failure

---

## User Flow

### Registration

User creates an account using:

- Gmail
- Password

Basic email verification can be added for safety.

---

### Login

User logs in using:

- Email
- Password

After login, user goes directly to the Telegram Accounts page.

---

### Telegram Accounts Page

This page shows:

- All connected Telegram accounts
- Button: “Add Telegram Account”

Each account card shows:

- Phone number
- Status (Active / Locked)
- Last activity

Clicking an account opens its dashboard.

---

### Add Telegram Account Flow

User clicks “Add Telegram Account”.

Steps:

1. Enter phone number
2. Receive Telegram login code
3. Enter code
4. Account connected

After success:

- Redirect to accounts page
- New account appears in list

---

### Telegram Account Dashboard

This dashboard is specific to one Telegram account.

Layout:

- Sidebar on desktop
- Bottom navigation on mobile

Menu Items:

- Scheduler Page
- Off Days Page
- Sticker Setup
- Group Setup

---

### Scheduler Page

User sets daily times:

- Duty in time
- Break start time
- Break end time
- Duty out time

Options:

- Enable/disable schedule
- Edit times
- Save changes

System shows:

- Next upcoming action
- Last sent action

---

### Sticker Setup Page

User selects stickers for:

- Duty in
- Break
- Break end
- Duty out

These are saved and reused daily.

---

### Group Setup Page

User selects the attendance group.

System will:

- Show user’s joined groups
- Allow selecting one

Saved as target destination.

---

### Off Days Page

User can:

- Add specific dates
- Add weekly holidays
- Remove dates

On these days:

- Automation stops
- No stickers sent

---

## Admin Dashboard

Admin has full control over system and users.

### User Management

Admin can:

- View all users
- Lock user accounts
- Delete users
- Limit how many Telegram accounts a user can add

Admin can see:

- Total Telegram accounts per user
- Activity logs

---

### Telegram Account Control

Admin can:

- Lock a Telegram account
- Stop its scheduler
- Prevent sending stickers

Useful if:

- Abuse detected
- Server load issues
- Security concerns

---

### System Controls

Admin panel includes:

- Hard restart server
- Clear old logs
- Backup database
- Restore backup

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

Example statuses:

- “Next duty in sticker will send at 11:00 AM”
- “Scheduler paused (Off day)”
- “Telegram account disconnected”

---

## Safety & Security

This is very important because Telegram accounts are sensitive.

Security steps:

1. Store Telegram sessions safely and encrypted.
2. Never store raw passwords.
3. Use secure login tokens.
4. Limit API requests.
5. Detect spam-like behavior.
6. Auto stop if too many errors happen.

---

## Stability & Error Prevention

To make the system solid:

- Background worker should retry failed sends.
- Maintain logs:
    - Sent successfully
    - Failed sends
    - Time mismatches
- Auto reconnect Telegram sessions if disconnected.
- Prevent duplicate sending.
- Time zone handling must be correct.

---

## Scalability

System should be ready for growth:

- Multiple users
- Multiple Telegram accounts per user
- Many schedules running at once

Use:

- Job queue
- Worker system
- Smart scheduling

---

## Future Possible Features

- Temporary pause button

---

## Final Vision

This system should feel like:

“Set once, forget forever.”

User connects Telegram once.

User sets times once.

System handles everything daily.

No more manual scheduling.

No more forgetting.

No more stress.

Just simple automation that runs quietly in the background.