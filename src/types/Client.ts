import { Client, Collection } from 'discord.js';
import type { SlashCommandBuilder, Interaction, ChatInputCommandInteraction } from 'discord.js';

export interface Command {
    data: SlashCommandBuilder;
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
    createInteraction(interaction: Interaction): Promise<void>;
}

export class ClientWithCommands extends Client {
    commands: Collection<string, Command> = new Collection();
}
