import type { ExtendedClient } from "../../types/Client";
import type { ChatInputCommandInteraction } from "discord.js";
import { MessageFlags, SlashCommandBuilder } from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName('hand')
        .setDescription("Get your current hand as a list of strings (for development purposes)."),

    async execute(interaction: ChatInputCommandInteraction) {
        const userId = interaction.user.id;
        const username = interaction.user.username;
        const client = interaction.client as ExtendedClient;
        const channelId = interaction.channelId;
        const logName = `[@${username} | ${userId}] [/hand]`;

        const deckSessionChannelIds = client.deckManager.getAll(userId).map(ds => ds.channel.id);
        const channelList = deckSessionChannelIds
            .map(channelId => `- <#${channelId}>`)
            .join("\n");

        if (deckSessionChannelIds.length === 0)
            return await interaction.reply({
                content: "You aren't currently playing any games. Start with \`/deck\`!",
                flags: MessageFlags.Ephemeral,
            });

        // early return if the user is not currently playing in this channel
        if (!deckSessionChannelIds.includes(channelId))
            return await interaction.reply({
                content: [
                    "You aren't currently playing a game in this channel.",
                    "Here are all the channels you have games in:",
                    channelList
                ].join("\n"),
                flags: MessageFlags.Ephemeral,
            });

        const hand = client.deckManager.get(userId, channelId)?.hand;
        if (!hand) {
            console.error(`${logName} deckSession found but hand was null in channel <#${channelId}>`);
            return await interaction.reply({
                content: "An unexpected error occurred when trying to get your hand.",
                flags: MessageFlags.Ephemeral,
            });
        }

        const handList = hand
            .map(c => `- ${c.name} \`[${c.id} | ${c.messageId}]\``)
            .join("\n");

        await interaction.reply({
            content: [
                "Here is you current hand in this channel's game:",
                handList,
            ].join("\n"),
            flags: MessageFlags.Ephemeral,
        });
    },
}
