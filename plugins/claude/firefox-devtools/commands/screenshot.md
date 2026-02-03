---
description: Take a screenshot of the current page or element
argument-hint: [uid]
---

# /firefox:screenshot

Captures a screenshot of the page or a specific element.

## Usage

```
/firefox:screenshot          # Full page
/firefox:screenshot <uid>    # Specific element
```

## Examples

```
/firefox:screenshot
/firefox:screenshot e15
/firefox:screenshot e42
```

## What Happens

- Without UID: Calls `screenshot_page` for full page capture
- With UID: Calls `screenshot_by_uid` for element-specific capture

Screenshots are saved and displayed in the conversation.
