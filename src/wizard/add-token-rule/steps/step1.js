const { CosmWasmClient } = require("@cosmjs/cosmwasm-stargate");
const TESTNET_RPC_ENDPOINT = process.env.TESTNET_RPC_ENDPOINT || 'https://rpc.uni.juno.deuslabs.fi/'
const MAINNET_RPC_ENDPOINT = process.env.MAINNET_RPC_ENDPOINT || 'https://rpc-juno.itastakers.com/'

const { WizardStep } = require("../../wizard")
const { createAddTokenEmbed } = require("../script")
const { checkForCW20, checkForDAODAODAO } = require("../../../token")

const optionSteps = [
  {
    optionName: 'hasCW20',
    emoji: '🌠',
  },
  {
    optionName: 'needsCW20',
    emoji: '✨',
  },
  {
    optionName: 'daoDao',
    emoji: '☯️',
  }
];

function createStep1(userId, parentWizard) {
  let step = new WizardStep(
    parentWizard,
    'reaction',
    null,
    async({ interaction }, ...extra) => {
      const msg = await interaction.reply(
        { embeds: [ createAddTokenEmbed('step1BeginFn') ],
          fetchReply: true
        }
      )
      try {
        await Promise.all(optionSteps.map(option => msg.react(option.emoji)));
      } catch (error) {
        console.error('One of the emojis failed to react:', error);
      }
      return msg
    },
    //,
    async({ interaction }, ...extra) => {
      if (extra.length === 0) {
        console.error('Expected an emojiName field in extra args');
        return;
      }
      const emojiName = extra[0];
      const selectedOption = optionSteps.find(option => option.emoji === emojiName);

      if (selectedOption) {
        parentWizard.currentStep = parentWizard.steps[0]['optionSteps'][selectedOption.optionName]
        parentWizard.currentStep.beginFn({ interaction: null })
      }
      else {
        console.warn('User did not pick an applicable emoji')
      }
    }
  )

  const handleCW20Entry = async ({interaction}, ...extra) => {
    // We may modify this, but for now we're just dealing with text inputs
    if (parentWizard.currentStep.interactionType !== 'text') return;

    // Check to see if they pasted a DAODAO URL like this:
    // https://daodao.zone/dao/juno129spsp500mjpx7eut9p08s0jla9wmsen2g8nnjk3wmvwgc83srqq85awld
    let network = 'mainnet'
    let cw20Input, tokenInfo, cosmClient, daoInfo
    if (interaction.content.startsWith('https://daodao.zone')) {
      cosmClient = await CosmWasmClient.connect(MAINNET_RPC_ENDPOINT)
      daoInfo = await checkForDAODAODAO(cosmClient, interaction.content, true)
      if (daoInfo === false) {
        network = 'testnet'
        cosmClient = await CosmWasmClient.connect(TESTNET_RPC_ENDPOINT)
        daoInfo = await checkForDAODAODAO(cosmClient, interaction.content, false)
      }

      // If there isn't a governance token associated with this DAO, fail with message
      if (!daoInfo || !daoInfo.hasOwnProperty('gov_token')) {
        return await parentWizard.failure("We couldn't find any governance token associated with your DAO :/\nPerhaps destroyed in a supernova?")
      }
      cw20Input = daoInfo['gov_token']
      // Now that we have the cw20 token address and network, get the info we want
      tokenInfo = await checkForCW20(cosmClient, cw20Input, false)
    } else {
      // Check user's cw20 token for existence on mainnet then testnet
      cw20Input = interaction.content;
      cosmClient = await CosmWasmClient.connect(MAINNET_RPC_ENDPOINT)
      tokenInfo = await checkForCW20(cosmClient, cw20Input, true)
      if (tokenInfo === false) {
        // Nothing was found on mainnet, try testnet
        network = 'testnet'
        cosmClient = await CosmWasmClient.connect(TESTNET_RPC_ENDPOINT)
        tokenInfo = await checkForCW20(cosmClient, cw20Input, false)
      }
    }

    // If there were an error it would have returned a failure.
    // At this point we have the network and token info
    console.log('tokenInfo for user input', tokenInfo)

    parentWizard.state.cw20 = cw20Input
    parentWizard.state.network = network
    parentWizard.state.tokenSymbol = tokenInfo.symbol
    // Move to step 2
    parentWizard.currentStep = parentWizard.steps[1]
    parentWizard.currentStep.beginFn({ interaction: null })
  }

  // add options to that step
  optionSteps.forEach(({ optionName }) => {
      step.addOptionStep(optionName, new WizardStep(
        parentWizard,
        'text',
        null,
        async({ interaction }, ...extra) => {
            let guild = await step.parentWizard.client.guilds.fetch(parentWizard.guildId)
            let channel = await guild.channels.fetch(parentWizard.channelId);
            await channel.send({
                embeds: [ createAddTokenEmbed(optionName) ]
            });
        },
        handleCW20Entry
      ));
  })

  return step
}

module.exports = {
    createStep1,
}
