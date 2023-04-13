const { CosmWasmClient } = require("@cosmjs/cosmwasm-stargate");
const { getConnectionFromToken } = require("./networks");

// Check to see if they pasted a DAODAO URL like this:
// https://daodao.zone/dao/juno129spsp500mjpx7eut9p08s0jla9wmsen2g8nnjk3wmvwgc83srqq85awld
const isDaoDaoAddress = (daodaoUrl) => {
  const daodaoRegex = /^https:\/\/(testnet\.|legacy\.)?daodao.zone/;
  return daodaoUrl.match(daodaoRegex);
};

const getDAOAddressFromDAODAOUrl = (daoDAOUrl) => {
  const daoAddressRegex =
    /^https:\/\/(testnet\.|legacy\.)?daodao.zone\/dao\/(\w*)/;
  const regexMatches = daoAddressRegex.exec(daoDAOUrl);
  // [0] is the string itself, [1] is the (testnet\.|legacy\.) capture group, [2] is the (\w*) capture group
  return regexMatches[2];
};

const getDAOInfo = async (cosmClient, daoDAOUrl) => {
  const daoAddress = getDAOAddressFromDAODAOUrl(daoDAOUrl);
  const votingModuleAddress = await cosmClient.queryContractSmart(daoAddress, {
    voting_module: {},
  });

  const {
    info: { contract },
  } = await cosmClient.queryContractSmart(votingModuleAddress, {
    info: {},
  });

  if (contract.includes("cw20")) {
    return {
      type: "cw20",
      govToken: await cosmClient.queryContractSmart(votingModuleAddress, {
        token_contract: {},
      }),
      stakingContract: await cosmClient.queryContractSmart(
        votingModuleAddress,
        {
          staking_contract: {},
        }
      ),
    };
  } else if (contract.includes("cw721")) {
    return {
      type: "cw721",
      govToken: (
        await cosmClient.queryContractSmart(votingModuleAddress, {
          config: {},
        })
      ).nft_address,
      stakingContract: votingModuleAddress,
    };
  } else if (contract.includes("cw4")) {
    return {
      type: "cw4",
      govToken: await cosmClient.queryContractSmart(votingModuleAddress, {
        group_contract: {},
      }),
      stakingContract: votingModuleAddress,
    };
  } else {
    throw "Unexpected contract type";
  }
};

const getInputFromDaoDaoDao = async (daodaoUrl) => {
  if (!isDaoDaoAddress(daodaoUrl)) return;

  const network = daodaoUrl.includes("testnet") ? "testnet" : "mainnet";

  // Let's determine the RPC to connect to
  // based on the dao address
  const daoAddress = getDAOAddressFromDAODAOUrl(daodaoUrl);
  const rpcEndpoint = getConnectionFromToken(daoAddress, "rpc", network);
  const cosmClient = await CosmWasmClient.connect(rpcEndpoint);
  const daoInfo = await getDAOInfo(cosmClient, daodaoUrl);

  return daoInfo;
};

module.exports = {
  isDaoDaoAddress,
  getInputFromDaoDaoDao,
};
