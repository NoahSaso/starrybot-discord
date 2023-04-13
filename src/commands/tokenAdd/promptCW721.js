module.exports = {
  promptCW721: {
    deferReply: false, // Required for type modal
    stateOnEnter: {
      tokenType: "cw721",
      decimals: 0,
    },
    getConfig: async (state) => {
      // See which button they pressed and update the state appropriatley
      const selectedOption = state.interactionTarget.customId;
      state.selectedOption = selectedOption;

      return {
        next: "createTokenRule",
        prompt: {
          type: "modal",
          title: `Configure ${selectedOption} Token Rule`,
          inputs: [
            {
              label:
                selectedOption === "CW721"
                  ? "Token Address"
                  : selectedOption === "DAODAO"
                  ? "DAO DAO URL"
                  : "Stargaze URL",
              placeholder:
                selectedOption === "CW721"
                  ? "Please enter the CW721 token address"
                  : selectedOption === "DAODAO"
                  ? "Paste your DAO DAO URL and we'll take care of the rest!"
                  : "Paste the Stargaze URL for the NFT collection and we can do the rest!",
              id: "token-address",
              required: true,
            },
            {
              label: "Role Name",
              placeholder:
                "Please enter the name of the role that should created",
              id: "role-name",
              required: true,
            },
            {
              label: "Token Amount",
              placeholder:
                "Please enter the number of tokens a user must have to get a special role",
              id: "token-amount",
              required: true,
            },
          ],
        },
      };
    },
  },
};
