import { ethers } from 'ethers';
import GroupRegistryArtifact from '../../artifacts/contracts/GroupRegistry.sol/GroupRegistry.json';
import ContractConfig from './contract-config.json';

export const getGroupRegistryContract = (signerOrProvider) => {
  if (!ContractConfig.groupRegistryAddress) {
    console.warn('GroupRegistry contract address not found in config. Ensure contracts are deployed.');
    
    throw new Error('GroupRegistry contract not deployed.');
  }
  return new ethers.Contract(
    ContractConfig.groupRegistryAddress,
    GroupRegistryArtifact.abi,
    signerOrProvider
  );
};

export const getGroupRegistryAddress = () => ContractConfig.groupRegistryAddress;
export const getGroupRegistryABI = () => GroupRegistryArtifact.abi;
