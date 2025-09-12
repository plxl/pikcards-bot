import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { loadOrCreateDeckSessions } from "../lib/deckSessions";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetdeck')
        .setDescription('Resets deckSessions for debugging.'),

    async execute(interaction: ChatInputCommandInteraction) {
        loadOrCreateDeckSessions();

        await interaction.reply({
            content: 'Reset deckSessions to `[]`',
            flags: MessageFlags.Ephemeral,
        });
    },
}
