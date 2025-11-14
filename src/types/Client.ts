import type { DeckManager } from './DeckManager';
import type { ClientOptions, SlashCommandBuilder, Interaction, ChatInputCommandInteraction } from 'discord.js';
import { Client, Collection } from 'discord.js';

export interface Command {
    data: SlashCommandBuilder;
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
    createInteraction(interaction: Interaction): Promise<void>;
}

export class ExtendedClient extends Client {
    commands: Collection<string, Command> = new Collection();

    constructor(
        public deckManager: DeckManager,
        options: ClientOptions,
    ) {
        super(options);
        this.deckManager.client = this;
    }
}
