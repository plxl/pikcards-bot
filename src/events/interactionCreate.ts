import type { ExtendedClient } from "../types/Client";
import type { Interaction, ChatInputCommandInteraction } from "discord.js";
import { Events } from "discord.js";

export default {
    name: Events.InteractionCreate,
    async execute(interaction: Interaction, client: ExtendedClient) {
        try {
            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (command)
                    await command.execute(interaction as ChatInputCommandInteraction);

                return;
            }

            // handle other interaction types on a per-command basis
            for (const command of client.commands.values())
                if (typeof command.createInteraction === 'function')
                    await command.createInteraction(interaction);

        } catch (err) {
            console.error("Error in interactionCreate:", err);
            if (interaction.isRepliable())
                await interaction.reply({
                    content: "An internal error occurred while processing this interaction.",
                    ephemeral: true,
                }).catch(() => { });
        }
    },
};
