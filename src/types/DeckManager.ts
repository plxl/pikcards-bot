import fs from 'fs';
import fsp from 'fs/promises'
import path from 'path';

export interface CardMessage {
    id: string;
    name: string;
    messageId: string;
}

export interface ChannelInfo {
    id: string,
    name: string,
    guildId?: string,
}

export class DeckSession {
    #decksDir: string;

    constructor(
        decksDir: string,
        public userId: string,
        public channel: ChannelInfo,
        public deck: string[],
        public hand: CardMessage[],
        public flags: string[],
    ) {
        this.#decksDir = decksDir;
    }

    static fromJSON(decksDir: string, data: any): DeckSession {
        return new DeckSession(
            decksDir,
            data.userId,
            data.channel,
            data.deck,
            data.hand,
            data.flags
        );
    }

    async save() {
        const logName = `[@${this.userId} | #${this.channel.id}]`;
        console.log(`${logName} Saving deckSession...`);

        try {
            const filename = path.join(this.#decksDir, `${this.userId}_${this.channel.id}.json`);
            const data = JSON.stringify(this);

            await fsp.mkdir(path.dirname(filename), { recursive: true });
            await fsp.writeFile(filename, data);
        }

        catch (err) {
            console.error(`Error saving deckSession ${logName}:`, err);
        }
    }
}

// deckManager is in the ExtendedClient class src/types/Client.ts
// instance is generated in src/client.ts
export class DeckManager {
    #decksDir: string;
    public decks: DeckSession[] = [];

    constructor(decksDir: string) {
        this.#decksDir = decksDir;
        this.loadDecks();
    }

    loadDecks() {
        try {
            const files = fs.readdirSync(this.#decksDir).filter(f => f.endsWith('.json'));
            this.decks = files.map(file => {
                const data = JSON.parse(fs.readFileSync(path.join(this.#decksDir, file), 'utf-8'));
                return DeckSession.fromJSON(this.#decksDir, data);
            });
            console.log(`Loaded ${this.decks.length} deck sessions.`);

        } catch (err) {
            console.error("Error loading decks:", err);
            this.decks = [];
        }
    }

    async new(
        userId: string,
        channel: ChannelInfo,
        deck: string[],
        hand: CardMessage[],
        flags: string[]
    ): Promise<DeckSession> {
        const deckSession = new DeckSession(
            this.#decksDir,
            userId,
            channel,
            deck,
            hand,
            flags
        );
        this.decks.push(deckSession);
        await deckSession.save();
        return deckSession;
    }

    get(userId: string, channelId: string): DeckSession | undefined {
        return this.decks.find(ds => ds.userId === userId && ds.channel.id == channelId);
    }

    getAll(userId: string): DeckSession[] {
        return this.decks.filter(ds => ds.userId === userId);
    }

    async remove(userId: string, channelId: string): Promise<boolean> {
        const index = this.decks.findIndex(ds => ds.userId == userId && ds.channel.id == channelId)
        if (index === -1) {
            console.error([
                `Attempted to remove deckSession that could not be found.`,
                `User ID: ${userId} | Channel ID: ${channelId}`
            ].join("\n"));
            return false;
        }

        const logName = `[@${userId} | #${channelId}]`;
        console.log(`${logName} Removing deckSession...`);
        try {
            // attempt to delete file before removing from decks array
            const filename = path.join(this.#decksDir, `${userId}_${channelId}.json`);
            await fsp.unlink(filename)
            this.decks.splice(index, 1);
        }

        catch (err) {
            console.error(`Error removing deckSession ${logName}:`, err);
            return false;
        }

        return true;
    }
}
