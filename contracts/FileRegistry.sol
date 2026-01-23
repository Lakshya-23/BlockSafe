// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "./GroupRegistry.sol";

contract FileRegistry {
    struct File {
        uint256 fileId;
        string currentCid;
        address owner;
        string filename;
        uint256 groupId; 
        string[3] encryptedShares; 
        uint256 createdAt;
        uint256 lastUpdatedAt;
        bool isDeleted;
    }

    struct AccessPermission {
        bool hasAccess;
        string permissionLevel;
        bytes wrappedKey;
        uint256 grantedAt;
        uint256 expiresAt;
    }

    GroupRegistry public groupRegistry;

    // Encryption public key registry for secure file sharing
    mapping(address => string) public encryptionKeys;

    uint256 private _fileIdCounter;
    mapping(uint256 => File) public files;
    mapping(uint256 => mapping(address => AccessPermission)) public accessControl;

    // Events
    event EncryptionKeyRegistered(address indexed user, string publicKey);
    event FileRegistered(uint256 indexed fileId, address indexed owner, uint256 indexed groupId, string cid, string filename);
    event FileUpdated(uint256 indexed fileId, address indexed updatedBy, string newCid);
    event FileDeleted(uint256 indexed fileId, address indexed owner);
    event AccessGranted(uint256 indexed fileId, address indexed owner, address indexed recipient, string permissionLevel, uint256 expiresAt);
    event AccessRevoked(uint256 indexed fileId, address indexed owner, address indexed user);

    constructor(address _groupRegistryAddress) {
        groupRegistry = GroupRegistry(_groupRegistryAddress);
    }

    // Register encryption public key for secure file sharing
    function registerPublicKey(string memory _publicKey) external {
        require(bytes(_publicKey).length > 0, "Public key cannot be empty");
        encryptionKeys[msg.sender] = _publicKey;
        emit EncryptionKeyRegistered(msg.sender, _publicKey);
    }

    modifier onlyFileOwner(uint256 _fileId) {
        require(files[_fileId].owner == msg.sender, "Not the file owner");
        require(!files[_fileId].isDeleted, "File is deleted");
        _;
    }

    modifier onlyGroupMember(uint256 _fileId) {
        uint256 groupId = files[_fileId].groupId;
        
        if (groupId == 0) {
            require(files[_fileId].owner == msg.sender, "Not file owner");
        } else {
            require(groupRegistry.isMember(groupId, msg.sender), "Not a group member");
        }
        require(!files[_fileId].isDeleted, "File is deleted");
        _;
    }

    function registerFile(
        string memory _cid, 
        string memory _filename, 
        uint256 _groupId,
        string[3] memory _encryptedShares
    ) public {
       
        if (_groupId != 0) {
            require(groupRegistry.isMember(_groupId, msg.sender), "Must be a group member to upload");
        }

        _fileIdCounter++;
        uint256 newFileId = _fileIdCounter;

        files[newFileId] = File({
            fileId: newFileId,
            currentCid: _cid,
            owner: msg.sender,
            filename: _filename,
            groupId: _groupId,
            encryptedShares: _encryptedShares,
            createdAt: block.timestamp,
            lastUpdatedAt: block.timestamp,
            isDeleted: false
        });

        emit FileRegistered(newFileId, msg.sender, _groupId, _cid, _filename);
    }

    function updateFile(uint256 _fileId, string memory _newCid) public onlyFileOwner(_fileId) {
        files[_fileId].currentCid = _newCid;
        files[_fileId].lastUpdatedAt = block.timestamp;
        emit FileUpdated(_fileId, msg.sender, _newCid);
    }

    function deleteFile(uint256 _fileId) public onlyFileOwner(_fileId) {
        files[_fileId].isDeleted = true;
        emit FileDeleted(_fileId, msg.sender);
    }

    function hasValidAccess(uint256 _fileId, address _user) public view returns (bool) {
        if (files[_fileId].isDeleted) return false;
        
        // Owner always has access
        if (files[_fileId].owner == _user) return true;

        AccessPermission memory permission = accessControl[_fileId][_user];
        if (permission.hasAccess) {
            
            if (permission.expiresAt == 0 || block.timestamp < permission.expiresAt) {
                return true;
            }
        }

        // Check group membership
        uint256 _groupId = files[_fileId].groupId;
        return groupRegistry.isMember(_groupId, _user);
    }

    function getFileDetails(uint256 _fileId) public view returns (File memory) {
        return files[_fileId];
    }
    
    function getFileShares(uint256 _fileId) public view returns (string[3] memory) {
        require(hasValidAccess(_fileId, msg.sender), "No access to file");
        return files[_fileId].encryptedShares;
    }

    // File Sharing Functions
    function grantAccess(
        uint256 _fileId,
        address _recipient,
        string memory _permissionLevel,
        bytes memory _wrappedKey,
        uint256 _expiresAt
    ) public onlyFileOwner(_fileId) {
        require(_recipient != address(0), "Invalid recipient");
        require(_recipient != files[_fileId].owner, "Cannot share with yourself");

       
        uint256 expirationTimestamp = _expiresAt == 0 ? 0 : block.timestamp + _expiresAt;

        accessControl[_fileId][_recipient] = AccessPermission({
            hasAccess: true,
            permissionLevel: _permissionLevel,
            wrappedKey: _wrappedKey,
            grantedAt: block.timestamp,
            expiresAt: expirationTimestamp
        });

        emit AccessGranted(_fileId, msg.sender, _recipient, _permissionLevel, expirationTimestamp);
    }

    function revokeAccess(uint256 _fileId, address _user) public onlyFileOwner(_fileId) {
        require(_user != files[_fileId].owner, "Cannot revoke owner access");
        delete accessControl[_fileId][_user];
        emit AccessRevoked(_fileId, msg.sender, _user);
    }

    function getAccessPermission(uint256 _fileId, address _user) public view returns (AccessPermission memory) {
        return accessControl[_fileId][_user];
    }
}
