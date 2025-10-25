import { Client, Collection, DMChannel, Message, NewsChannel, TextChannel } from "discord.js";

export interface CardWithMessage {
    id: string,
    card: string,
    message: Message,
}

export interface DeckSession {
    userId: string;
    channel: TextChannel | DMChannel | NewsChannel | null;
    deck: string[];
    hand: CardWithMessage[];
    flags: string[];
}

export interface ClientWithCommands extends Client {
    commands: Collection<string, any>;
}
