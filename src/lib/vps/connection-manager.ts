import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';

type VPSInstance = Database['public']['Tables']['vps_instances']['Row'];
type AccountVPSAssignment = Database['public']['Tables']['account_vps_assignments']['Row'];
type TradingAccount = Database['public']['Tables']['trading_accounts']['Row'];

export interface VPSHealth {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  connection_count: number;
  last_response_time: number;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
}

export interface VPSConnectionConfig {
  host: string;
  port: number;
  ssh_key?: string;
  rdp_enabled?: boolean;
  monitoring_port?: number;
}

export class VPSConnectionManager {
  private connectionPools = new Map<string, any>(); // VPS connection pools
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHealthMonitoring();
  }

  /**
   * Get the best available VPS for a new account assignment
   */
  async assignAccountToVPS(accountId: string): Promise<VPSInstance | null> {
    try {
      const supabase = await createClient();
      
      // Find VPS with lowest load in active status
      const { data: availableVPS, error } = await supabase
        .from('vps_instances')
        .select('*')
        .eq('status', 'active')
        .order('current_load', { ascending: true })
        .limit(1)
        .single();

      if (error || !availableVPS) {
        console.error('No available VPS for account assignment:', error);
        return null;
      }

      // Check capacity
      if ((availableVPS.current_load || 0) >= (availableVPS.capacity || 100)) {
        console.error('No VPS with available capacity');
        return null;
      }

      // Create assignment
      const { error: assignError } = await supabase
        .from('account_vps_assignments')
        .insert({
          account_id: accountId,
          vps_id: availableVPS.id,
          status: 'connecting'
        });

      if (assignError) {
        console.error('Failed to create VPS assignment:', assignError);
        return null;
      }

      console.log(`Assigned account ${accountId} to VPS ${availableVPS.name}`);
      return availableVPS;
    } catch (error) {
      console.error('Error in VPS assignment:', error);
      return null;
    }
  }

  /**
   * Establish connection to a VPS for an account
   */
  async connectAccount(accountId: string): Promise<boolean> {
    try {
      const supabase = await createClient();
      
      // Get assignment
      const { data: assignment, error } = await supabase
        .from('account_vps_assignments')
        .select(`
          *,
          vps_instances(*),
          trading_accounts(*)
        `)
        .eq('account_id', accountId)
        .single();

      if (error || !assignment) {
        console.error('No VPS assignment found for account:', accountId);
        return false;
      }

      const vps = assignment.vps_instances as VPSInstance;
      const account = assignment.trading_accounts as TradingAccount;

      // Establish platform connection
      const connectionSuccess = await this.establishPlatformConnection(vps, account);

      if (connectionSuccess) {
        // Update assignment status
        await supabase
          .from('account_vps_assignments')
          .update({
            status: 'connected',
            connection_established_at: new Date().toISOString(),
            last_ping: new Date().toISOString(),
            error_count: 0,
            error_message: null
          })
          .eq('id', assignment.id);

        console.log(`Successfully connected account ${accountId} to VPS ${vps.name}`);
        return true;
      } else {
        // Update error status
        await supabase
          .from('account_vps_assignments')
          .update({
            status: 'error',
            error_count: (assignment.error_count || 0) + 1,
            error_message: 'Failed to establish platform connection'
          })
          .eq('id', assignment.id);

        return false;
      }
    } catch (error) {
      console.error('Error connecting account to VPS:', error);
      return false;
    }
  }

  /**
   * Establish platform-specific connection (MT4/MT5/etc)
   */
  private async establishPlatformConnection(vps: VPSInstance, account: TradingAccount): Promise<boolean> {
    try {
      const supabase = await createClient();
      
      // Get platform configuration
      const { data: platform, error } = await supabase
        .from('trading_platforms')
        .select('*')
        .eq('id', account.platform_id)
        .single();

      if (error || !platform) {
        console.error('Platform not found:', error);
        return false;
      }

      // Decrypt credentials
      const credentials = this.decryptCredentials(account.encrypted_credentials);
      
      // Platform-specific connection logic
      switch (platform.code) {
        case 'mt4':
        case 'mt5':
          return await this.connectMT4MT5(vps, account, credentials, platform);
        case 'ctrader':
          return await this.connectCTrader(vps, account, credentials, platform);
        default:
          console.error('Unsupported platform:', platform.code);
          return false;
      }
    } catch (error) {
      console.error('Error establishing platform connection:', error);
      return false;
    }
  }

  /**
   * Connect MT4/MT5 account to VPS
   */
  private async connectMT4MT5(
    vps: VPSInstance, 
    account: TradingAccount, 
    credentials: any, 
    platform: any
  ): Promise<boolean> {
    try {
      // VPS connection configuration
      const vpsConfig = vps.connection_config as VPSConnectionConfig;
      
      // Simulate MT4/MT5 connection process
      // In production, this would:
      // 1. SSH/RDP to VPS
      // 2. Start MT4/MT5 terminal with credentials
      // 3. Wait for successful login
      // 4. Enable auto-trading and DLL imports
      // 5. Load monitoring EA
      
      console.log(`Connecting ${platform.code.toUpperCase()} account ${account.account_number} on VPS ${vps.host}`);
      
      // Mock connection delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Store connection in pool
      const connectionKey = `${vps.id}-${account.id}`;
      this.connectionPools.set(connectionKey, {
        vps,
        account,
        platform,
        connected_at: new Date(),
        last_ping: new Date(),
        status: 'connected'
      });

      return true;
    } catch (error) {
      console.error('MT4/MT5 connection failed:', error);
      return false;
    }
  }

  /**
   * Connect cTrader account to VPS
   */
  private async connectCTrader(
    vps: VPSInstance, 
    account: TradingAccount, 
    credentials: any, 
    platform: any
  ): Promise<boolean> {
    try {
      console.log(`Connecting cTrader account ${account.account_number} on VPS ${vps.host}`);
      
      // Mock connection
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const connectionKey = `${vps.id}-${account.id}`;
      this.connectionPools.set(connectionKey, {
        vps,
        account,
        platform,
        connected_at: new Date(),
        last_ping: new Date(),
        status: 'connected'
      });

      return true;
    } catch (error) {
      console.error('cTrader connection failed:', error);
      return false;
    }
  }

  /**
   * Start continuous health monitoring
   */
  private startHealthMonitoring(): void {
    const checkInterval = 30000; // 30 seconds
    
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, checkInterval);

    console.log('VPS health monitoring started');
  }

  /**
   * Perform health checks on all VPS instances
   */
  private async performHealthChecks(): Promise<void> {
    try {
      const supabase = await createClient();
      
      const { data: vpsInstances, error } = await supabase
        .from('vps_instances')
        .select('*')
        .in('status', ['active', 'maintenance']);

      if (error || !vpsInstances) {
        console.error('Failed to fetch VPS instances for health check:', error);
        return;
      }

      const healthPromises = vpsInstances.map((vps: VPSInstance) => this.checkVPSHealth(vps));
      await Promise.allSettled(healthPromises);
    } catch (error) {
      console.error('Error in health monitoring:', error);
    }
  }

  /**
   * Check health of a specific VPS
   */
  private async checkVPSHealth(vps: VPSInstance): Promise<VPSHealth> {
    const startTime = Date.now();
    
    try {
      const supabase = await createClient();
      
      // Mock health check - in production this would:
      // 1. Ping VPS
      // 2. Check system resources via SSH/API
      // 3. Verify platform processes are running
      // 4. Test trading connection
      
      const mockHealth: VPSHealth = {
        cpu_usage: Math.random() * 100,
        memory_usage: Math.random() * 100,
        disk_usage: Math.random() * 100,
        connection_count: vps.current_load || 0,
        last_response_time: Date.now() - startTime,
        status: 'healthy'
      };

      // Determine status based on thresholds
      if (mockHealth.cpu_usage > 90 || mockHealth.memory_usage > 90) {
        mockHealth.status = 'critical';
      } else if (mockHealth.cpu_usage > 80 || mockHealth.memory_usage > 80) {
        mockHealth.status = 'warning';
      }

      // Update VPS instance
      await supabase
        .from('vps_instances')
        .update({
          cpu_usage: mockHealth.cpu_usage,
          memory_usage: mockHealth.memory_usage,
          disk_usage: mockHealth.disk_usage,
          last_health_check: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', vps.id);

      // Log health check
      await supabase
        .from('connection_health_logs')
        .insert({
          vps_id: vps.id,
          check_type: 'system_resources',
          status: mockHealth.status,
          response_time_ms: mockHealth.last_response_time,
          details: {
            cpu_usage: mockHealth.cpu_usage,
            memory_usage: mockHealth.memory_usage,
            disk_usage: mockHealth.disk_usage,
            connection_count: mockHealth.connection_count
          }
        });

      return mockHealth;
    } catch (error) {
      console.error(`Health check failed for VPS ${vps.name}:`, error);
      
      const supabase = await createClient();
      
      // Log failed health check
      await supabase
        .from('connection_health_logs')
        .insert({
          vps_id: vps.id,
          check_type: 'system_resources',
          status: 'offline',
          response_time_ms: Date.now() - startTime,
          details: { error: (error as Error).message }
        });

      return {
        cpu_usage: 0,
        memory_usage: 0,
        disk_usage: 0,
        connection_count: 0,
        last_response_time: Date.now() - startTime,
        status: 'offline'
      };
    }
  }

  /**
   * Handle connection failures and implement failover
   */
  async handleConnectionFailure(accountId: string): Promise<boolean> {
    try {
      console.log(`Handling connection failure for account ${accountId}`);
      
      const supabase = await createClient();
      
      // Get current assignment
      const { data: assignment } = await supabase
        .from('account_vps_assignments')
        .select('*')
        .eq('account_id', accountId)
        .single();

      if (!assignment) return false;

      // Increment error count
      const newErrorCount = (assignment.error_count || 0) + 1;
      
      if (newErrorCount >= 3) {
        // Try to reassign to different VPS
        console.log(`Too many failures, reassigning account ${accountId} to different VPS`);
        
        // Mark current assignment as failed
        await supabase
          .from('account_vps_assignments')
          .update({ status: 'error' })
          .eq('id', assignment.id);

        // Assign to new VPS
        const newVPS = await this.assignAccountToVPS(accountId);
        if (newVPS) {
          return await this.connectAccount(accountId);
        }
      } else {
        // Update error count and retry
        await supabase
          .from('account_vps_assignments')
          .update({
            error_count: newErrorCount,
            status: 'disconnected'
          })
          .eq('id', assignment.id);

        // Retry connection after delay
        setTimeout(() => {
          this.connectAccount(accountId);
        }, 5000 * newErrorCount); // Exponential backoff
      }

      return false;
    } catch (error) {
      console.error('Error handling connection failure:', error);
      return false;
    }
  }

  /**
   * Decrypt account credentials
   */
  private decryptCredentials(encryptedCredentials: string | null): any {
    if (!encryptedCredentials) return {};
    
    try {
      // Mock decryption - in production use proper encryption
      return JSON.parse(encryptedCredentials);
    } catch (error) {
      console.error('Failed to decrypt credentials:', error);
      return {};
    }
  }

  /**
   * Get connection status for an account
   */
  async getConnectionStatus(accountId: string): Promise<AccountVPSAssignment | null> {
    try {
      const supabase = await createClient();
      
      const { data: assignment, error } = await supabase
        .from('account_vps_assignments')
        .select(`
          *,
          vps_instances(*)
        `)
        .eq('account_id', accountId)
        .single();

      if (error) {
        console.error('Failed to get connection status:', error);
        return null;
      }

      return assignment;
    } catch (error) {
      console.error('Error getting connection status:', error);
      return null;
    }
  }

  /**
   * Disconnect account from VPS
   */
  async disconnectAccount(accountId: string): Promise<boolean> {
    try {
      const connectionKey = this.connectionPools.keys().next().value;
      if (connectionKey && connectionKey.includes(accountId)) {
        this.connectionPools.delete(connectionKey);
      }

      const supabase = await createClient();
      
      await supabase
        .from('account_vps_assignments')
        .update({ status: 'disconnected' })
        .eq('account_id', accountId);

      console.log(`Disconnected account ${accountId} from VPS`);
      return true;
    } catch (error) {
      console.error('Error disconnecting account:', error);
      return false;
    }
  }

  /**
   * Cleanup and stop monitoring
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.connectionPools.clear();
    console.log('VPS Connection Manager destroyed');
  }
}

// Export singleton instance
export const vpsConnectionManager = new VPSConnectionManager();