'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getGroupRegistryContract } from '@/lib/groupRegistry';
import { CreateGroupDialog, ManageMembersSheet } from '@/components/GroupManagement';
import { FileUploadDialog } from '@/components/FileUploadDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Loader2, Users, Shield, UserPlus, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OrganizationsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      if (!window.ethereum) {
        toast.error('MetaMask not detected');
        return;
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Handle MetaMask disconnection
      window.ethereum.on('disconnect', () => {
        toast.error('MetaMask disconnected. Please refresh the page.');
      });
      
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      setAccount(userAddress);

      const contract = getGroupRegistryContract(signer);
      
      const userGroupIds = await contract.getUserGroups(userAddress);
      
      const loadedGroups = await Promise.all(userGroupIds.map(async (id) => {
        const group = await contract.getGroupDetails(id);
        const status = await contract.getMemberStatus(id, userAddress);
        const isAdmin = await contract.isAdmin(id, userAddress);
        
        console.log(`[Organizations] Group ${group.name} (ID: ${id}):`, {
          status: Number(status),
          isAdmin,
          createdBy: group.createdBy,
          currentUser: userAddress
        });
        
        return {
          id: group.groupId,
          name: group.name,
          createdBy: group.createdBy,
          status: Number(status),
          isAdmin: isAdmin
        };
      }));

      setGroups(loadedGroups);
    } catch (error) {
      console.error("Failed to load groups:", error);
      toast.error("Failed to load organizations. " + (error.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (groupId) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = getGroupRegistryContract(signer);
      
      const tx = await contract.acceptInvite(groupId);
      await tx.wait();
      
      toast.success("Joined group successfully");
      loadGroups();
    } catch (error) {
      console.error(error);
      toast.error("Failed to accept invite");
    }
  };

  const handleRejectInvite = async (groupId) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = getGroupRegistryContract(signer);
      
      const tx = await contract.rejectInvite(groupId);
      await tx.wait();
      
      toast.success("Invite declined");
      loadGroups();
    } catch (error) {
      console.error(error);
      toast.error("Failed to decline invite");
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const joinedGroups = groups.filter(g => g.status === 2);
  const pendingInvites = groups.filter(g => g.status === 1);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="w-8 h-8 text-primary" />
            My Organizations
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage your groups and team collaborations
          </p>
        </div>
        <div className="flex gap-2">
          <FileUploadDialog requireGroup={true} onUploadSuccess={loadGroups} />
          <CreateGroupDialog onGroupCreated={loadGroups} />
        </div>
      </motion.div>

      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-accent" />
            Pending Invitations ({pendingInvites.length})
          </h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pendingInvites.map((group) => (
              <motion.div key={group.id.toString()} variants={item}>
                <Card className="border-accent/20 hover:border-accent/40 transition-all hover:shadow-lg">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-accent" />
                        {group.name}
                      </CardTitle>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                        Invited
                      </Badge>
                    </div>
                    <CardDescription>
                      You've been invited to join this organization
                    </CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <div className="flex gap-2 w-full">
                      <Button className="flex-1" onClick={() => handleAcceptInvite(group.id)}>
                        Accept
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={() => handleRejectInvite(group.id)}>
                        Decline
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* My Organizations */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: pendingInvites.length > 0 ? 0.4 : 0.2 }}
      >
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          My Organizations ({joinedGroups.length})
        </h3>
        
        {joinedGroups.length === 0 && pendingInvites.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="pt-6 pb-6 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                You haven't joined any organizations yet. Create one or ask to be invited.
              </p>
            </CardContent>
          </Card>
        )}

        {joinedGroups.length > 0 && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {joinedGroups.map((group) => (
              <motion.div key={group.id.toString()} variants={item}>
                <Card className="relative overflow-hidden group hover:shadow-lg transition-all border-border/50 hover:border-primary/30">
                  <div className={`absolute inset-0 bg-gradient-to-br ${group.isAdmin ? 'from-primary to-accent' : 'from-chart-2 to-chart-3'} opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none`} />
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        {group.name}
                      </CardTitle>
                      {group.isAdmin && (
                        <Badge className="bg-primary">Admin</Badge>
                      )}
                      {!group.isAdmin && (
                        <Badge variant="secondary">Member</Badge>
                      )}
                    </div>
                    <CardDescription>
                      {group.isAdmin ? 'You manage this organization' : 'Member of this organization'}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex justify-between gap-2">
                    <ManageMembersSheet 
                      groupId={group.id} 
                      groupName={group.name} 
                      isAdmin={group.isAdmin}
                      trigger={
                        <Button 
                          variant="outline" 
                          className={group.isAdmin ? "w-full" : "flex-1 w-xs"}
                        >
                          {group.isAdmin ? 'Manage Members' : 'View Group'}
                        </Button>
                      }
                    />
                    {!group.isAdmin && (
                      <Button 
                        variant="destructive" 
                        className="max-w-xs" 
                        onClick={async () => {
                          if (!confirm(`Are you sure you want to leave ${group.name}?`)) return;
                          try {
                            const provider = new ethers.BrowserProvider(window.ethereum);
                            const signer = await provider.getSigner();
                            const contract = getGroupRegistryContract(signer);
                            
                            const tx = await contract.leaveGroup(group.id);
                            await tx.wait();
                            
                            toast.success(`You have left ${group.name}.`);
                            loadGroups();
                          } catch (error) {
                            console.error(error);
                            toast.error("Failed to leave group. " + (error.reason || error.message));
                          }
                        }}
                      >
                        Leave Group
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
