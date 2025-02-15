module.exports = {
  // TODO: feels like this should be promptRoleName
  createTokenRule: {
    getConfig: async (state, {
      astrolabe: { getTokenDetails },
      daodao: { isDaoDaoAddress, getInputFromDaoDaoDao },
      stargaze: { isStargazeLaunchpadAddress, getCW721FromStargazeUrl },
    }) => {
      // Required for every flow in token-rule add
      const selectedRoleName = state.interactionTarget.fields.getTextInputValue('role-name');

      if (selectedRoleName.trim() === '') {
        return {
          error: 'Role Name cannot only be whitespace'
        }
      }

      let tokenAddress;
      if (state.tokenType !== 'native') {
        tokenAddress = state.interactionTarget.fields.getTextInputValue('token-address');
        if (tokenAddress) {
          try {
            if (isDaoDaoAddress(tokenAddress)) {
              const daoDetails = await getInputFromDaoDaoDao(tokenAddress);
              /*
              if (daoDetails.type !== state.tokenType) {
                return {
                  error: `DAO DAO type mismatch. DAO is of type ${daoDetails.type} but selected token is of type ${state.tokenType}.`,
                };
              }*/

              tokenAddress = daoDetails.govToken
              state.stakingContract = daoDetails.stakingContract;
            } else if (isStargazeLaunchpadAddress(tokenAddress)) {
              tokenAddress = await getCW721FromStargazeUrl(tokenAddress);
            }
            const results = await getTokenDetails({ tokenAddress });

            // TO-DO: This is silly, but currently works because native token rules
            // don't go through this if statement.
            state.tokenAddress = results.tokenType === 'cw20' ? results.cw20Input : results.cw721;
            state.network = results.network;
            state.tokenType = results.tokenType;
            state.tokenSymbol = results.tokenSymbol;
            if (results.decimals) {
              // Don't override decimals for cw721
              state.decimals = results.decimals
            }
          } catch (error) {
            // Notify the channel with whatever went wrong in this step
            return { error };
          }
        }

      }

      // This is set for native and cw20 only
      let amountOfTokensNeeded;
      amountOfTokensNeeded = parseInt(state.interactionTarget.fields.getTextInputValue('token-amount'));

      // TODO: add fix so they can enter .1 instead of 0.1 and have it work
      if (
        !Number.isInteger(amountOfTokensNeeded) ||
        amountOfTokensNeeded <= 0
      ) {
        // Invalid reply
        return {
          error: 'Need a positive number of tokens.',
        };
      }

      // Multiply by the decimals for native and fungible tokens
      console.log('Multiplying by the number of decimals', state.decimals)
      state.minimumTokensNeeded = amountOfTokensNeeded * (10 ** state.decimals)
      console.log('Minimum amount needed', state.minimumTokensNeeded)

      const { guild } = state

      const existingObjectRoles = await guild.roles.fetch();
      let roleAlreadyExists = existingObjectRoles.some(role => role.name === selectedRoleName);
      if (roleAlreadyExists) {
        // Invalid reply
        return {
          error: 'A token role already exists with this name. Please pick a different name, or rename that one first.'
        };
      }

      // We can make the new role, set it in state for creation and addition
      //   to database later
      state.selectedRoleName = selectedRoleName

      return {
        next: 'handleRoleCreate',
        prompt: {
          type: 'button',
          title: 'Count only staked tokens?',
          options: [{
            label: 'Yes',
            value: 'yes',
          }, {
            label: 'No, count them all',
            value: 'no',
          }],
          footer: {
            text: 'If you select "No" it will count liquid, staked, and currently unbonding where applicable.',
          }
        }
      }
    }
  }
}
