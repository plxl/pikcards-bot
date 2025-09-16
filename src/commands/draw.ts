import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { getDeckSession } from "../lib/deckSessions";
import { sendCardMessage } from "./deck";
import { v4 as uuidv4 } from "uuid";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('draw')
        .setDescription('Draws your next card.'),

    async execute(interaction: ChatInputCommandInteraction) {
        const userId = interaction.user.id;
        const deckSession = getDeckSession(userId);

        if (!deckSession) {
            return await interaction.reply({
                content: 'You don\'t appear to be playing right now. You can play with the `/deck` command!',
                flags: MessageFlags.Ephemeral,
            });
        }

        if (!deckSession.flags.includes('fifth_drawn')) {
            return await interaction.reply({
                content: 'You need to finish drawing your starting hand (select 5th card) before you can draw.',
                flags: MessageFlags.Ephemeral,
            });
        }

        const storedChannelId = deckSession.channel?.id;
        const currentChannelId = interaction.channel?.id;
        if (storedChannelId && currentChannelId) {
            if (storedChannelId !== currentChannelId) {
                return await interaction.reply({
                    content: `Use this command in the same channel you used \`/deck\`: <#${storedChannelId}>`,
                    flags: MessageFlags.Ephemeral,
                });
            }
        }

        // deferUpdate() because we are required to make some form of proper interaction reply to the command
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const username = interaction.user.username;
        const logName = `[@${username} | ${userId}]`;

        const message = await sendCardMessage(deckSession, logName, ['play'], uuidv4());

        // check for any errors that may have occurred
        if (message) {
            let response = `An unknown error occurrred: \`${message}\``
            switch (message) {
                case 'deck_empty': response = 'You have no more cards left in your deck!'; break;
                case 'hand_full': response = 'You already have 10 cards and can\'t hold any more!'; break;
            }

            await interaction.editReply({
                content: response
            });
        }
        else {
            await interaction.deleteReply();
        }
    },
}
