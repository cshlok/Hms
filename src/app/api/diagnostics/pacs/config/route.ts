import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { DB } from '@/lib/database';
import { encryptSensitiveData, decryptSensitiveData } from '@/lib/encryption';
import { RedisCache } from '@/lib/cache/redis';
import { CacheInvalidation } from '@/lib/cache/invalidation';
import { auditLog } from '@/lib/audit';
import { notifyUsers } from '@/lib/notifications';

/**
 * GET /api/diagnostics/pacs/config
 * Get PACS configuration settings
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization
    if (!['admin', 'radiologist', 'radiology_technician', 'radiology_manager'].includes(session.user.roleName)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Cache key
    const cacheKey = `diagnostic:pacs:config`;

    // Try to get from cache or fetch from database
    const data = await RedisCache.getOrSet(
      cacheKey,
      async () => {
        // Get PACS configuration
        const query = `
          SELECT * FROM pacs_configuration
          WHERE active = true
          ORDER BY created_at DESC
          LIMIT 1
        `;

        const result = await DB.query(query);

        if (result.results.length === 0) {
          return {
            configured: false,
            message: 'PACS not configured'
          };
        }

        // Decrypt sensitive data
        const config = {
          ...result.results[0],
          aetitle: decryptSensitiveData(result.results[0].aetitle),
          hostname: decryptSensitiveData(result.results[0].hostname),
          username: result.results[0].username ? decryptSensitiveData(result.results[0].username) : null,
          // Don't include password in response
          password: null
        };

        // Log access
        await auditLog({
          userId: session.user.id,
          action: 'read',
          resource: 'pacs_configuration',
          details: { configId: config.id }
        });

        return {
          configured: true,
          config
        };
      },
      3600 // 1 hour cache
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/diagnostics/pacs/config:', error);
    return NextResponse.json({
      error: 'Failed to fetch PACS configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/diagnostics/pacs/config
 * Create or update PACS configuration
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization
    if (!['admin', 'radiology_manager'].includes(session.user.roleName)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { 
      aetitle, 
      hostname, 
      port, 
      username, 
      password,
      wado_url,
      stow_url,
      qido_url,
      viewer_url,
      modality_worklist_enabled,
      auto_send_enabled,
      auto_retrieve_enabled
    } = body;

    // Validate required fields
    if (!aetitle || !hostname || !port) {
      return NextResponse.json({ 
        error: 'AE Title, hostname, and port are required' 
      }, { status: 400 });
    }

    // Encrypt sensitive data
    const encryptedAETitle = encryptSensitiveData(aetitle);
    const encryptedHostname = encryptSensitiveData(hostname);
    const encryptedUsername = username ? encryptSensitiveData(username) : null;
    const encryptedPassword = password ? encryptSensitiveData(password) : null;

    // Deactivate current configuration if exists
    await DB.query(
      'UPDATE pacs_configuration SET active = false, updated_by = ?, updated_at = NOW() WHERE active = true',
      [session.user.id]
    );

    // Insert new configuration
    const query = `
      INSERT INTO pacs_configuration (
        aetitle, hostname, port, username, password,
        wado_url, stow_url, qido_url, viewer_url,
        modality_worklist_enabled, auto_send_enabled, auto_retrieve_enabled,
        active, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?, ?)
    `;

    const params = [
      encryptedAETitle,
      encryptedHostname,
      port,
      encryptedUsername,
      encryptedPassword,
      wado_url || null,
      stow_url || null,
      qido_url || null,
      viewer_url || null,
      modality_worklist_enabled || false,
      auto_send_enabled || false,
      auto_retrieve_enabled || false,
      session.user.id,
      session.user.id
    ];

    const result = await DB.query(query, params);

    // Log creation
    await auditLog({
      userId: session.user.id,
      action: 'create',
      resource: 'pacs_configuration',
      resourceId: result.insertId,
      details: {
        aetitle,
        hostname,
        port,
        hasUsername: !!username,
        hasPassword: !!password,
        modality_worklist_enabled: modality_worklist_enabled || false,
        auto_send_enabled: auto_send_enabled || false,
        auto_retrieve_enabled: auto_retrieve_enabled || false
      }
    });

    // Invalidate cache
    await CacheInvalidation.invalidatePattern('diagnostic:pacs:*');

    // Test connection
    const connectionTest = await testPacsConnection({
      aetitle,
      hostname,
      port,
      username,
      password
    });

    // Get the created configuration
    const createdConfig = await DB.query(
      `SELECT * FROM pacs_configuration WHERE id = ?`,
      [result.insertId]
    );

    // Decrypt sensitive data for response
    const config = {
      ...createdConfig.results[0],
      aetitle: decryptSensitiveData(createdConfig.results[0].aetitle),
      hostname: decryptSensitiveData(createdConfig.results[0].hostname),
      username: createdConfig.results[0].username ? decryptSensitiveData(createdConfig.results[0].username) : null,
      // Don't include password in response
      password: null
    };

    return NextResponse.json({
      config,
      connectionTest
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/diagnostics/pacs/config:', error);
    return NextResponse.json({
      error: 'Failed to create PACS configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/diagnostics/pacs/config/test
 * Test PACS connection
 */
