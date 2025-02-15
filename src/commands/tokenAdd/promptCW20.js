module.exports = {
  promptCW20: {
    deferReply: false, // Required for type modal
    getConfig: async (state) => {
      // See which button they pressed and update the state appropriatley
      const selectedOption = state.interactionTarget.customId;
      state.selectedOption = selectedOption;
      state.tokenType = 'cw20'

      return {
        next: 'createTokenRule',
        prompt: {
          type: 'modal',
          title: `Configure ${selectedOption} Token Rule`,
          inputs: [
            {
              label: selectedOption === 'CW20' ? 'Token Address' : 'DAO DAO URL',
              placeholder: selectedOption === 'CW20' ?
                'Please enter the CW20 token address' :
                "Paste your DAO DAO URL and we'll take care of the rest!",
              id: 'token-address',
              required: true,
            },
            {
              label: 'Role Name',
              placeholder: 'Please enter the name of the role that should created',
              id: 'role-name',
              required: true,
            },
            {
              label: 'Token Amount',
              placeholder: 'Please enter the number of tokens a user must have to get a special role',
              id: 'token-amount',
              required: true,
            }
          ]
        }
      }
    }
  }
}
