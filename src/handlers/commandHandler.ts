import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import type { ClientWithCommands } from '../types/Client';

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

export async function registerCommands(client: ClientWithCommands) {
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

export async function reloadCommand(client: ClientWithCommands, commandName: string) {
    const commandFiles = getCommandFiles(commandsDir);
    const targetFile = commandFiles.find((file) =>
        file.endsWith(`/${commandName}.ts`) || file.endsWith(`/${commandName}.js`)
    );

    if (!targetFile) {
        console.warn(`Command "${commandName}" not found.`);
        return;
    }

    try {
        // clear module from cache so import re-runs fresh
        const modulePath = pathToFileURL(targetFile).href;
        // bun automatically reloads, others we need to delete from
        if (!(globalThis as any).Bun) {
            // @ts-ignore
            delete import.meta.cache?.[modulePath];
        }

        const newModule = await import(`${modulePath}?update=${Date.now()}`);
        const newCommand = (newModule.default ?? newModule);

        if (!newCommand?.data?.name) {
            console.warn(`Reload failed: invalid command export in ${targetFile}`);
            return;
        }

        client.commands.set(newCommand.data.name, newCommand);
        console.log(`Reloaded command "${newCommand.data.name}".`);

    } catch (err) {
        console.error(`Failed to reload command "${commandName}":`, err);
    }
}
