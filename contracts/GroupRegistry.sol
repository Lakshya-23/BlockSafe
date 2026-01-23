// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

contract GroupRegistry {
    enum MemberStatus { None, Invited, Joined }
    enum Role { Member, Admin }

    struct Group {
        uint256 groupId;
        string name;
        address createdBy;
        uint256 createdAt;
    }

    struct Member {
        MemberStatus status;
        Role role;
        uint256 joinedAt;
    }

    uint256 private _groupIdCounter;
    mapping(uint256 => Group) public groups;
    // groupId => user address => Member details
    mapping(uint256 => mapping(address => Member)) public memberships;
    
    mapping(address => uint256[]) public userGroups;

    event GroupCreated(uint256 indexed groupId, string name, address indexed createdBy);
    event UserInvited(uint256 indexed groupId, address indexed invitedBy, address indexed user);
    event UserJoined(uint256 indexed groupId, address indexed user);
    event UserLeft(uint256 indexed groupId, address indexed user);
    event InviteRejected(uint256 indexed groupId, address indexed user);
    event MemberRemoved(uint256 indexed groupId, address indexed removedBy, address indexed user);

    modifier onlyAdmin(uint256 _groupId) {
        require(memberships[_groupId][msg.sender].role == Role.Admin, "Not an admin");
        require(memberships[_groupId][msg.sender].status == MemberStatus.Joined, "Not a joined member");
        _;
    }

    function createGroup(string memory _name) external {
        _groupIdCounter++;
        uint256 newGroupId = _groupIdCounter;

        groups[newGroupId] = Group({
            groupId: newGroupId,
            name: _name,
            createdBy: msg.sender,
            createdAt: block.timestamp
        });

        // Add creator as Admin
        memberships[newGroupId][msg.sender] = Member({
            status: MemberStatus.Joined,
            role: Role.Admin,
            joinedAt: block.timestamp
        });

        userGroups[msg.sender].push(newGroupId);

        emit GroupCreated(newGroupId, _name, msg.sender);
        emit UserJoined(newGroupId, msg.sender);
    }

    function inviteMember(uint256 _groupId, address _user) external onlyAdmin(_groupId) {
        require(memberships[_groupId][_user].status == MemberStatus.None, "User already invited or joined");
        
        memberships[_groupId][_user] = Member({
            status: MemberStatus.Invited,
            role: Role.Member,
            joinedAt: 0
        });

       
        userGroups[_user].push(_groupId);

        emit UserInvited(_groupId, msg.sender, _user);
    }

    function acceptInvite(uint256 _groupId) external {
        require(memberships[_groupId][msg.sender].status == MemberStatus.Invited, "No pending invite");

        memberships[_groupId][msg.sender].status = MemberStatus.Joined;
        memberships[_groupId][msg.sender].joinedAt = block.timestamp;

        emit UserJoined(_groupId, msg.sender);
    }

    function rejectInvite(uint256 _groupId) external {
        require(memberships[_groupId][msg.sender].status == MemberStatus.Invited, "No pending invite");

        delete memberships[_groupId][msg.sender];
        _removeGroupFromUserList(_groupId, msg.sender);

        emit InviteRejected(_groupId, msg.sender);
    }

    function leaveGroup(uint256 _groupId) external {
        require(memberships[_groupId][msg.sender].status == MemberStatus.Joined, "Not a member");
       
        delete memberships[_groupId][msg.sender];
        _removeGroupFromUserList(_groupId, msg.sender);

        emit UserLeft(_groupId, msg.sender);
    }

    function removeMember(uint256 _groupId, address _user) external onlyAdmin(_groupId) {
        require(memberships[_groupId][_user].status != MemberStatus.None, "User is not associated with group");
        require(memberships[_groupId][_user].role != Role.Admin, "Cannot remove an admin"); // Simplification

        delete memberships[_groupId][_user];
        _removeGroupFromUserList(_groupId, _user);

        emit MemberRemoved(_groupId, msg.sender, _user);
    }

    function isMember(uint256 _groupId, address _user) external view returns (bool) {
        return memberships[_groupId][_user].status == MemberStatus.Joined;
    }

    function isAdmin(uint256 _groupId, address _user) external view returns (bool) {
        return memberships[_groupId][_user].status == MemberStatus.Joined && 
               memberships[_groupId][_user].role == Role.Admin;
    }

    function getUserGroups(address _user) external view returns (uint256[] memory) {
        return userGroups[_user];
    }

    function getGroupDetails(uint256 _groupId) external view returns (Group memory) {
        return groups[_groupId];
    }

    function getMemberStatus(uint256 _groupId, address _user) external view returns (MemberStatus) {
        return memberships[_groupId][_user].status;
    }

    function _removeGroupFromUserList(uint256 _groupId, address _user) internal {
        uint256[] storage userGroupList = userGroups[_user];
        for (uint256 i = 0; i < userGroupList.length; i++) {
            if (userGroupList[i] == _groupId) {
                userGroupList[i] = userGroupList[userGroupList.length - 1];
                userGroupList.pop();
                break;
            }
        }
    }
}
