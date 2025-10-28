import { GatewayIntentBits } from 'discord.js';
import { ExtendedClient } from './types/Client';

export const client = new ExtendedClient({
    intents: [
        GatewayIntentBits.Guilds,
    ],
});
