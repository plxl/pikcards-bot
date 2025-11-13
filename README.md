# Pikcards Companion Discord Bot

A TypeScript + Bun Discord.js bot companion for the Pikcards card game. The goal of this bot is to simplify the process of providing players with their cards in a Discord channel environment (typically manually done by a "Game Master").

## Setup Guide
Install the latest version of [Bun](https://bun.com) and clone this repository to your system, then simply:
```bash
bun install
bun run dev
```

## Plan
- Manage player decks
  - Randomise deck
  - Allow re-drawing first 4 cards
  - Implement choosing 5th card
  - "Play" cards (remove from hand)
  - Allow player to add cards manually
    - from deck
    - from conjuring
