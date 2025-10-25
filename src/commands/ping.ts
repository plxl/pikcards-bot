import type { ChatInputCommandInteraction } from "discord.js";
import { MessageFlags, SlashCommandBuilder } from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription("Get the bot's current latency."),

    async execute(interaction: ChatInputCommandInteraction) {
        const sent = Date.now()
        await interaction.reply({
            content: "Pinging...",
            options: { withResponse: true },
            flags: MessageFlags.Ephemeral
        })

        const ping = Date.now() - sent
        const apiPing = interaction.client.ws.ping;

        await interaction.editReply({
            content: [
                `Pong!`,
                `Latency: \`${ping}ms\``,
                `API: \`${apiPing === -1 ? `not measured yet` : `${apiPing}ms`}\``
            ].join("\n"),
        });
    },
}
