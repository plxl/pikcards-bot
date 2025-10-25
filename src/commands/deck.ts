import { SlashCommandBuilder, ChatInputCommandInteraction, ButtonInteraction, ButtonBuilder, ButtonStyle, ActionRowBuilder, DMChannel, NewsChannel, TextChannel, ModalBuilder, TextInputBuilder, TextInputStyle, Interaction, MessageFlags, ModalSubmitInteraction } from 'discord.js';
import { getCardImage, toTitleCase } from '../utils/helpers';
import { cardFinder } from '../utils/CardFinder';
import { addDeckSession, getDeckSession } from '../lib/deckSessions';
import { DeckSession } from '../types';
import { v4 as uuidv4 } from "uuid";

export const data = new SlashCommandBuilder()
    .setName('deck')
    .setDescription('Sets up an interactable Pikcards deck.')
    .addStringOption(option =>
        option.setName('cards')
            .setDescription('The cards in the deck, separated by commas.')
            .setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const username = interaction.user.username;
    const logName = `[@${username} | ${userId}]`;

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
    let deckSession = getDeckSession(userId);
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
            flags: [],
        } as DeckSession
        addDeckSession(deckSession);
    }

    // TODO: switch to option string instead of default deck for testing
    let inputCards = interaction.options.getString('cards', true);
    if (inputCards == "test")
        inputCards = 'Red Pikmin, Red Pikmin, Red Pikmin, Red Pikmin, Red Onion, Red Onion, Yellow Pikmin, Yellow Pikmin, Yellow Pikmin, Yellow Pikmin, Yellow Onion, Yellow Onion, Doodlebug, Doodlebug, Doodlebug, Doodlebug, Bulborb Larva, Bulborb Larva, Bulborb Larva, Bulborb Larva, Burrowing Snagret, Burrowing Snagret, Burrowing Snagret, Burrowing Snagret, Sovereign Bulblax, Sovereign Bulblax, Sovereign Bulblax, Sovereign Bulblax, Stellar Orb, Stellar Orb, Stellar Orb, Stellar Orb, Bulblax Kingdom, Bulblax Kingdom, Bulblax Kingdom, Bulblax Kingdom, Sagittarius, Sagittarius, Survival Series, Survival Series'
    
    const deckInput = inputCards
        .toLowerCase()
        .split(',')
        .map(s => s.trim());
    if (deckInput.length != 40) {
        if (deckInput.length == 1 && deckInput[0] == "test")

        console.log(`${logName} Deck had ${deckInput.length} entries when 40 were expected`)
        return interaction.reply(`A deck needs exactly 40 cards, counted ${deckInput.length} cards.`);
    }

    // shuffle the deck
    deckSession.deck = [...deckInput].sort(() => Math.random() - 0.5);
    console.log(`${logName} Deck Shuffled:\n${deckSession.deck}\n---`)


    // initial reply
    await interaction.reply('Your deck has been shuffled! I will now show you your first 4 cards, ' + 
        'and you may choose to re-draw each one, or not.');

    // hand out starting cards and allow re-drawing
    for (let i = 0; i < 4; i++) {
        await sendCardMessage(deckSession, logName, ['redraw'], uuidv4())
    }

    // wait for user to press continue and the rest is handled in createInteraction()
    interaction.followUp({
        content: 'Let me know when you\'re ready to choose your 5th card.',
        components: [
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(new ButtonBuilder()
                    .setCustomId(`deck:choosefifth:${userId}`)
                    .setLabel('Choose Card #5')
                    .setStyle(ButtonStyle.Success)
                )
            ],
    });
}

export async function createInteraction(interaction: Interaction) {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    // format of customId's: <commandName>:<action>:<userId>:variables_by_underscore
    const [commandName, action, userId, variables] = interaction.customId.split(':');
    if (commandName !== 'deck') return;

    if (userId && userId !== interaction.user.id) {
        return interaction.reply({ content: 'This button is not for you!', flags: MessageFlags.Ephemeral });
    }

    const username = interaction.user.username;
    const logName = `[@${username} | ${userId}]`;
    const deckSession = getDeckSession(interaction.user.id);

    if (!deckSession) {
        console.log(`ERROR: ${logName} Button was made for this user, but could not find their deck session!`)
        return interaction.reply({
            content: `An unknown error occurred and your deck session was not found.`,
            flags: MessageFlags.Ephemeral });
    }

    switch (action) {
        case 'redraw': {
            if (!interaction.isButton()) return;

            const cardId = variables;

            await redrawCard(deckSession, logName, cardId, interaction as ButtonInteraction);
            break; }

        case 'choosefifth': {
            if (!interaction.isButton()) return;

            await askForFifthCard(interaction, userId);
            break; }

        case 'modalfifth': {
            if (!interaction.isModalSubmit()) return;

            // attempt to fetch and remove the message that initially opened the modal
            const prevMessageId = variables;
            const channel = deckSession.channel;

            try {
                const message = await channel?.messages.fetch({
                    message: prevMessageId,
                    cache: true,
                });
            
                if (!message) {
                    console.warn(`${logName}: Failed to fetch message for 5th card modal (ID: ${prevMessageId})`);
                } else {
                    await message.delete();
                }
            } catch (err) {
                console.error(`${logName}: Error fetching or deleting message (ID: ${prevMessageId})`, err);
            }

            handleFifthCard(interaction, deckSession, logName);
            break; }

            case 'play': {
                if (!interaction.isButton()) return;

                // discord requires some form of "reply" so we send a "defer update" before deleting
                await interaction.deferUpdate();

                const hand = deckSession.hand;
                const cardId = variables;

                // get card index in hand from id
                const i = hand.findIndex(cwm => cwm.id == cardId);
                if (i == -1) {
                    return console.log(`ERROR: ${logName} Play Card attempted with invalid card ID {${cardId}}\nHand:\n${hand}---`)
                }

                // delete message and remove card from hand
                const message = hand[i].message;
                if (message.id !== interaction.message.id) {
                    console.log(`WARNING: ${logName} Interaction Message ID !== stored card Message ID:\n` +
                        `Interaction MID: ${interaction.message.id} | Card Stored MID: ${message.id}`);
                }

                await interaction.message.delete();
                hand.splice(i, 1);

                break; }
    }
}

