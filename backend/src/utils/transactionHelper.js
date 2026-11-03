import mongoose from 'mongoose';

/**
 * Checks if the active MongoDB connection supports multi-document transactions.
 * Single-node standalone instances (topology === 'Single') do NOT support transactions.
 * Transactions require a Replica Set (ReplicaSetWithPrimary) or Sharded cluster (Sharded / LoadBalanced).
 */
export const supportsTransactions = () => {
    try {
        if (process.env.DISABLE_TRANSACTIONS === 'true') {
            return false;
        }
        const topologyType = mongoose.connection?.client?.topology?.description?.type;
        // If topology is explicitly 'Single', it is a standalone MongoDB instance which does NOT support transactions
        if (topologyType === 'Single') {
            return false;
        }
        // If explicitly a replica set or mongos cluster
        if (topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded' || topologyType === 'LoadBalanced') {
            return true;
        }
        // For unknown / standalone default on localhost, return false to prevent transaction errors
        return false;
    } catch {
        return false;
    }
};

/**
 * Executes a callback within a transaction when replica sets are supported,
 * or runs standard non-transactional database operations when on standalone MongoDB.
 *
 * @param {Function} workFn - async (session) => { ... }
 * @returns {Promise<any>}
 */
export const withOptionalTransaction = async (workFn) => {
    // If standalone MongoDB, run directly with null session
    if (!supportsTransactions()) {
        return await workFn(null);
    }

    let session = null;
    try {
        session = await mongoose.startSession();
        let result;
        await session.withTransaction(async () => {
            result = await workFn(session);
        });
        return result;
    } catch (err) {
        const msg = err?.message || '';
        const isReplicaSetError =
            msg.includes('Transaction numbers are only allowed on a replica set') ||
            msg.includes('replica set member or mongos') ||
            msg.includes('transactions are not supported');

        if (isReplicaSetError) {
            // Standalone fallback: execute directly without transaction/session
            return await workFn(null);
        }
        throw err;
    } finally {
        if (session) {
            await session.endSession().catch(() => {});
        }
    }
};

