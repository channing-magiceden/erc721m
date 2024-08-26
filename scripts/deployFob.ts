// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.

import { confirm } from '@inquirer/prompts';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ContractDetails, RESERVOIR_RELAYER_EOA } from './common/constants';
import { checkCodeVersion, estimateGas } from './utils/helper';
import { Overrides } from 'ethers';

interface IDeployFobParams {
  name: string;
  symbol: string;
  tokenurisuffix: string;
  maxsupply: string;
  globalwalletlimit: string;
  cosigner?: string;
  timestampexpiryseconds?: number;
  mintcurrency?: string;
  fundreceiver?: string;
  erc2198royaltyreceiver?: string;
  erc2198royaltyfeenumerator?: number;
  gaspricegwei?: number;
  gaslimit?: number;
}

export const deployFob = async (
  args: IDeployFobParams,
  hre: HardhatRuntimeEnvironment,
) => {
  // Compile again in case we have a coverage build (binary too large to deploy)
  await hre.run('compile');
  const contractName: string = "FOB";

  let maxsupply = hre.ethers.BigNumber.from(args.maxsupply);

  const overrides: Overrides = {};
  if (args.gaspricegwei) {
    overrides.gasPrice = hre.ethers.BigNumber.from(args.gaspricegwei * 1e9);
  }
  if (args.gaslimit) {
    overrides.gasLimit = hre.ethers.BigNumber.from(args.gaslimit);
  }

  const [signer] = await hre.ethers.getSigners();
  const contractFactory = await hre.ethers.getContractFactory(contractName, signer);

  const params = [
    args.name,
    args.symbol,
    args.tokenurisuffix,
    maxsupply,
    hre.ethers.BigNumber.from(args.globalwalletlimit),
    args.cosigner ?? hre.ethers.constants.AddressZero,
    args.timestampexpiryseconds ?? 300,
    args.mintcurrency ?? hre.ethers.constants.AddressZero,
    args.fundreceiver ?? signer.address,
    args.erc2198royaltyreceiver ?? hre.ethers.constants.AddressZero,
    args.erc2198royaltyfeenumerator ?? 0,
    "0xebDD1C28Ea898667eD34a580d741953130AB87d5"
  ] as any[];

  console.log(
    `Going to deploy ${contractName} with params`,
    JSON.stringify(args, null, 2),
  );

  if (
    !(await estimateGas(
      hre,
      contractFactory.getDeployTransaction(...params),
      overrides,
    ))
  )
    return;

  if (!(await confirm({ message: 'Continue to deploy?' }))) return;

  const contract = await contractFactory.deploy(...params, overrides);
  console.log('Deploying contract... ');
  console.log('tx:', contract.deployTransaction.hash);

  await contract.deployed();

  console.log(`${contractName} deployed to:`, contract.address);
  console.log('run the following command to verify the contract:');
  const paramsStr = params
    .map((param) => {
      if (hre.ethers.BigNumber.isBigNumber(param)) {
        return `"${param.toString()}"`;
      }
      return `"${param}"`;
    })
    .join(' ');

  console.log(
    `npx hardhat verify --network ${hre.network.name} ${contract.address} ${paramsStr}`,
  );

  // Set security policy to ME default
  console.log('[FOB] Setting security policy to ME default...');
  const ERC721CM = await hre.ethers.getContractFactory(
    ContractDetails.ERC721CM.name,
  );
  const erc721cm = ERC721CM.attach(contract.address);
  const tx = await erc721cm.setToDefaultSecurityPolicy();
  console.log('[FOB] Security policy set');

  // Add reservoir relay as authorized minter by default
  await erc721cm.addAuthorizedMinter(RESERVOIR_RELAYER_EOA);
  console.log('[FOB] Added Reservoir Relayer as authorized minter');
};
