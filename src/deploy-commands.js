// source: https://discordjs.guide/creating-your-bot/command-deployment.html#guild-commands
const { REST, Routes } = require('discord.js');
const clientId = process.env.CLIENT_ID;
const token = process.env.TOKEN;
const fs = require('node:fs');
const path = require('node:path');

const commands = [];
const foldersPath = path.join(__dirname, 'commands');

function loadCommandsToArray(folderPath) {
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);

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
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    }
    catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }
})();
