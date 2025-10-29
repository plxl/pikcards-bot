import type { ChatInputCommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import { handleEndSession } from "./end"

export default {
    data: new SlashCommandBuilder()
        .setName('endall')
        .setDescription("Ends all game sessions you are currently participating in."),

    async execute(interaction: ChatInputCommandInteraction) {
        return handleEndSession(interaction, true);
    },
}
