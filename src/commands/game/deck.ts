import type { ExtendedClient } from "../../types/Client";
import type { ChatInputCommandInteraction } from "discord.js";
import { MessageFlags, SlashCommandBuilder } from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName('deck')
        .setDescription('Sets up an interactable Pikcards deck.')
        .addStringOption(option =>
            option.setName('cards')
                .setDescription('The cards in the deck, separated by commas.')
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as ExtendedClient;
        const userId = interaction.user.id;
        const username = interaction.user.username;
        const logName = `[@${username} | ${userId}] [/deck]`;
        const channelId = interaction.channelId;

        let deckSession = client.deckManager.get(userId, channelId);
        if (!deckSession) {
            console.log(`${logName} Creating new deckSession...`);
            deckSession = await client.deckManager.new(
                userId,
                channelId,
                ["1", "2", "3", "4"],
                [],
                []
            );

        } else {
            console.log(`${logName} Game in channel already exists`);
            await interaction.reply({
                content: "You already have a game in this channel. [command under construction]",
                flags: MessageFlags.Ephemeral,
            });
        }
    },
}
