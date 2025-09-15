import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { getDeckSession } from "../lib/deckSessions";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hand')
        .setDescription('Shows your current hand for debugging purposes.'),

    async execute(interaction: ChatInputCommandInteraction) {
        const userId = interaction.user.id;
        const deckSession = getDeckSession(userId);

        if (!deckSession) {
            return interaction.reply({
                content: 'You don\'t appear to be playing right now. You can play with the `/deck` command!',
                flags: MessageFlags.Ephemeral,
            });
        }

        const hand = deckSession.hand;

        interaction.reply({
            content: hand.map((cwm, index) => `${index + 1}. ${cwm.card} \`{${cwm.id}}\``).join('\n'),
            flags: MessageFlags.Ephemeral,
        });
    },
}
