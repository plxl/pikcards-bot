import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import type { ExtendedClient } from '../types/Client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const eventsDir = path.join(__dirname, '../events');

function getEventFiles(dir: string): string[] {
    const files: string[] = [];

    for (const file of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, file);

        if (fs.statSync(fullPath).isDirectory())
            files.push(...getEventFiles(fullPath));

        else if (file.endsWith('.ts') || file.endsWith('.js'))
            files.push(fullPath);

    }

    return files;
}

export async function registerEvents(client: ExtendedClient) {
    const eventFiles = getEventFiles(eventsDir);

    for (const file of eventFiles) {
        const eventModule = await import(pathToFileURL(file).href);
        const event = eventModule.default ?? eventModule;

        if (!event?.name || typeof event.execute !== 'function') {
            console.warn(`Skipping invalid event file: ${file}`);
            continue;
        }

        if (event.once)
            client.once(event.name, (...args) => event.execute(...args, client));

        else
            client.on(event.name, (...args) => event.execute(...args, client));

    }

    console.log(`Registered ${eventFiles.length} events.`);
}
