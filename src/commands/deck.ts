import { SlashCommandBuilder, ChatInputCommandInteraction, ButtonInteraction, ButtonBuilder, ButtonStyle, ActionRowBuilder, DMChannel, NewsChannel, TextChannel, ModalBuilder, TextInputBuilder, TextInputStyle, Interaction, Message, MessageFlags, ModalSubmitInteraction } from 'discord.js';
import { getCardImage, toTitleCase } from '../utils/helpers';
import { addDeckSession, getAllDeckSessions, getDeckSession } from '../lib/deckSessions';
import { DeckSession } from '../types';

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
            } as DeckSession
            addDeckSession(deckSession);
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


        // initial reply
        await interaction.reply('Your deck has been shuffled! I will now show you your first 4 cards, ' + 
            'and you may choose to re-draw each one, or not.');

        // hand out starting cards and allow re-drawing
        for (let i = 0; i < 4; i++) {
            await sendCardMessage(deckSession, logName, ['redraw'], i)
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
    },

    async createInteraction(interaction: Interaction) {
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
            case 'redraw':
                if (!interaction.isButton()) return;

                const i = parseInt(variables); // this action should only have one variable: card index
                await redrawCard(deckSession, logName, i, interaction as ButtonInteraction);
                break;

            case 'choosefifth':
                if (!interaction.isButton()) return;

                // remove message requesting the user to press continue
                await askForFifthCard(interaction, userId);
                interaction.deleteReply();
                break;

            case 'modalfifth':
                if (!interaction.isModalSubmit()) return;

                handleFifthCard(interaction, deckSession, logName);
                break;
        }
    },
};

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
        hand.forEach(async ({ card, message }, index) => {
            await message.edit({
                components: [
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(new ButtonBuilder()
                            .setCustomId(`deck:play:${userId}:${index}`)
                            .setLabel(`Play ${card}`)
                            .setStyle(ButtonStyle.Success)
                        )
                ]
            });
        });

        await sendCardMessage(deckSession, logName, ['play'], 4, card); // fixed index of 4; this should ALWAYS be the 5th card

        // discord requires either a reply or to delete the thinking message to the modal interaction to close it
        await interaction.deleteReply().catch(() => {});
    }
}

async function askForFifthCard(interaction: ButtonInteraction, userId: string) {
    await interaction.showModal(new ModalBuilder()
        .setCustomId(`deck:modalfifth:${userId}`)
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

    const cardImg = await getCardImage(card);

    await interaction.update({
        content: cardImg ? '' : card,
        files: cardImg ? [cardImg] : [],
        components: [], // remove button by setting empty array
    })

    console.log(`${logName} Redraw Card #${i + 1} (Old: ${oldCard} | New: ${card})`)
}

async function sendCardMessage(deckSession: DeckSession, logName: string, buttons: string[], index: number, card: string | null = null) {
    const userId = deckSession.userId;
    const deck = deckSession.deck;
    const hand = deckSession.hand;
    const channel = deckSession.channel;
    if (!channel) {
        return console.log(`ERROR: ${logName} Draw Card attempted but no channel was supplied`)
    }

    if (!card) {
        if (deck.length == 0) {
            console.log(`${logName} Draw Card attempted but deck is empty`)
            return;
        }
        // pull card from deck
        card = deck.shift()!;
    }

    // if card is already supplied, then assume that deck handling has already been done
    // this allows this function to be used to add cards to hand in specific instances where
    // the card to be added does not exist in the deck currently

    if (deckSession.hand.length == 10) {
        return console.log(`${logName} Draw Card attempted but hand already has 10 cards`);
    }

    const cardImg = await getCardImage(card);

    const components = buttons.map(b => new ButtonBuilder()
        .setCustomId(`deck:${b}:${userId}:${index}`)
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
    hand.push({ card, message });

    console.log(`${logName} Draw Card: ${card}`)
}
