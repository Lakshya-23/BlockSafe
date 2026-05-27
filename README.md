# BlockSafe — Secure Decentralized File Sharing

> A blockchain powered file sharing platform with client-side encryption, Shamir's Secret Sharing, and IPFS storage zero single point of failure by design.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636?logo=solidity)
![Hardhat](https://img.shields.io/badge/Hardhat-2.x-f7dc6f?logo=ethereum)

---

## Overview

BlockSafe is a decentralized file sharing system that eliminates the trust placed in any single server or administrator. Files are encrypted in the browser before upload, stored on IPFS via Pinata, and their encryption keys are split across three independent nodes using Shamir's Secret Sharing — so no single node can ever reconstruct your key alone.

Access control is enforced entirely on-chain through two Solidity smart contracts deployed on Ethereum, making permissions transparent, tamper-proof, and auditable by anyone.

---

## Key Features

- **Client-side AES-256-GCM encryption** — files are encrypted in the browser before leaving your device; the server never sees plaintext.
- **Shamir's Secret Sharing (2-of-3 threshold)** — the encryption key is split into three shares distributed across independent nodes (alpha, beta, gamma); any two shares reconstruct the key.
- **Blockchain access control** — `FileRegistry` and `GroupRegistry` smart contracts manage who can access what, with on-chain permission grants and revocations.
- **IPFS storage via Pinata** — encrypted file blobs are stored on IPFS; only the CID is recorded on-chain.
- **MetaMask wallet authentication** — sign-in with Ethereum (SIWE) using cryptographic signatures; no passwords, no centralized identity provider.
- **Time-based access expiry** — share files with a deadline; permissions expire automatically at the contract level.
- **Group / Organization support** — create teams, invite members by wallet address, and upload files scoped to a group with inherited access.
- **Proxy re-encryption for sharing** — when sharing with another user, nodes re-encrypt key shares under the recipient's public key without ever exposing the plaintext key.
- **Public file links** — optionally generate a public link allowing anyone to access a file without a wallet.

---

## Architecture

```
┌─────────────┐      AES-GCM encrypted blob       ┌──────────────┐
│   Browser   │ ─────────────────────────────────► │  IPFS/Pinata │
│  (Next.js)  │ ◄── CID ────────────────────────── └──────────────┘
└──────┬──────┘
       │  register file + encrypted shares
       ▼
┌────────────────────┐
│  Ethereum Network  │
│  ┌──────────────┐  │
│  │ FileRegistry │  │  — stores CID, owner, group, encrypted key shares
│  └──────────────┘  │
│  ┌───────────────┐ │
│  │ GroupRegistry │ │  — manages organizations, roles, invitations
│  └───────────────┘ │
└────────────────────┘
       │
       │  encrypted key shares (one per node)
       ▼
┌──────────────────────────────────┐
│  Shamir Nodes (Next.js API)      │
│  Node Alpha | Node Beta | Node γ │  — each holds one encrypted share
└──────────────────────────────────┘
       │  2-of-3 shares → reconstruct AES key → decrypt file
       ▼
┌─────────────┐
│   Browser   │  — decrypts and renders the file locally
└─────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS v4, shadcn/ui, Framer Motion |
| Blockchain | Solidity 0.8.28, Hardhat, ethers.js v6 |
| Storage | IPFS via Pinata SDK |
| Encryption | Web Crypto API (AES-GCM 256), `eth-crypto`, `@metamask/eth-sig-util` |
| Secret Sharing | Custom GF(256) Shamir implementation (`secrets.js-grempe`) |
| Auth | Sign-in with Ethereum (SIWE), JWT, MongoDB (nonce store) |
| Database | MongoDB / Mongoose |

---

## Project Structure

```
BlockSafe/
├── contracts/
│   ├── FileRegistry.sol       # Core file metadata & access control
│   └── GroupRegistry.sol      # Organization & membership management
├── scripts/
│   ├── deploy.js              # Deploy both contracts & save addresses
│   ├── generate-node-keys.js  # Generate keypairs for Shamir nodes
│   └── derive_keys.js         # Key derivation utilities
├── src/
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── dashboard/     # Main file dashboard
│   │   │   ├── my-files/      # User's uploaded files
│   │   │   ├── shared-with-me/# Files shared by others
│   │   │   ├── organizations/ # Group management UI
│   │   │   └── file/[id]/     # File detail & access page
│   │   ├── api/
│   │   │   ├── auth/          # SIWE request-message & verify-signature
│   │   │   ├── files/upload/  # Pinata upload endpoint
│   │   │   ├── encrypt-shares/# Share encryption for upload
│   │   │   └── nodes/reencrypt/ # Proxy re-encryption for file sharing
│   │   └── public/[fileId]/   # Public file access (no wallet required)
│   ├── components/
│   │   ├── FileUploadDialog.jsx
│   │   ├── ShareFileDialog.jsx
│   │   ├── GroupManagement.jsx
│   │   ├── EncryptionKeyCard.jsx
│   │   └── CreatePublicLinkDialog.jsx
│   └── lib/
│       ├── shamirSecretSharing.js  # Custom GF(256) SSS implementation
│       ├── encryption.js           # AES-GCM encrypt/decrypt helpers
│       ├── contract.js             # ethers.js contract bindings
│       ├── nodeConfig.js           # Shamir node public keys
│       └── publicKeyRegistry.js   # On-chain public key helpers
└── ignition/modules/
    └── FileRegistry.js            # Hardhat Ignition deploy module
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MetaMask browser extension
- A Pinata account (for IPFS uploads)
- MongoDB instance (local or Atlas)

### Installation

```bash
git clone https://github.com/your-username/BlockSafe.git
cd BlockSafe
npm install
```

### Environment Setup

Create a `.env.local` file in the project root:

```env
# Pinata (IPFS)
PINATA_JWT=your_pinata_jwt_token
PINATA_GATEWAY=your_pinata_gateway_url

# MongoDB
MONGODB_URI=mongodb://localhost:27017/blocksafe

# JWT for API auth
JWT_SECRET=your_jwt_secret_key

# Shamir Node Private Keys (generate with scripts/generate-node-keys.js)
NODE_ALPHA_PRIVATE_KEY=0x...
NODE_BETA_PRIVATE_KEY=0x...
NODE_GAMMA_PRIVATE_KEY=0x...
```

### Generate Node Keys

```bash
node scripts/generate-node-keys.js
```

Copy the generated public keys into `src/lib/nodeConfig.js` and the private keys into `.env.local`.

### Deploy Smart Contracts

Start a local Hardhat node:

```bash
npx hardhat node
```

In a separate terminal, deploy the contracts:

```bash
node scripts/deploy.js
```

Contract addresses are automatically saved to `src/lib/contract-config.json`.

### Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and connect your MetaMask wallet.

---

## How File Upload Works

1. **Encrypt** — the browser generates a random AES-256-GCM key and encrypts the file locally.
2. **Split** — the raw key bytes are split into 3 shares via Shamir's Secret Sharing (GF(256), threshold = 2).
3. **Encrypt shares** — each share is encrypted with the corresponding node's public key (x25519-xsalsa20-poly1305).
4. **Upload** — the encrypted file blob is sent to Pinata; the returned IPFS CID is recorded.
5. **Register** — `FileRegistry.registerFile()` is called on-chain with the CID, filename, group ID, and the three encrypted shares stored in contract storage.

## How File Retrieval Works

1. **Verify access** — the contract's `hasValidAccess()` is checked for the requesting wallet.
2. **Fetch shares** — the user calls `getFileShares()` on-chain to retrieve the encrypted shares.
3. **Request re-encryption** — the user's browser calls `/api/nodes/reencrypt` on at least 2 nodes, providing a signed message as proof of identity.
4. **Node validates** — each node verifies the Ethereum signature, decrypts its share with its private key, and re-encrypts it for the user's public key.
5. **Reconstruct key** — the browser decrypts the two re-encrypted shares and feeds them into `combine()` to reconstruct the AES key.
6. **Decrypt file** — the encrypted IPFS blob is fetched and decrypted locally in the browser.

---

## Smart Contracts

### `FileRegistry.sol`

| Function | Description |
|---|---|
| `registerFile(cid, filename, groupId, shares)` | Upload a new file and register it on-chain |
| `grantAccess(fileId, recipient, level, wrappedKey, expiresAt)` | Share a file with time-optional expiry |
| `revokeAccess(fileId, user)` | Revoke a previously granted permission |
| `hasValidAccess(fileId, user)` | Check current access (owner / granted / group) |
| `getFileShares(fileId)` | Retrieve encrypted key shares (access-gated) |
| `registerPublicKey(publicKey)` | Register your encryption public key on-chain |
| `updateFile(fileId, newCid)` | Update a file's IPFS CID (owner only) |
| `deleteFile(fileId)` | Soft-delete a file (owner only) |

### `GroupRegistry.sol`

| Function | Description |
|---|---|
| `createGroup(name)` | Create an organization; caller becomes Admin |
| `inviteMember(groupId, user)` | Invite a wallet address (Admin only) |
| `acceptInvite(groupId)` | Accept a pending invitation |
| `isMember(groupId, user)` | Check active membership |

---

## Security Properties

| Threat | Mitigation |
|---|---|
| Server compromise | Files are AES-256-GCM encrypted client-side; server stores only ciphertext |
| Single node compromise | Shamir 2-of-3 — one compromised node reveals nothing |
| Unauthorized access | On-chain access control enforced by smart contract; cannot be bypassed |
| Replay attacks | SIWE nonce rotated after each login; node re-encryption requires fresh signature |
| Centralized IPFS gateway | CIDs are content-addressed; files can be fetched from any IPFS gateway |
