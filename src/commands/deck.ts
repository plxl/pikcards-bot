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
        const logName = `[@${username} | ${userId}]`;


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
            console.log(`ERROR: ${logName} Failed to get fetch channel with ID ${interaction.channelId}`)
            return interaction.reply({
                content: 'ERROR: I may be lacking View Channel or similar permissions.',
                flags: MessageFlags.Ephemeral });
        }
        const channel = fetchedChannel as TextChannel | DMChannel | NewsChannel;


        // check if the user has an existing session, if not, create one
        let deckSession = deckSessions!.find(session => session.userId == userId);
        if (deckSession) {
            console.log(`${logName} Restoring deck session`);
            // TODO: Restore deck from json in the event of a bot crash
        }
        else {
            console.log(`${logName} No deck session found... creating one now`);
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
            console.log(`${logName} Deck had ${deckInput.length} entries when 40 were expected`)
            return interaction.reply(`A deck needs exactly 40 cards, counted ${deckInput.length} cards.`);
        }

        // shuffle the deck
        deckSession.deck = [...deckInput].sort(() => Math.random() - 0.5);
        console.log(`${logName} Deck Shuffled:\n${deckSession.deck}\n---`)

        // define local references
        const deck = deckSession.deck;
        const hand = deckSession.hand;

        // initial reply
        await interaction.reply('Your deck has been shuffled! I will now show you your first 4 cards, ' + 
            'and you may choose to re-draw each one, or not.');

        // hand out starting cards and allow re-drawing
        for (let i = 0; i < 4; i++) {
            await sendCardMessage(deckSession, logName, ['redraw'], i)
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
        if (interaction.isButton()) {
            // format of customId's: <commandName>:<action>:<userId>:variables_by_underscore
            const [commandName, action, userId, variables] = interaction.customId.split(':');
            if (commandName !== 'deck') return;

            if (userId && userId !== interaction.user.id) {
                return interaction.reply({ content: 'This button is not for you!', flags: MessageFlags.Ephemeral });
            }

            switch (action) {
                case 'redraw':
                    const username = interaction.user.username;
                    const logName = `[@${username} | ${userId}]`;

                    const deckSession = deckSessions?.find(deckSession => deckSession.userId == interaction.user.id);
                    if (!deckSession) {
                        console.log(`ERROR: ${logName} Button was made for this user, but could not find their deck session!`)
                        return interaction.reply({
                            content: `An unknown error occurred and your deck session was not found.`,
                            flags: MessageFlags.Ephemeral });
                    }

                    const i = parseInt(variables); // this action should only have one variable: card index

                    await redrawCard(deckSession, logName, i, interaction);

                    break;
            }
        }

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

async function redrawCard(deckSession: DeckSession, logName: string, i: number, interaction: ButtonInteraction) {
    const deck = deckSession.deck;
    const hand = deckSession.hand;

    // draw new card first
    const card = deck.shift()!;

    // old card must be reinserted to the deck at a random position that is at least 10 cards from the top
    const reinsertIndex = Math.floor(Math.random() * (deck.length - 10)) + 10;

    // insert card from hand into deck and update that hand's card name to the redrawn
    deck.splice(reinsertIndex, 0, hand[i].card);
    const oldCard = hand[i].card; // for logging
    hand[i].card = card;

    const cardImg = getCardImage(card);

    await interaction.update({
        content: cardImg ? '' : card,
        files: cardImg ? [cardImg] : [],
        components: [], // remove button by setting empty array
    })

    console.log(`${logName} Redraw Card #${i + 1} (Old: ${oldCard} | New: ${card})`)
}

async function sendCardMessage(deckSession: DeckSession, logName: string, buttons: string[], index: number) {
    const userId = deckSession.userId;
    const deck = deckSession.deck;
    const hand = deckSession.hand;
    const channel = deckSession.channel;
    if (!channel) {
        return console.log(`ERROR: ${logName} Draw Card attempted but no channel was supplied`)
    }

    // pull card from deck
    const card = deck.shift()!;

    const cardImg = getCardImage(card);

    const components = buttons.map(b => new ButtonBuilder()
        .setCustomId(`deck:${b}:${userId}:${index}`)
        .setLabel(`${toTitleCase(b)} ${card}`)
        .setStyle(b == 'redraw' ? ButtonStyle.Danger : ButtonStyle.Primary)
    );

    const message = await channel.send({
        content: cardImg ? '' : card,
        files: cardImg ? [cardImg] : [],
        components: components.length > 0 ? [
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(...components)
        ] : [],
    })

    // place card in hand with message
    hand.push({ card, message });

    console.log(`${logName} Draw Card: ${card}`)
}

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

function toTitleCase(s: string) {
    return s.replace(
        /\w\S*/g,
        text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
    );
}