async function handleFifthCard(interaction: ModalSubmitInteraction, deckSession: DeckSession, logName: string) {
    const userId = deckSession.userId;
    const deck = deckSession.deck;
    const hand = deckSession.hand;
    const card = interaction.fields
        .getTextInputValue(`deck:txtfifth:${userId}`)
        .toLowerCase()
        .trim();

    const cardInDeck = deck.indexOf(card);
    if (cardInDeck == -1) {
        console.log(`${logName} Draw 5th: Could not find '${card}' in deck`);
        await interaction.reply({
            content: `The card \`${card}\` was not found in your deck, please try again.`,
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(new ButtonBuilder()
                        .setCustomId(`deck:choosefifth:${userId}`)
                        .setLabel('Choose Card #5')
                        .setStyle(ButtonStyle.Success)
                    )
            ],
        })
    }
    else {
        // must defer reply because editing all previous messages may takes more than 3 seconds allowed by discord
        // must also specify if it will be ephemeral now as it cannot be done later
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // remove chosen card from deck
        deck.splice(cardInDeck, 1);

        // set all previous cards to also use the play button now
        console.log(`${logName} Updating starting hand to show Play buttons...`)
        hand.forEach(async ({ id, card, message }) => {
            await message.edit({
                components: [
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(new ButtonBuilder()
                            .setCustomId(`deck:play:${userId}:${id}`)
                            .setLabel(`Play ${card}`)
                            .setStyle(ButtonStyle.Success)
                        )
                ]
            });
        });

        await sendCardMessage(deckSession, logName, ['play'], uuidv4(), card);
        
        // update flags
        deckSession.flags.push('fifth_drawn');

        // discord requires either a reply or to delete the thinking message to the modal interaction to close it
        await interaction.deleteReply().catch(() => {});
        await interaction.followUp({
            content: 'You\'re all set! Type /draw to get your next card at the start of your turn.',
            flags: MessageFlags.Ephemeral,
        });
    }
}

async function askForFifthCard(interaction: ButtonInteraction, userId: string) {
    await interaction.showModal(new ModalBuilder()
        .setCustomId(`deck:modalfifth:${userId}:${interaction.message.id}`)
        .setTitle('Pikcards')
        .addComponents(new ActionRowBuilder<TextInputBuilder>()
            .addComponents(new TextInputBuilder()
                .setCustomId(`deck:txtfifth:${userId}`)
                .setLabel('Select your Fifth Card from your deck:')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            )
        )
    );
}

async function redrawCard(deckSession: DeckSession, logName: string, id: string, interaction: ButtonInteraction) {
    const deck = deckSession.deck;
    const hand = deckSession.hand;

    // draw new card first
    const card = deck.shift()!;

    // old card must be reinserted to the deck at a random position that is at least 10 cards from the top
    const reinsertIndex = Math.floor(Math.random() * (deck.length - 10)) + 10;

    // get card index in hand from id
    const i = hand.findIndex(cwm => cwm.id == id);
    if (i == -1) {
        return console.log(`ERROR: ${logName} Re-draw Card attempted with invalid card ID {${id}}\nHand:\n${hand}---`)
    }

    // insert card from hand into deck and update that hand's card name to the redrawn
    deck.splice(reinsertIndex, 0, hand[i].card);
    const oldCard = hand[i].card; // for logging
    hand[i].card = card;

    const cardImg = cardFinder.find(card);

    await interaction.update({
        content: cardImg ? '' : card,
        files: cardImg ? [cardImg] : [],
        components: [], // remove button by setting empty array
    })

    console.log(`${logName} Redraw Card #${i + 1} (Old: ${oldCard} | New: ${card})`)
}

export async function sendCardMessage(deckSession: DeckSession, logName: string, buttons: string[], id: string, card: string | null = null): Promise<string | void> {
    const userId = deckSession.userId;
    const deck = deckSession.deck;
    const hand = deckSession.hand;
    const channel = deckSession.channel;
    if (!channel) {
        console.log(`ERROR: ${logName} Draw Card attempted but no channel was supplied`)
        return 'channel_null';
    }

    if (!card) {
        if (deck.length == 0) {
            console.log(`${logName} Draw Card attempted but deck is empty`)
            return 'deck_empty';
        }
        // pull card from deck
        card = deck.shift()!;
    }

    // if card is already supplied, then assume that deck handling has already been done
    // this allows this function to be used to add cards to hand in specific instances where
    // the card to be added does not exist in the deck currently

    if (deckSession.hand.length == 10) {
        console.log(`${logName} Draw Card attempted but hand already has 10 cards`);
        return 'hand_full';
    }

    const cardImg = cardFinder.find(card);

    const components = buttons.map(b => new ButtonBuilder()
        .setCustomId(`deck:${b}:${userId}:${id}`)
        .setLabel(`${toTitleCase(b)} ${card}`)
        .setStyle(b == 'redraw' ? ButtonStyle.Danger : ButtonStyle.Success)
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
    hand.push({ id, card, message });

    console.log(`${logName} Draw Card: ${card}`)
}
