import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { getGroupRegistryContract } from '@/lib/groupRegistry';
import { getContract } from '@/lib/contract';
import { FileText } from 'lucide-react';
import Link from 'next/link';

export function CreateGroupDialog({ onGroupCreated }) {
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!groupName) return;
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = getGroupRegistryContract(signer);

      const tx = await contract.createGroup(groupName);
      await tx.wait();

      toast.success(`Group "${groupName}" has been created successfully.`);
      setOpen(false);
      setGroupName('');
      if (onGroupCreated) onGroupCreated();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create group. " + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Create New Group</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Create a new group to manage files and members securely.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="col-span-3"
              placeholder="e.g. Engineering Team"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create Group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ManageMembersSheet({ groupId, groupName, trigger, isAdmin }) {
  const [inviteAddress, setInviteAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [groupFiles, setGroupFiles] = useState([]);
  const [fetchingMembers, setFetchingMembers] = useState(false);
  const [fetchingFiles, setFetchingFiles] = useState(false);

  useEffect(() => {
    if (groupId) {
      fetchMembers();
      fetchGroupFiles();
    }
  }, [groupId]);

  const fetchGroupFiles = async () => {
    setFetchingFiles(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = getContract(signer); // FileRegistry contract

      // Filter files by groupId
      const filter = contract.filters.FileRegistered(null, null, groupId);
      const events = await contract.queryFilter(filter);

      const filePromises = events.map(async (event) => {
        try {
          const details = await contract.getFileDetails(event.args[0]);
          if (details.isDeleted) return null;

          return {
            id: details.fileId.toString(),
            filename: details.filename,
            cid: details.currentCid,
            owner: details.owner,
            createdAt: new Date(Number(details.createdAt) * 1000).toLocaleDateString(),
          };
        } catch (e) {
          console.error("Error fetching file details:", e);
          return null;
        }
      });

      const fetchedFiles = (await Promise.all(filePromises)).filter(f => f !== null);
      setGroupFiles(fetchedFiles);
    } catch (error) {
      console.error("Error fetching group files:", error);
    } finally {
      setFetchingFiles(false);
    }
  };

  const fetchMembers = async () => {
    setFetchingMembers(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = getGroupRegistryContract(signer);

      // Fetch all relevant events for this group
      const createdFilter = contract.filters.GroupCreated(groupId);
      const invitedFilter = contract.filters.UserInvited(groupId);
      const joinedFilter = contract.filters.UserJoined(groupId);
      const leftFilter = contract.filters.UserLeft(groupId);
      const rejectedFilter = contract.filters.InviteRejected(groupId);
      const removedFilter = contract.filters.MemberRemoved(groupId);

      const [created, invited, joined, left, rejected, removed] = await Promise.all([
        contract.queryFilter(createdFilter),
        contract.queryFilter(invitedFilter),
        contract.queryFilter(joinedFilter),
        contract.queryFilter(leftFilter),
        contract.queryFilter(rejectedFilter),
        contract.queryFilter(removedFilter),
      ]);

      // Combine and sort events by block number
      const allEvents = [
        ...created.map(e => ({ type: 'Created', args: e.args, block: e.blockNumber, txIndex: e.index })),
        ...invited.map(e => ({ type: 'Invited', args: e.args, block: e.blockNumber, txIndex: e.index })),
        ...joined.map(e => ({ type: 'Joined', args: e.args, block: e.blockNumber, txIndex: e.index })),
        ...left.map(e => ({ type: 'Left', args: e.args, block: e.blockNumber, txIndex: e.index })),
        ...rejected.map(e => ({ type: 'Rejected', args: e.args, block: e.blockNumber, txIndex: e.index })),
        ...removed.map(e => ({ type: 'Removed', args: e.args, block: e.blockNumber, txIndex: e.index })),
      ].sort((a, b) => {
        if (a.block !== b.block) return a.block - b.block;
        return a.txIndex - b.txIndex;
      });

      // Reconstruct state
      const memberMap = new Map();

      allEvents.forEach(event => {
        const { type, args } = event;
        let user;
        
        if (type === 'Created') {
            user = args[2]; // createdBy
            memberMap.set(user, { status: 'Joined', role: 'Admin', address: user });
        } else if (type === 'Invited') {
            user = args[2]; // user
            memberMap.set(user, { status: 'Invited', role: 'Member', address: user });
        } else if (type === 'Joined') {
            user = args[1]; // user
            // Preserve role if already set (e.g. Admin), otherwise Member
            const existing = memberMap.get(user);
            memberMap.set(user, { ...existing, status: 'Joined', address: user, role: existing?.role || 'Member' });
        } else if (type === 'Left' || type === 'Rejected' || type === 'Removed') {
            user = args[1]; // user (args[2] for Removed? No, Removed is (groupId, removedBy, user))
            if (type === 'Removed') user = args[2];
            memberMap.delete(user);
        }
      });

      setMembers(Array.from(memberMap.values()));

    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setFetchingMembers(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteAddress) return;
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = getGroupRegistryContract(signer);

      const tx = await contract.inviteMember(groupId, inviteAddress);
      await tx.wait();

      toast.success(`Invited ${inviteAddress} to ${groupName}.`);
      setInviteAddress('');
      fetchMembers();
    } catch (error) {
      console.error(error);
      toast.error("Failed to invite user. " + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (memberAddress) => {
    if (!confirm(`Are you sure you want to remove ${memberAddress}?`)) return;
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = getGroupRegistryContract(signer);

        const tx = await contract.removeMember(groupId, memberAddress);
        await tx.wait();

        toast.success(`${memberAddress} removed.`);
        fetchMembers();
    } catch (error) {
        console.error(error);
        toast.error("Failed to remove member. " + (error.reason || error.message));
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || <Button variant="outline">Manage Members</Button>}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-[800px] px-5">
        <SheetHeader>
          <SheetTitle>Manage {groupName}</SheetTitle>
          <SheetDescription>
            Invite new members or remove existing ones.
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-6">
          <Tabs defaultValue="members" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
              <TabsTrigger value="files">Files ({groupFiles.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="members" className="space-y-4">
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Wallet Address (0x...)"
                    value={inviteAddress}
                    onChange={(e) => setInviteAddress(e.target.value)}
                  />
                  <Button onClick={handleInvite} disabled={loading}>
                    {loading ? 'Inviting...' : 'Invite'}
                  </Button>
                </div>
              )}
              
              {fetchingMembers ? (
                  <div className="text-sm text-muted-foreground">Loading members...</div>
              ) : members.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No members found.</div>
              ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Address</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        {isAdmin && <TableHead className="text-right">Action</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.address}>
                          <TableCell className="font-mono text-xs">
                            {member.address.slice(0, 6)}...{member.address.slice(-4)}
                          </TableCell>
                          <TableCell>{member.role}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                member.status === 'Joined' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                                {member.status}
                            </span>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              {member.role !== 'Admin' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleRemove(member.address)}
                                >
                                  Remove
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
              )}
            </TabsContent>

            <TabsContent value="files" className="space-y-4">
              {fetchingFiles ? (
                <div className="text-sm text-muted-foreground">Loading files...</div>
              ) : groupFiles.length === 0 ? (
                <div className="text-sm text-muted-foreground">No files shared with this group yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Filename</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupFiles.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          {file.filename}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {file.owner.slice(0, 6)}...{file.owner.slice(-4)}
                        </TableCell>
                        <TableCell>{file.createdAt}</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/file/${file.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
