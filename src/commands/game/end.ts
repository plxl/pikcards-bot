import type { ExtendedClient } from "../../types/Client";
import type { ChatInputCommandInteraction, Interaction } from "discord.js";
import { ButtonBuilder, ActionRowBuilder, MessageFlags, SlashCommandBuilder, ButtonStyle, StringSelectMenuBuilder } from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName('end')
        .setDescription("Ends all game sessions you are currently participating in.")
        .addChannelOption(option =>
            option.setName("channel")
                .setDescription("The channel in which the game you want to end is in.")
                .setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        handleEndSession(interaction, false);
    },

    async createInteraction(interaction: Interaction) {
        const userId = interaction.user.id;
        const client = interaction.client as ExtendedClient;

        // end all games on confirmation button press
        if (interaction.isButton() && interaction.customId === "end:all") {
            const failed: string[] = [];
            const deckSessionChannelIds = client.deckManager.getAll(userId).map(ds => ds.channel.id);

            for (const channelId of deckSessionChannelIds) {
                const removed = await client.deckManager.remove(userId, channelId);
                if (!removed) failed.push(channelId);
            }

            if (failed.length > 0) {
                const failedList = failed
                    .map(channelId => `- <#${channelId}>`)
                    .join("\n");

                await interaction.update([
                    `Games in the following channels were not ended due to an error:`,
                    failedList, ``,
                    `Please try again later.`
                ].join("\n"));
            }

            else
                await interaction.update({
                    content: "All of your games have now ended.",
                    components: [],
                });
        }

        // end all selected games from string select menu
        else if (interaction.isStringSelectMenu() && interaction.customId === "end:selection") {

            if (interaction.values.length === 0)
                return

            else if (interaction.values.length === 1)
                endSingleSession(interaction, interaction.values[0]!)

            else
                endMultiSessions(interaction, interaction.values);
        }
    },
}

export async function endMultiSessions(interaction: Interaction, channelIds: string[]) {
    if (!interaction.isStringSelectMenu())
        return console.error(`endMultiSessions(): unexpected Interaction type: ${interaction.type}`);

    const client = interaction.client as ExtendedClient;
    const userId = interaction.user.id;

    const { succeeded, failed } = await client.deckManager.removeMulti(userId, channelIds);
    const message: string[] = []

    if (succeeded.length > 0) {
        const channelList = succeeded
            .map(id => `- <#${id}>`)
            .join("\n");
        message.push("You have ended your game sessions in:", channelList);
    }

    if (failed.length > 0) {
        const channelList = failed
            .map(id => `- <#${id}>`)
            .join("\n");
        message.push(
            "An error occurred while attempting to end your game sessions in:",
            channelList,
            "Please try again later."
        );
    }

    await interaction.update({
        content: message.join("\n"),
        components: [],
    });
}

export async function endSingleSession(interaction: Interaction, channelId: string) {
    if (!interaction.isChatInputCommand())
        return console.error(`endSingleSession(): unexpected Interaction type: ${interaction.type}`);

    const client = interaction.client as ExtendedClient;
    const userId = interaction.user.id;

    const channelStr = channelId === interaction.channelId ?
        `this channel` : `<#${channelId}>`;
    let message = `You have ended your game session in ${channelStr}.`;

    const removed = await client.deckManager.remove(userId, channelId);

    if (!removed)
        message = [
            `An error occurred while attempting to end your game in ${channelStr}.`,
            `Please try again later.`,
        ].join("\n");

    await interaction.reply({
        content: message,
        flags: MessageFlags.Ephemeral,
    });
}

export async function handleEndSession(interaction: ChatInputCommandInteraction, endAll: boolean = false) {
    const client = interaction.client as ExtendedClient;
    const userId = interaction.user.id;

    const deckSessionChannels = client.deckManager.getAll(userId).map(ds => ds.channel);

    // --- handle not in any games ---
    if (deckSessionChannels.length === 0)
        return await interaction.reply({
            content: [
                "You aren't in any games in any servers/channels right now.",
                "You can start a game with /deck!",
            ].join("\n"),
            flags: MessageFlags.Ephemeral,
        })

    // --- optional input channel argument ---
    // * always returns undefined for the ./endall.ts command which does not have options
    const chosenChannel = interaction.options.getChannel("channel", false);
    if (chosenChannel) {
        const channelId = chosenChannel.id;
        if (deckSessionChannels.some(channel => channel.id === channelId))
            return endSingleSession(interaction, channelId);

        else {
            // input channel was not a channel the user is in
            // TODO: maybe print the list of channels theyre gaming in?
            return await interaction.reply({
                content: `You are not currently playing a game in <#${channelId}>.`,
                flags: MessageFlags.Ephemeral,
            })
        }
    }

    // -- no option given but only in one game ---
    if (deckSessionChannels.length === 1) {
        const channelId = deckSessionChannels[0]!.id;
        return endSingleSession(interaction, channelId);
    }

    // -- no option given and in multiple games, ask for confirmation ---
    const channelList = deckSessionChannels
        .map(channel => `- <#${channel.id}>`)
        .join("\n");

    let message = [
        `You're currently in a game in the following channels:`,
        channelList, ``,
    ]
    let components: any[] = [];

    if (endAll) {
        message.push("Are you sure you want to end all games? **This cannot be undone.**");
        components.push(
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(new ButtonBuilder()
                    .setCustomId("end:all")
                    .setLabel("Yes, End All Games")
                    .setStyle(ButtonStyle.Danger),
                ));
    }

    else {
        message.push("Select the games you'd like to end. **This cannot be undone.**")
        const options = deckSessionChannels.map(ch => ({
            label: ch.name,
            value: ch.id
        }));
        components.push(
            new ActionRowBuilder<StringSelectMenuBuilder>()
                .addComponents(new StringSelectMenuBuilder()
                    .setCustomId("end:selection")
                    .setPlaceholder("Choose channels")
                    .addOptions(options)
                    .setMinValues(1)
                    .setMaxValues(options.length),
                ));
    }

    await interaction.reply({
        content: message.join("\n"),
        flags: MessageFlags.Ephemeral,
        components: components,
    })
}
