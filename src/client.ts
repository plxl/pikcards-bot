import fs from "fs";
import path from "path";
import { GatewayIntentBits } from 'discord.js';
import { ExtendedClient } from './types/Client';
import { DeckManager } from './types/DeckManager';

const __dirname = path.dirname(__filename);
const decksDir = path.join(__dirname, '../data/games');
if (!fs.existsSync(decksDir))
    fs.mkdirSync(decksDir, { recursive: true });

const deckManager = new DeckManager(decksDir)

export const client = new ExtendedClient(deckManager, {
    intents: [
        GatewayIntentBits.Guilds,
    ],
});
