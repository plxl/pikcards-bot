import { SlashCommandBuilder, ChatInputCommandInteraction, ComponentType, ButtonInteraction, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageCreateOptions, DMChannel, NewsChannel, TextChannel, InteractionUpdateOptions, ModalBuilder, TextInputBuilder, TextInputStyle, Interaction, Message, MessageFlags } from 'discord.js';
import path from 'path';
import fs from 'fs';

interface CardWithMessage {
    card: string,
    message: Message,
}

interface DeckSession {
    userId: string;
    channel: TextChannel | DMChannel | NewsChannel | null;
    deck: string[];
    hand: CardWithMessage[];
}

const DECK_FILE = path.join(process.cwd(), 'storage', 'deck-sessions.json');
let deckSessions: DeckSession[] | null;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deck')
        .setDescription('Sets up an interactable Pikcards deck.')
        .addStringOption(option =>
            option.setName('cards')
                .setDescription('The cards in the deck, separated by commas.')
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        const userId = interaction.user.id;
        const username = interaction.user.username;


        // check if there is a previous deckSessions to load, if not, creates one
        if (!deckSessions) {
            try {
                // use synchronous to avoid race condition with others using same command simultaneously
                // this should only happen once when the bot first starts anyway
                if (!fs.existsSync(DECK_FILE)) {
                    throw new Error('deck_sessions_missing');
                }
                const rawData = fs.readFileSync(DECK_FILE, 'utf-8');
                deckSessions = JSON.parse(rawData);
                console.log(`Loaded ${deckSessions?.length} deck sessions from "${DECK_FILE}"`)
            }
            catch (err: any) {
                if (err.message == 'deck_sessions_missing') {
                    // deck-sessions.json didn't exist
                    console.log('Previous deck-sessions.json was not found, starting with empty array');
                }
                else if (err instanceof SyntaxError) {
                    // JSON parsing likely failed
                    console.error('deck-sessions.json is malformed, starting with empty array');
                }
                else {
                    // any other potential errors
                    console.error('Failed to load deck-sessions.json:', err);
                    console.log('Due to above error with deck-sessions.json, starting with empty array');
                }
                deckSessions = [];
            }
        }


        // get the channel the command was used in
        const fetchedChannel = interaction.channel
            ?? await interaction.client.channels
                .fetch(interaction.channelId)
                .catch(() => null);
        
        if (!fetchedChannel || !fetchedChannel.isTextBased()) {
            return interaction.reply({
                content: 'ERROR: I may be lacking View Channel or similar permissions.',
                flags: MessageFlags.Ephemeral });
        }
        const channel = fetchedChannel as TextChannel | DMChannel | NewsChannel;


        // check if the user has an existing session, if not, create one
        let deckSession = deckSessions!.find(session => session.userId == userId);
        if (deckSession) {
            console.log(`Restoring deck session for @${username} [${userId}]`);
            // TODO: Restore deck from json in the event of a bot crash
        }
        else {
            console.log(`No deck session found for @${username} [${userId}]... creating one now`);
            deckSession = {
                userId,
                channel,
                deck: [],
                hand: [],
            } as DeckSession
            deckSessions!.push(deckSession);
        }


        // TODO: switch to option string instead of default deck for testing
        // let input = interaction.options.getString('cards', true)
        let deckInput = 'Red Pikmin, Red Pikmin, Red Pikmin, Red Pikmin, Red Onion, Red Onion, Yellow Pikmin, Yellow Pikmin, Yellow Pikmin, Yellow Pikmin, Yellow Onion, Yellow Onion, Doodlebug, Doodlebug, Doodlebug, Doodlebug, Bulborb Larva, Bulborb Larva, Bulborb Larva, Bulborb Larva, Burrowing Snagret, Burrowing Snagret, Burrowing Snagret, Burrowing Snagret, Sovereign Bulblax, Sovereign Bulblax, Sovereign Bulblax, Sovereign Bulblax, Stellar Orb, Stellar Orb, Stellar Orb, Stellar Orb, Bulblax Kingdom, Bulblax Kingdom, Bulblax Kingdom, Bulblax Kingdom, Sagittarius, Sagittarius, Survival Series, Survival Series'
            .toLowerCase()
            .split(',')
            .map(s => s.trim());
        if (deckInput.length != 40) {
            return interaction.reply(`A deck needs exactly 40 cards, counted ${deckInput.length} cards.`);
        }

        // shuffle the deck
        deckSession.deck = [...deckInput].sort(() => Math.random() - 0.5);

        // define local references
        const deck = deckSession.deck;
        const hand = deckSession.hand;

        // initial reply
        await interaction.reply('Your deck has been shuffled! I will now show you your first 4 cards, ' + 
            'and you may choose to re-draw each one, or not.');

        // hand out starting cards and allow re-drawing
        // const startingCards: string[] = [];
        // const collectors: any[] = [];
        // const handMsgs: any[] = [];
        for (let i = 0; i < 4; i++) {
            const card = deck.shift()!;

            const btnRedraw = new ButtonBuilder()
                .setCustomId(`redraw_${i}`)
                .setLabel(`Redraw ${card}`)
                .setStyle(ButtonStyle.Danger)

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(btnRedraw);

            const cardImg = getCardImage(card);

            const cardMsgContent: MessageCreateOptions = cardImg
                ? { components: [row], files: [cardImg] }
                : { components: [row], content: card };

            const message = await channel.send(cardMsgContent);
            hand.push({ card, message });

            const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button });

            collector.on('collect', async (btnInteraction: ButtonInteraction) => {
                if (btnInteraction.user.id !== interaction.user.id) {
                    return btnInteraction.reply({ content: "These buttons aren't for you!", ephemeral: true });
                }

                if (btnInteraction.customId == `redraw_${i}`) {
                    const redrawnCard = deck.shift()!;
                    // old card must be reinserted to the deck at a random position that is at least 10 cards from the top
                    const reinsertIndex = Math.floor(Math.random() * (deck.length - 10)) + 10;

                    deck.splice(reinsertIndex, 0, hand[i].card);
                    hand[i].card = redrawnCard;

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
                // collectors.forEach(collector => {
                //     if (collector && !collector.ended) collector.stop();
                // })
                hand.forEach(({ message }) => {
                    message.edit({
                        components: [],
                    })
                })

                const retryModal = new ModalBuilder()
                    .setCustomId('deck_modal_fifth')
                    .setTitle('Pikcards')
                    .addComponents(
                        new ActionRowBuilder<TextInputBuilder>().addComponents(
                            new TextInputBuilder()
                                .setCustomId('txt_fifth')
                                .setLabel('Select your Fifth Card from your deck:')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true),
                        ),
                    );

                await btnInteraction.showModal(retryModal);
                await btnInteraction.deleteReply();
            }
        });
    },

    async createInteraction(interaction: Interaction) {
        if (interaction.isModalSubmit()) {
            if (interaction.customId == 'deck_modal_fifth') {
                const deckSession = deckSessions?.find(deckSession => deckSession.userId == interaction.user.id);
                if (!deckSession) return;
                const card = interaction.fields.getTextInputValue('txt_fifth')?.toLowerCase().trim();
                const cardImg = getCardImage(card);
                await deckSession.channel?.send(cardImg
                    ? { components: [], files: [cardImg] }
                    : { components: [], content: card });
            }
        }
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
