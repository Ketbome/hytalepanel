import crypto from 'node:crypto';
import * as docker from './docker.js';
import type { OperationResult } from './servers.js';

const MACHINE_ID_FILE = '/opt/hytale/.machine-id';
const MACHINE_ID_HASH_FILE = '/opt/hytale/.machine-id.hash';

export interface MachineIdStatus {
  exists: boolean;
  value: string | null;
  hash: string | null;
  valid: boolean;
  changedSinceLastCheck: boolean;
  recommendation: string;
}

export interface MachineIdResult extends OperationResult {
  status?: MachineIdStatus;
}

/**
 * Validate machine-id format (must be 32 hex characters)
 */
function validateMachineIdFormat(id: string): boolean {
  const cleaned = id.trim().toLowerCase();
  return /^[a-f0-9]{32}$/.test(cleaned);
}

/**
 * Calculate MD5 hash of machine-id for change detection
 */
function hashMachineId(id: string): string {
  return crypto.createHash('md5').update(id.trim()).digest('hex');
}

/**
 * Check machine-id status in a server container
 */
export async function checkMachineId(containerName: string): Promise<MachineIdResult> {
  try {
    // Check if .machine-id file exists
    let checkOutput: string;
    try {
      checkOutput = await docker.execCommand(
        `test -f ${MACHINE_ID_FILE} && echo "exists" || echo "missing"`,
        5000,
        containerName
      );
    } catch (e) {
      console.error('[MachineId] Failed to check existence:', (e as Error).message);
      return {
        success: false,
        error: 'Failed to check machine-id file'
      };
    }

    const exists = checkOutput.trim() === 'exists';

    if (!exists) {
      return {
        success: true,
        status: {
          exists: false,
          value: null,
          hash: null,
          valid: false,
          changedSinceLastCheck: false,
          recommendation: 'Machine-id file not found. Restart the server to generate one.'
        }
      };
    }

    // Read machine-id value
    let machineId: string;
    try {
      machineId = await docker.execCommand(`cat ${MACHINE_ID_FILE}`, 5000, containerName);
    } catch (e) {
      console.error('[MachineId] Failed to read file:', (e as Error).message);
      return {
        success: false,
        error: 'Failed to read machine-id file'
      };
    }

    const cleanedMachineId = machineId.trim();
    const valid = validateMachineIdFormat(cleanedMachineId);
    const currentHash = hashMachineId(cleanedMachineId);

    // Read previous hash if exists
    let previousHash = 'none';
    try {
      const hashOutput = await docker.execCommand(
        `test -f ${MACHINE_ID_HASH_FILE} && cat ${MACHINE_ID_HASH_FILE} || echo "none"`,
        5000,
        containerName
      );
      previousHash = hashOutput.trim() || 'none';
    } catch {
      // If reading hash fails, assume none
      previousHash = 'none';
    }

    const changed = previousHash !== 'none' && previousHash !== currentHash;

    let recommendation = '';
    if (!valid) {
      recommendation = 'Machine-id format is invalid. Regenerate it to fix encrypted auth persistence.';
    } else if (changed) {
      recommendation = 'Machine-id changed! Previous encrypted auth data is inaccessible. Reauthorize server.';
    } else {
      recommendation = 'Machine-id is valid and consistent. Auth persistence should work correctly.';
    }

    return {
      success: true,
      status: {
        exists: true,
        value: cleanedMachineId,
        hash: currentHash,
        valid,
        changedSinceLastCheck: changed,
        recommendation
      }
    };
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message
    };
  }
}

/**
 * Regenerate machine-id by deleting existing files and restarting container
 * This forces the entrypoint script to generate a fresh machine-id
 */
export async function regenerateMachineId(containerName: string): Promise<OperationResult> {
  try {
    // Delete existing machine-id files
    try {
      await docker.execCommand(`rm -f ${MACHINE_ID_FILE} ${MACHINE_ID_HASH_FILE}`, 5000, containerName);
    } catch (e) {
      console.error('[MachineId] Failed to delete files:', (e as Error).message);
      return {
        success: false,
        error: 'Failed to delete machine-id files'
      };
    }

    // Restart container to trigger regeneration
    const restartResult = await docker.restart(containerName);

    if (!restartResult.success) {
      return {
        success: false,
        error: `Files deleted but restart failed: ${restartResult.error}`
      };
    }

    // Wait a bit for container to start and generate new ID
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Verify new machine-id was created
    const verifyResult = await checkMachineId(containerName);

    if (!verifyResult.success || !verifyResult.status?.valid) {
      return {
        success: false,
        error: 'Container restarted but new machine-id is invalid'
      };
    }

    return {
      success: true
    };
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message
    };
  }
}
