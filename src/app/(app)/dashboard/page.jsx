'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useWeb3 } from '@/components/providers/Web3Provider';
import { getContract } from '@/lib/contract';
import { useEffect, useState } from 'react';
import { FileText, Users, Shield, TrendingUp, Activity, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { signer, account } = useWeb3();
  const [stats, setStats] = useState({
    totalFiles: 0,
    sharedFiles: 0,
    receivedFiles: 0,
    recentActivity: [],
    monthlyActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();

    // Handle MetaMask disconnection
    if (window.ethereum) {
      const handleDisconnect = () => {
        toast.error('MetaMask disconnected. Please refresh the page.');
        setError('MetaMask disconnected');
      };
      
      window.ethereum.on('disconnect', handleDisconnect);
      
      return () => {
        window.ethereum.removeListener('disconnect', handleDisconnect);
      };
    }
  }, [signer, account]);

  const fetchStats = async () => {
    if (!signer || !account) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const contract = getContract(signer);
      
      const registeredFilter = contract.filters.FileRegistered(null, account);
      const registeredEvents = await contract.queryFilter(registeredFilter);
      
      //Calculate monthly activity for graph
      const monthlyData = new Array(12).fill(0);
      const currentMonth = new Date().getMonth();
      
      registeredEvents.forEach(event => {
        const eventDate = new Date(event.blockNumber * 15000); 
        const monthDiff = currentMonth - eventDate.getMonth();
        if (monthDiff >= 0 && monthDiff < 12) {
          monthlyData[11 - monthDiff]++;
        }
      });
      
      // Get recent activity
      const allEvents = registeredEvents.map(e => ({
        type: 'File Uploaded',
        timestamp: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
        fileName: e.args[3] || 'Untitled',
        icon: FileText
      })).sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
      
      setStats({
        totalFiles: registeredEvents.length,
        sharedFiles: 0,
        receivedFiles: 0,
        recentActivity: allEvents,
        monthlyActivity: monthlyData
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError(error.message);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Files',
      value: stats.totalFiles,
      icon: FileText,
      color: 'from-primary to-primary/80',
      change: '+12%',
      trend: 'up'
    },
    {
      title: 'Shared in Groups',
      value: stats.sharedFiles,
      icon: Users,
      color: 'from-accent to-accent/80',
      change: 'Group-based',
      trend: 'neutral'
    },
    {
      title: 'Group Access',
      value: stats.receivedFiles,
      icon: Shield,
      color: 'from-chart-2 to-chart-2/80',
      change: 'Via groups',
      trend: 'neutral'
    },
    {
      title: 'Activity Score',
      value: stats.totalFiles,
      icon: TrendingUp,
      color: 'from-chart-4 to-chart-4/80',
      change: '+15%',
      trend: 'up'
    }
  ];

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
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-3" />
            <p className="text-lg font-medium mb-2">Failed to Load Dashboard</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <button 
              onClick={fetchStats}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's your file activity overview.
          </p>
        </div>
        
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        {statCards.map((stat, index) => (
          <motion.div key={stat.title} variants={item}>
            <Card className="relative overflow-hidden group hover:shadow-lg transition-all border-border/50 hover:border-primary/30">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color}`}>
                  <stat.icon className="h-4 w-4 text-primary-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stat.value}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  
                  
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Activity Chart and Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Activity Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-4"
        >
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Activity Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 flex items-end justify-between gap-2 px-4">
                {stats.monthlyActivity.map((count, i) => {
                  const maxCount = Math.max(...stats.monthlyActivity, 1);
                  const heightPercent = (count / maxCount) * 100;
                  
                  return (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercent}%` }}
                      transition={{ delay: 0.5 + i * 0.05, duration: 0.6 }}
                      className="flex-1 bg-gradient-to-t from-primary to-accent rounded-t-md relative group cursor-pointer"
                      style={{ minWidth: '20px', minHeight: count > 0 ? '4px' : '0' }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-popover border border-border rounded px-2 py-1 text-xs whitespace-nowrap">
                        {count} {count === 1 ? 'file' : 'files'}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-4 px-4 text-xs text-muted-foreground">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => (
                  <span key={month}>{month}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-3"
        >
          <Card className="h-full border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentActivity.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No recent activity</p>
                    <p className="text-xs mt-1">Upload your first file to get started</p>
                  </div>
                ) : (
                  stats.recentActivity.map((activity, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                      className="flex items-start gap-4 p-3 rounded-lg hover:bg-accent/5 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-primary/10">
                        <activity.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {activity.type}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {activity.fileName}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </span>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
