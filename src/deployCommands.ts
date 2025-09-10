import { REST, Routes } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config();

const clientId = process.env.CLIENT_ID!;
const token = process.env.TOKEN!;
if (!token) throw new Error('Discord bot token not found in .env!')
if (!clientId) throw new Error('Discord bot client ID not found in .env!')

const commands: any[] = [];
const foldersPath = path.join(__dirname, 'commands');

function loadCommandsToArray(folderPath: string) {
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));

    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        // Dynamic import works for both JS and TS
        const commandModule = require(filePath);
        const command = commandModule.default ?? commandModule;

        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

const entries = fs.readdirSync(foldersPath, { withFileTypes: true });

// Load files in root of "commands"
loadCommandsToArray(foldersPath);

// Load files in subfolders of "commands"
for (const entry of entries) {
    if (entry.isDirectory()) {
        const subFolderPath = path.join(foldersPath, entry.name);
        loadCommandsToArray(subFolderPath);
    }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

// and deploy your commands!
(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        ) as any[];

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    }
    catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }
})();
