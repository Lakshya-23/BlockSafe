const hre = require("hardhat");

async function main() {
  console.log("Compiling...");
  await hre.run("compile");
  console.log("Compilation finished.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
