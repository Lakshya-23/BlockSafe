import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Deploy GroupRegistry
  const GroupRegistry = await hre.ethers.getContractFactory("GroupRegistry");
  const groupRegistry = await GroupRegistry.deploy();
  await groupRegistry.waitForDeployment();
  const groupRegistryAddress = await groupRegistry.getAddress();
  console.log("GroupRegistry deployed to:", groupRegistryAddress);

  // Deploy FileRegistry with GroupRegistry address
  const FileRegistry = await hre.ethers.getContractFactory("FileRegistry");
  const fileRegistry = await FileRegistry.deploy(groupRegistryAddress);
  await fileRegistry.waitForDeployment();
  const fileRegistryAddress = await fileRegistry.getAddress();
  console.log("FileRegistry deployed to:", fileRegistryAddress);

  const configPath = path.join(__dirname, "../src/lib/contract-config.json");
  
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(
    configPath,
    JSON.stringify({ 
      fileRegistryAddress: fileRegistryAddress,
      groupRegistryAddress: groupRegistryAddress 
    }, null, 2)
  );
  console.log("Contract addresses saved to:", configPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
