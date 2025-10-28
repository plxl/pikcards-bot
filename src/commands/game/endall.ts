import type { ExtendedClient } from "../../types/Client";
import type { ChatInputCommandInteraction, Interaction } from "discord.js";
import { ButtonBuilder, ActionRowBuilder, MessageFlags, SlashCommandBuilder, ButtonStyle } from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName('endall')
        .setDescription("Ends all game sessions you are currently participating in."),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as ExtendedClient;
        const userId = interaction.user.id;

        let deckSessionChannelIds = client.deckManager.getAll(userId).map(ds => ds.channelId);

        if (deckSessionChannelIds.length === 0)
            return await interaction.reply({
                content: [
                    "You aren't in any games in any servers/channels right now.",
                    "You can start a game with /deck!",
                ].join("\n"),
                flags: MessageFlags.Ephemeral,
            })

        if (deckSessionChannelIds.length === 1) {
            // dont bother with confirmation if the user is only in one game
            const channelId = deckSessionChannelIds[0]!;
            const channelStr = channelId === interaction.channelId ?
                `this channel` : `<#${channelId}>`;
            const removed = await client.deckManager.remove(userId, channelId);
            if (removed)
                await interaction.reply({
                    content: `You have ended your game session in ${channelStr}.`,
                    flags: MessageFlags.Ephemeral,
                });

            else
                await interaction.reply({
                    content: [
                        `An error occurred while attempting to end your game in ${channelStr}.`,
                        `Please try again later.`,
                    ].join("\n"),
                    flags: MessageFlags.Ephemeral,
                });
        }

        else {
            // ask for confirmation when ending all game sessions
            const channelList = deckSessionChannelIds
                .map(channelId => `- <#${channelId}>`)
                .join("\n");

            await interaction.reply({
                content: [
                    `You're currently in a game in the following channels:`,
                    channelList, ``,
                    `Are you sure you want to end all games? **This cannot be undone.**`
                ].join("\n"),
                flags: MessageFlags.Ephemeral,
                components: [
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(new ButtonBuilder()
                            .setCustomId(`endall:confirm`)
                            .setLabel('Yes, End All Games')
                            .setStyle(ButtonStyle.Danger)
                        )
                ],
            })
        }
    },

    async createInteraction(interaction: Interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith("endall:")) return;

        const userId = interaction.user.id;
        const client = interaction.client as ExtendedClient;

        const buttonPressed = interaction.customId === "endall:confirm";

        if (buttonPressed) {
            const failed: string[] = [];
            let deckSessionChannelIds = client.deckManager.getAll(userId).map(ds => ds.channelId);

            for (const channelId of deckSessionChannelIds) {
                const removed = await client.deckManager.remove(userId, channelId);
                if (!removed) failed.push(channelId);
            }

            if (failed.length > 0) {
                const failedList = failed
                    .map(channelId => `- <#${channelId}>`)
                    .join("\n");
                await interaction.reply({
                    content: [
                        `Games in the following channels were not ended due to an error:`,
                        failedList, ``,
                        `Please try again later.`
                    ].join("\n"),
                    flags: MessageFlags.Ephemeral,
                })
            }

            else
                await interaction.reply({
                    content: "All of your games have now ended.",
                    flags: MessageFlags.Ephemeral,
                });
        }
    }
}
