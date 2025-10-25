import { Client, Collection } from 'discord.js';
import type { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export interface Command {
    data: SlashCommandBuilder;
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

export class ClientWithCommands extends Client {
    commands: Collection<string, Command> = new Collection();
}
