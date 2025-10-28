import type { ExtendedClient } from "../types/Client";
import type { Client } from "discord.js";
import { Events } from "discord.js";

export default {
    name: Events.ClientReady,
    once: true,
    execute(client: Client & ExtendedClient) {
        console.log(`Logged in as ${client.user?.tag}`);
    },
};
