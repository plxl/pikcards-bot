import { GatewayIntentBits } from 'discord.js';
import { ClientWithCommands } from './types/Client';

export const client = new ClientWithCommands({
    intents: [
        GatewayIntentBits.Guilds,
    ],
});
