import { ChatInputCommandInteraction, Message, MessageFlags, SlashCommandBuilder } from "discord.js";

module.exports = {
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
            content: `Pong!\nLatency: \`${ping}ms\`\nAPI: \`${apiPing}ms\``,
        });
    },
}
