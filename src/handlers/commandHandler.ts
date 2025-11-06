import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import type { ExtendedClient } from '../types/Client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsDir = path.join(__dirname, '../commands');

function getCommandFiles(dir: string): string[] {
    const files: string[] = [];
    for (const file of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            files.push(...getCommandFiles(fullPath));
        } else if (file.endsWith('.ts') || file.endsWith('.js')) {
            files.push(fullPath);
        }
    }
    return files;
}

export async function registerCommands(client: ExtendedClient) {
    client.commands.clear();
    const commandFiles = getCommandFiles(commandsDir);

    for (const file of commandFiles) {
        const commandModule = await import(pathToFileURL(file).href);
        const command = (commandModule.default ?? commandModule);

        if (!command?.data?.name) {
            console.warn(`Skipping invalid command file: ${file}`);
            continue;
        }

        client.commands.set(command.data.name, command);
    }

    console.log(`Loaded ${client.commands.size} commands.`);
}

export async function reloadCommand(client: ExtendedClient, commandName: string): Promise<Boolean> {
    const commandFiles = getCommandFiles(commandsDir);
    const targetFile = commandFiles.find((file) => path.parse(file).name === commandName);

    if (!targetFile) {
        console.warn(`Command "${commandName}" not found.`);
        return false;
    }

    try {
        // clear module from cache so import re-runs fresh
        const modulePath = pathToFileURL(targetFile).href;
        if ((globalThis as any).Bun)
            delete require.cache[require.resolve(targetFile)]; // only works for bun

        const newModule = await import(`${modulePath}?update=${Date.now()}`);
        const newCommand = (newModule.default ?? newModule);

        if (!newCommand?.data?.name) {
            console.warn(`Reload failed: invalid command export in ${targetFile}`);
            return false;
        }

        client.commands.set(newCommand.data.name, newCommand);
        console.log(`Reloaded command "${newCommand.data.name}".`);
        return true;

    } catch (err) {
        console.error(`Failed to reload command "${commandName}":`, err);
        return false;
    }
}
