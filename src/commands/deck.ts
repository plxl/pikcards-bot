import { SlashCommandBuilder, ChatInputCommandInteraction, ComponentType, ButtonInteraction, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageCreateOptions, DMChannel, NewsChannel, TextChannel, InteractionUpdateOptions } from 'discord.js';
import path from 'path';
import fs from 'fs';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deck')
        .setDescription('Sets up an interactable Pikcards deck.')
        .addStringOption(option =>
            option.setName('cards')
                .setDescription('The cards in the deck, separated by commas.')
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        const response = interaction.options.getString('cards', true).toLowerCase();
        let cards = response.split(',').map(s => s.trim());
        if (cards.length != 40) {
            await interaction.reply(`A deck needs exactly 40 cards, counted ${cards.length}`);
            return;
        }

        // get the channel to send images in
        // so not everything is a followup
        let channel = interaction.channel as TextChannel | DMChannel | NewsChannel | null;
        if (!channel) {
            const fetched = await interaction.client.channels.fetch(interaction.channelId);
            if (fetched?.isTextBased()) {
                channel = fetched as TextChannel | DMChannel | NewsChannel;
            }
            if (!channel) {
                await interaction.reply('I may be lacking permissions to read/send in this text channel.');
                return;
            }
        }

        // shuffle the deck
        cards = [...cards].sort(() => Math.random() - 0.5);
        await interaction.reply('Your deck has been shuffled! I will now show you your first 4 cards, ' + 
            'and you may choose to re-draw each one, or not.');

        // hand out starting cards and allow re-drawing
        const startingCards: string[] = [];
        const collectors: any[] = [];
        const handMsgs: any[] = [];
        for (let i = 0; i < 4; i++) {
            const card = cards.shift()!;
            startingCards.push(card);

            const btnRedraw = new ButtonBuilder()
                .setCustomId(`redraw_${i}`)
                .setLabel(`Redraw ${card}`)
                .setStyle(ButtonStyle.Danger)

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(btnRedraw);

            const cardImg = getCardImage(card);

            const cardMsgContent: MessageCreateOptions = cardImg
                ? { components: [row], files: [cardImg] }
                : { components: [row], content: card };

            const cardMsg = await channel.send(cardMsgContent);
            handMsgs.push(cardMsg);

            const collector = cardMsg.createMessageComponentCollector({ componentType: ComponentType.Button });
            collectors.push(collector);

            collector.on('collect', async (btnInteraction: ButtonInteraction) => {
                if (btnInteraction.user.id !== interaction.user.id) {
                    return btnInteraction.reply({ content: "These buttons aren't for you!", ephemeral: true });
                }

                if (btnInteraction.customId == `redraw_${i}`) {
                    const redrawnCard = cards.shift()!;
                    // old card must be reinserted to the deck at a random position that is at least 10 cards from the top
                    const reinsertIndex = Math.floor(Math.random() * (cards.length - 10)) + 10;

                    cards.splice(reinsertIndex, 0, startingCards[i]);
                    startingCards[i] = redrawnCard;

                    const redrawnCardImg = getCardImage(redrawnCard);
                    
                    const redrawnCardMsgContent: InteractionUpdateOptions = redrawnCardImg
                        ? { components: [], files: [redrawnCardImg] }
                        : { components: [], content: redrawnCard };

                    btnInteraction.update(redrawnCardMsgContent)
                }
            });
        }

        const btnContinue = new ButtonBuilder()
                .setCustomId('continue')
                .setLabel('Continue')
                .setStyle(ButtonStyle.Success)
        const rowContinue = new ActionRowBuilder<ButtonBuilder>().addComponents(btnContinue);

        const continueMsg = await interaction.followUp({
            content: 'Let me know when you\'re ready for your fifth card.',
            components: [rowContinue]
        })

        const collector = continueMsg.createMessageComponentCollector({ componentType: ComponentType.Button });
        collector.on('collect', async (btnInteraction: ButtonInteraction) => {
            if (btnInteraction.user.id !== interaction.user.id) {
                return btnInteraction.reply({ content: "These buttons aren't for you!", ephemeral: true });
            }

            if (btnInteraction.customId == 'continue') {
                collectors.forEach(collector => {
                    if (collector && !collector.ended) collector.stop();
                })
                handMsgs.forEach(msg => {
                    msg.edit({
                        components: [],
                    })
                })
            }
        });
    },
};

function getCardImage(name: string): string | null {
    // replace whitespace with _
    const fileName = name.trim().replace(/\s+/g, '_').toLowerCase();
    const assetsDir = path.join(process.cwd(), 'assets', 'card_images');
    return findPngFileRecursive(assetsDir, fileName);
}

function findPngFileRecursive(dir: string, target: string): string | null {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            const result = findPngFileRecursive(fullPath, target);
            if (result) return result;
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith(`${target}.png`)) {
            return fullPath;
        }
    }

    return null;
}
