import type { ExtendedClient } from "../../types/Client";
import type { ChatInputCommandInteraction } from "discord.js";
import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { reloadCommand } from "../../handlers/commandHandler";

export default {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription("Reloads a command (for development purposes).")
        .addStringOption(option =>
            option.setName("command")
                .setDescription("The command's file stem to reload.")
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as ExtendedClient;
        const command = interaction.options.getString("command", true);

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral,
        });

        const reloaded = await reloadCommand(client, command);

        await interaction.editReply({
            content: reloaded ?
                `Successfully reloaded \`${command}\`.`
                :
                `An error occurred while trying to reload \`${command}\`, check the logs.`,
        });
    },
}
