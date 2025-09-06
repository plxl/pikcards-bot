const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reloads a command.')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('The command to reload.')
                .setRequired(true)),
    async execute(interaction) {
        if (interaction.user.id !== process.env.DEV_USER_ID) return;
        const commandName = interaction.options.getString('command', true).toLowerCase();
        let commandFile = path.join(__dirname, commandName + '.js');
        try {
            await fs.access(commandFile, fs.constants.F_OK);
        }
        catch {
            commandFile = commandFile.substring(0, commandFile.length - 2) + 'ts';
        }

        try {
            // make sure command file exists
            await fs.access(commandFile, fs.constants.F_OK);
            // remove from cache so it can be forcefully reloaded
            delete require.cache[require.resolve(commandFile)];
            const newCommand = require(commandFile);
            interaction.client.commands.set(newCommand.data.name, newCommand);
            await interaction.reply(`Command \`${newCommand.data.name}\` was reloaded!`);
        } catch (error) {
            console.error(error);
            await interaction.reply(`There was an error while reloading command \`${commandName}\`.`);
        }
    },
};