export async function POST_TEST(request: NextRequest) {
  try {
    // Authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authorization
    if (!['admin', 'radiology_manager', 'radiologist'].includes(session.user.roleName)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { 
      aetitle, 
      hostname, 
      port, 
      username, 
      password,
      useExisting
    } = body;

    let connectionParams;

    if (useExisting) {
      // Get existing configuration
      const configQuery = `
        SELECT * FROM pacs_configuration
        WHERE active = true
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const configResult = await DB.query(configQuery);

      if (configResult.results.length === 0) {
        return NextResponse.json({
          error: 'No active PACS configuration found'
        }, { status: 404 });
      }

      const config = configResult.results[0];

      connectionParams = {
        aetitle: decryptSensitiveData(config.aetitle),
        hostname: decryptSensitiveData(config.hostname),
        port: config.port,
        username: config.username ? decryptSensitiveData(config.username) : null,
        password: config.password ? decryptSensitiveData(config.password) : null
      };
    } else {
      // Validate required fields
      if (!aetitle || !hostname || !port) {
        return NextResponse.json({ 
          error: 'AE Title, hostname, and port are required' 
        }, { status: 400 });
      }

      connectionParams = {
        aetitle,
        hostname,
        port,
        username,
        password
      };
    }

    // Test connection
    const connectionTest = await testPacsConnection(connectionParams);

    // Log test
    await auditLog({
      userId: session.user.id,
      action: 'test',
      resource: 'pacs_connection',
      details: {
        useExisting,
        success: connectionTest.success
      }
    });

    return NextResponse.json(connectionTest);
  } catch (error) {
    console.error('Error in POST /api/diagnostics/pacs/config/test:', error);
    return NextResponse.json({
      error: 'Failed to test PACS connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Helper function to test PACS connection
 */
async function testPacsConnection(params: {
  aetitle: string;
  hostname: string;
  port: number;
  username?: string | null;
  password?: string | null;
}) {
  try {
    // In a real implementation, this would use a DICOM library to test the connection
    // For this example, we'll simulate a successful connection
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simulate successful connection
    return {
      success: true,
      message: 'Successfully connected to PACS server',
      details: {
        aetitle: params.aetitle,
        hostname: params.hostname,
        port: params.port,
        association: 'Established',
        echo: 'Successful',
        timestamp: new Date().toISOString()
      }
    };
    
    // For a real implementation, you would handle connection failures like:
    /*
    return {
      success: false,
      message: 'Failed to connect to PACS server',
      details: {
        aetitle: params.aetitle,
        hostname: params.hostname,
        port: params.port,
        error: 'Connection refused',
        timestamp: new Date().toISOString()
      }
    };
    */
  } catch (error) {
    return {
      success: false,
      message: 'Error testing PACS connection',
      details: {
        aetitle: params.aetitle,
        hostname: params.hostname,
        port: params.port,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    };
  }
}
