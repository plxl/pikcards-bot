import fs from 'fs';
import path from 'path';
import { DeckSession } from '../types';

const DECK_FILE = path.join(process.cwd(), 'storage', 'deck-sessions.json');

let deckSessions: DeckSession[] | null;

export function getDeckSession(userId: string): DeckSession | undefined {
    if (!deckSessions) return undefined;
    return deckSessions.find(ds => ds.userId === userId);
}

export function addDeckSession(session: DeckSession) {
    if (!deckSessions) {
        return console.error('ERROR: Attempted to add Deck Session before initialising deckSessions');
    }
    deckSessions.push(session);
}

export function getAllDeckSessions(): DeckSession[] {
    if (!deckSessions) loadOrCreateDeckSessions();
    return deckSessions!; // assert that the above method ensures it is not null
}

export function loadOrCreateDeckSessions() {
    try {
        // use synchronous to avoid race condition with others using same command simultaneously
        // this should only happen once when the bot first starts anyway
        if (!fs.existsSync(DECK_FILE)) {
            throw new Error('deck_sessions_missing');
        }
        const rawData = fs.readFileSync(DECK_FILE, 'utf-8');
        deckSessions = JSON.parse(rawData);
        console.log(`Loaded ${deckSessions?.length} deck sessions from "${DECK_FILE}"`)
    }
    catch (err: any) {
        if (err.message == 'deck_sessions_missing') {
            // deck-sessions.json didn't exist
            console.log('Previous deck-sessions.json was not found, starting with empty array');
        }
        else if (err instanceof SyntaxError) {
            // JSON parsing likely failed
            console.error('deck-sessions.json is malformed, starting with empty array');
        }
        else {
            // any other potential errors
            console.error('Failed to load deck-sessions.json:', err);
            console.log('Due to above error with deck-sessions.json, starting with empty array');
        }
        deckSessions = [];
    }

}
