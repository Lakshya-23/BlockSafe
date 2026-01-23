import { ethers } from 'ethers';
import FileRegistryArtifact from './FileRegistryABI.json';
import ContractConfig from './contract-config.json';

export const getContract = (signerOrProvider) => {
  
  const address = ContractConfig.fileRegistryAddress || ContractConfig.address;
  
  if (!address) {
    throw new Error('Contract not deployed. Please run: npx hardhat run scripts/deploy.js --network localhost');
  }
  return new ethers.Contract(
    address,
    FileRegistryArtifact.abi,
    signerOrProvider
  );
};

export const getContractAddress = () => ContractConfig.fileRegistryAddress || ContractConfig.address;
export const getContractABI = () => FileRegistryArtifact.abi;
