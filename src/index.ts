import fs from 'node:fs';
import path from 'node:path';
import { ChatInputCommandInteraction, Client, Collection, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.TOKEN!;
if (!token) throw new Error('Discord bot token not found in .env!')

interface ClientWithCommands extends Client {
    commands: Collection<string, any>;
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] }) as ClientWithCommands;

client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.commands = new Collection();



const foldersPath = path.join(__dirname, 'commands');

function loadCommandsFrom(folderPath: string) {
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));

    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        import(filePath).then((commandModule => {
            const command = commandModule.default ?? commandModule;
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }));

        
    }
}

const entries = fs.readdirSync(foldersPath, { withFileTypes: true });

// Load files in root of "commands"
loadCommandsFrom(foldersPath);

// Load files in subfolders of "commands"
for (const entry of entries) {
    if (entry.isDirectory()) {
        const subFolderPath = path.join(foldersPath, entry.name);
        loadCommandsFrom(subFolderPath);
    }
}

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction as ChatInputCommandInteraction);
    }
    catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
        }
        else {
            await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
        }
    }
});

client.login(token);
