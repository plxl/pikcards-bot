const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    async execute(interaction) {
        const latency = interaction.client.ws.ping;
        if (latency == -1) await interaction.reply('Pong! Discord hasn\'t measured my ping yet, try again later.');
        else await interaction.reply(`Pong! Latency: ${latency}ms`);
    },
};
