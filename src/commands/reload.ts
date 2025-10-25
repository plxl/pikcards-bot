import { SlashCommandBuilder, MessageFlags, ChatInputCommandInteraction } from 'discord.js';
import fsp from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { ClientWithCommands } from '../types';

export const data = new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reloads a command.')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('The command to reload.')
                .setRequired(true))

export async function execute(interaction: ChatInputCommandInteraction) {
    if (interaction.user.id !== process.env.DEV_USER_ID) return;
    const commandName = interaction.options.getString('command', true).toLowerCase();
    const commandsRoot = path.join(process.cwd(), "src", "commands");
    const found = await findCommandFile(commandsRoot, commandName);

    if (!found) {
        const message = `Command "${commandName}" not found.`;
        console.error(message)
        return await interaction.reply({
            content: message,
            flags: MessageFlags.Ephemeral,
        });
    }

    // import .js file if it exists instead for production build
    let file = found
    if (found.endsWith(".ts")) {
        const jsFile = found.replace(/\.ts$/, ".js"); // replace last .ts with .js
        if (fs.existsSync(jsFile)) file = jsFile;
    }

    try {
        // remove from cache so it can be forcefully reloaded
        delete require.cache[require.resolve(file)];
        const newCommand = await import(file);
        (interaction.client as ClientWithCommands).commands.set(newCommand.data.name, newCommand);

        await interaction.reply({
            content: `Command \`${newCommand.data.name}\` was reloaded!`,
            flags: MessageFlags.Ephemeral,
        });

    } catch (error) {
        console.error(error);
        await interaction.reply({
            content: `There was an error while reloading command \`${commandName}\`.`,
            flags: MessageFlags.Ephemeral,
        });
    }
}

async function findCommandFile(dir: string, name: string): Promise<string | null> {
    const entries = await fsp.readdir(dir, { withFileTypes: true });

    for (const e of entries) {
        const full = path.join(dir, e.name);

        if (e.isDirectory()) {
            const found = await findCommandFile(full, name);
            if (found) return found;

        } else if (e.isFile()) {
            const base = path.parse(e.name).name; // filename without ext
            if (base === name) return full;
        }
    }

    return null;
}
