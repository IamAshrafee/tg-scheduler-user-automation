# Developer Guide: Creating New Task Templates

This guide explains how to add new Templates to the system. Since there is currently no UI for creating templates, developers must add them directly to the codebase or database.

## Overview

Templates in this system act as **structural blueprints**. They define a sequence of tasks (e.g., "Send a text at 9 AM", then "Send a sticker at 10 AM") but do **not** contain the specific content (e.g., the actual text message or sticker file).

**Why?**
- Content requirements vary per user (e.g., different "Good Morning" messages).
- Templates focus on the *workflow* and *schedule*.
- Users provide the content during the "Use Template" wizard flow.

## 1. Defining Templates in Code (Recommended)

The easiest way to add a permanent template is to modify the `BUILT_IN_TEMPLATES` list in the backend source code. The system automatically seeds these templates into the database on startup if they don't exist.

### Step 1: Locate the File
Open `backend/app/models/template.py`.

### Step 2: Understand the Structure
A template is a dictionary with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name in the UI (e.g., "Morning Routine"). |
| `description` | string | Brief explanation of what this template does. |
| `icon` | string | Helper emoji or icon string (e.g., "🌅"). |
| `category` | string | Grouping category: `work`, `content`, `personal`, `community`. |
| `is_system` | bool | Always set to `True` for built-in templates. |
| `tasks` | list | Array of task configurations (see below). |

#### Task Configuration Object
Each item in the `tasks` list defines a single action:

| Field | Type | Options | Description |
|-------|------|---------|-------------|
| `name` | string | - | Name of the specific task (e.g., "Wake Up Post"). |
| `action_type` | string | `send_text`, `send_sticker`, `send_photo`, `send_video`, `send_document`, `forward_message` | The type of Telegram action to perform. |
| `schedule_type` | string | `daily`, `weekly`, `monthly`, `custom_days`, `specific_dates` | How the task repeats. |
| `default_time` | string | "HH:MM" (24hr) | The default execution time (user can change this). |
| `description` | string | - | Internal note for the task. |

### Step 3: Add Your Template
Append a new dictionary to the `BUILT_IN_TEMPLATES` list.

**Example: "Weekend Relax Mode" Template**
```python
    {
        "name": "Weekend Relax Mode",
        "description": "Schedule a relaxing message and sticker for Saturday and Sunday mornings.",
        "icon": "jn",
        "category": "personal",
        "tasks": [
            {
                "name": "Saturday Morning Vibe",
                "action_type": "send_text",
                "schedule_type": "weekly",
                "default_time": "10:00",
                "description": "Send a chill text on Saturday"
            },
            {
                "name": "Sunday Sticker",
                "action_type": "send_sticker",
                "schedule_type": "weekly",
                "default_time": "11:00",
                "description": "Send a fun sticker on Sunday"
            }
        ],
        "is_system": True,
    },
```

### Step 4: Apply Changes
Restart the backend server.
```bash
# In backend terminal
Ctrl+C
python main.py
```
On startup, the system checks for `is_system: True` templates. If your new template is not in the database, it will be added.

> **Note:** If you modify an *existing* template in code, the changes might not reflect if the template already exists in the DB. You may need to manually delete the template from the database to force a re-seed.

## 2. Advanced: Manual Database Insertion

If you prefer to add a template without modifying code (e.g., for testing), you can insert it directly into MongoDB.

**Collection:** `templates`

**JSON Document:**
```json
{
  "name": "Manual Template",
  "description": "Created via MongoDB Compass",
  "icon": "🛠️",
  "category": "work",
  "is_system": false,
  "created_at": { "$date": "2023-10-27T10:00:00Z" },
  "tasks": [
    {
      "name": "Task 1",
      "action_type": "send_text",
      "schedule_type": "daily",
      "default_time": "09:00",
      "description": "Manual task"
    }
  ]
}
```

## Summary of Action Types

Use these string values for `action_type`:
- `send_text`: Simple text message.
- `send_sticker`: Telegram sticker (user will select pack/sticker).
- `send_photo`: Image file (user will upload).
- `send_video`: Video file (user will upload).
- `send_document`: General file (user will upload).
- `forward_message`: Forward from another channel (user will provide Source Chat ID).

## Limitations

- **No Content Pre-filling**: You cannot currently specify the *text* or *file* in the template. The template only defines the *structure* (Time, Type, Name).
- **Timezone**: Templates are timezone-agnostic. The user's timezone is applied during instantiation.
