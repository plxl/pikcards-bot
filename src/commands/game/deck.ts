import type { ChatInputCommandInteraction } from "discord.js";
import { MessageFlags, SlashCommandBuilder } from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName('deck')
        .setDescription("Manage your saved decks or add new ones.")
        .addStringOption(option =>
            option.setName("action")
                .setDescription("Choose whether you want to add, edit or remove a deck.")
                .setRequired(true)
                .addChoices([
                    {
                        name: "add",
                        value: "add"
                    },
                    {
                        name: "edit",
                        value: "edit"
                    },
                    {
                        name: "remove",
                        value: "remove"
                    },
                ])),

    async execute(interaction: ChatInputCommandInteraction) {
        const action = interaction.options.get("action", true);
        console.log(action.value);

        await interaction.reply({
            content: `Selected: ${action.value}`,
            flags: MessageFlags.Ephemeral
        });
    },
}
