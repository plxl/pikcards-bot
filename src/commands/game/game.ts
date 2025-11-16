import type { ExtendedClient } from "../../types/Client";
import type { ChatInputCommandInteraction } from "discord.js";
import { ChannelType, MessageFlags, SlashCommandBuilder } from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName('game')
        .setDescription('Start a Pikcards game with another user.')
        .addUserOption(option =>
            option.setName("opponent")
                .setDescription("Your opponent for this game.")
                .setRequired(true))
        .addStringOption(option =>
            option.setName('deck')
                .setDescription('The cards in the deck, separated by commas.')
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as ExtendedClient;
        const userId = interaction.user.id;
        const username = interaction.user.username;
        const logName = `[@${username} | ${userId}] [/deck]`;
        const channelId = interaction.channelId;
        const channel = interaction.channel ?? await client.channels.fetch(channelId).catch(() => { });
        let channelName;

        const opponentId = interaction.options.getUser("opponent", true).id;

        if (channel?.type === ChannelType.DM)
            channelName = `DM with ${interaction.user.username}`;
        else
            channelName = `#${channel?.name ?? "unkown-channel"}`;

        let deckSession = client.deckManager.get(userId, channelId);
        if (!deckSession) {
            console.log(`${logName} Creating new deckSession...`);
            deckSession = await client.deckManager.new(
                userId,
                {
                    id: channelId,
                    name: channelName,
                    guildId: interaction.guild?.id,
                },
                opponentId,
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

        for (const card of deckSession.deck) {
            deckSession.hand.push({
                id: card,
                name: card,
                messageId: card,
            });
        }
        deckSession.save();

        await interaction.reply({
            content: "`[command under construction]`",
            flags: MessageFlags.Ephemeral,
        });
    },
}
