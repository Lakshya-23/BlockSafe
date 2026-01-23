const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("FileRegistryModule", (m) => {
  const fileRegistry = m.contract("FileRegistry");

  return { fileRegistry };
});
