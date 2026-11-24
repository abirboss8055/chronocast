# ChronoCast

A headless, zero-cost social media scheduler and multi-platform publisher built on GitHub Actions, Node.js, and flat-file JSON storage.

![Node.js](https://img.shields.io/badge/Node.js-20-43853D?style=flat-square&logo=node.js&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-Automated-2088FF?style=flat-square&logo=github-actions&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-UI-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-Live-222222?style=flat-square&logo=github&logoColor=white)

**Live Dashboard:** [https://abirboss8055.github.io/chronocast/](https://abirboss8055.github.io/chronocast/)

---

## Overview

ChronoCast is a lightweight, serverless alternative to traditional social scheduling tools. Instead of relying on paid SaaS subscriptions or persistent backend servers, ChronoCast manages scheduled posts in a structured `queue.json` file. Every 15 minutes, a GitHub Actions workflow checks for due posts, broadcasts them across connected platforms using encrypted repository secrets, and archives delivery logs into `published.json`.

## Key Features

* **Multi-Platform Publishing:** Native adapters for Discord, Telegram, and custom HTTP webhooks.
* **Multi-Format Payloads:** Supports plain text, rich HTML formatting, and image URLs in a single unified schema.
* **AI-Ready Headless Design:** Any external LLM or automation agent can generate and schedule posts by appending valid JSON objects to `queue.json`.
* **Dry-Run Testing Mode:** Test scheduling and queue transitions without triggering live external API calls.
* **Interactive Web Dashboard:** View upcoming scheduled posts, inspect delivery logs, compose new entries, and copy AI schema prompts directly from GitHub Pages.

## Supported Platforms & Secrets

To enable live publishing, add the corresponding credentials under **Settings > Secrets and variables > Actions**:

| Platform | Required GitHub Secrets | Supported Content |
| :--- | :--- | :--- |
| **Discord** | `DISCORD_WEBHOOK_URL` | Title, plain text, embedded image |
| **Telegram** | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | HTML-formatted text, photo captions |
| **Custom Webhook** | `CUSTOM_WEBHOOK_URL` | Full JSON payload (title, text, HTML, image URL) |

## Queue Schema (Human & AI-Compatible)

Add entries to `queue.json` manually via the dashboard composer or programmatically via an external AI agent:

```json
{
  "id": "post-002",
  "title": "Release Update",
  "text": "Plain text version for Discord and fallbacks.",
  "html": "<b>HTML version</b><br>Formatted for Telegram and custom webhooks.",
  "imageUrl": "[https://example.com/image.jpg](https://example.com/image.jpg)",
  "platforms": ["discord", "telegram"],
  "scheduledAt": "2026-11-25T12:00:00Z",
  "status": "scheduled",
  "source": "ai-agent",
  "dryRun": false
}
chronocast/
├── .github/
│   └── workflows/
│       └── chronocast.yml     # Cron scheduler (runs every 15 minutes)
├── publisher.js               # Modular Node.js publishing engine
├── queue.json                 # Pending scheduled posts
├── published.json             # Archive of last 100 published posts and delivery logs
├── index.html                 # Dashboard, history viewer, and JSON composer
└── README.md                  # Project documentation
```

How It Works
Schedule: A post is added to queue.json with an ISO-8601 UTC scheduledAt timestamp.

Evaluate: Every 15 minutes (or on manual trigger), GitHub Actions runs publisher.js.

Broadcast: Due posts are dispatched to each target platform adapter using encrypted GitHub Secrets.

Archive: Successfully published posts are removed from queue.json and logged in published.json with per-platform delivery status.

Visualize: GitHub Pages serves index.html, reflecting the updated queue and history immediately.