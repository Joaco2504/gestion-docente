---
name: playwright-mcp
description: Browser automation and web testing using Microsoft's Playwright Model Context Protocol (MCP) server. Use when navigating web pages, automating UI tests, interacting with form fields, clicking elements via accessibility trees, inspecting web DOM state, or verifying frontend flows in a headless or headed browser.
---

# Playwright MCP Skill

Automate browser interactions, perform end-to-end testing, and inspect live web pages using Microsoft's official Playwright Model Context Protocol (MCP) server.

## Overview

Playwright MCP enables AI coding agents to interact with web pages deterministically through structured accessibility snapshots rather than relying exclusively on heavy screenshots or vision models.

## MCP Server Configuration

To enable the Playwright MCP server in Antigravity, Claude Code, or Cursor, configure the MCP client settings:

`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
`

Or run directly via CLI:
`ash
npx -y @playwright/mcp@latest
`

## Available MCP Tools & Capabilities

When the Playwright MCP server is active, the agent has access to the following tools:

1. **rowser_navigate**: Navigate the active browser tab to a specified URL.
2. **rowser_snapshot**: Capture the accessibility tree with element references (e.g. e1, e12, utton "Submit").
3. **rowser_click**: Click an element identified by its accessibility reference or selector.
4. **rowser_fill / rowser_type**: Enter text into input fields, textareas, or search boxes.
5. **rowser_press_key**: Send keyboard events (e.g. Enter, Tab, Escape, ArrowDown).
6. **rowser_select_option**: Select dropdown or <select> menu options.
7. **rowser_hover**: Hover over an element to trigger tooltips or dropdown menus.
8. **rowser_wait**: Wait for a specific element, selector, navigation, or timeout.
9. **rowser_screenshot**: Capture a visual screenshot of the viewport or an element.
10. **rowser_close**: Close the browser session when finished.

## Workflow Best Practices

1. **Structured Snapshots over Full Screenshots**: Run a snapshot first to inspect page state and obtain element IDs.
2. **Wait for Network/State Idle**: Ensure SPA state transitions or async data fetching have finished before asserting.
3. **Complementary Playwright CLI**: If MCP is not running, use the companion skill playwright-cli to execute lightweight CLI browser commands directly.
