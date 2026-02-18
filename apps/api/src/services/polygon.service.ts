import { ethers } from 'ethers';
import { config } from '../lib/config';
import { POLYGON_USDC_DECIMALS } from '@sortyapp/shared';
import { AppError } from '../middleware/error.middleware';

const ERC20_TRANSFER_EVENT = 'event Transfer(address indexed from, address indexed to, uint256 value)';
const USDC_IFACE = new ethers.Interface([ERC20_TRANSFER_EVENT]);

export interface VerifiedTransfer {
  from: string;
  to: string;
  amountUSDC: number;
  blockNumber: number;
  confirmations: number;
}

class PolygonService {
  private getProvider(): ethers.JsonRpcProvider {
    return new ethers.JsonRpcProvider(config.polygonRpcUrl);
  }

  /**
   * Verify a USDC transfer transaction on Polygon.
   *
   * Checks:
   * 1. Transaction exists and was successful (status = 1)
   * 2. Transaction interacted with the USDC contract
   * 3. Logs contain a Transfer event to our receiver wallet
   * 4. Transfer amount matches the claimed amount (within 0.01 tolerance)
   * 5. Has sufficient confirmations (>= 5 blocks)
   */
  async verifyUSDCTransfer(
    txHash: string,
    expectedAmountUSDC: number,
    expectedSender: string,
  ): Promise<VerifiedTransfer> {
    const provider = this.getProvider();

    // 1. Fetch transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      throw new AppError(400, 'Transaction not found on Polygon. It may still be pending.');
    }

    // 2. Check tx was successful
    if (receipt.status !== 1) {
      throw new AppError(400, 'Transaction failed on-chain (reverted)');
    }

    // 3. Check the transaction was to the USDC contract
    if (receipt.to?.toLowerCase() !== config.polygonUsdcContract.toLowerCase()) {
      throw new AppError(400, 'Transaction is not a USDC transfer');
    }

    // 4. Parse Transfer events from logs
    const receiverLower = config.receiverWalletAddress.toLowerCase();
    const senderLower = expectedSender.toLowerCase();
    let matchedTransfer: VerifiedTransfer | null = null;

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== config.polygonUsdcContract.toLowerCase()) continue;

      try {
        const parsed = USDC_IFACE.parseLog({ topics: log.topics as string[], data: log.data });
        if (!parsed || parsed.name !== 'Transfer') continue;

        const from = parsed.args[0].toLowerCase();
        const to = parsed.args[1].toLowerCase();
        const value = parsed.args[2];

        if (from === senderLower && to === receiverLower) {
          const amountUSDC = Number(ethers.formatUnits(value, POLYGON_USDC_DECIMALS));
          const currentBlock = await provider.getBlockNumber();

          matchedTransfer = {
            from,
            to,
            amountUSDC,
            blockNumber: receipt.blockNumber,
            confirmations: currentBlock - receipt.blockNumber,
          };
          break;
        }
      } catch {
        continue;
      }
    }

    if (!matchedTransfer) {
      throw new AppError(400, 'No matching USDC transfer found to our wallet in this transaction');
    }

    // 5. Check confirmations (at least 5 blocks)
    if (matchedTransfer.confirmations < 5) {
      throw new AppError(400, `Transaction needs more confirmations. Current: ${matchedTransfer.confirmations}, required: 5`);
    }

    // 6. Verify amount matches (within 0.01 USDC tolerance)
    if (Math.abs(matchedTransfer.amountUSDC - expectedAmountUSDC) > 0.01) {
      throw new AppError(400,
        `Amount mismatch. Expected ${expectedAmountUSDC} USDC, found ${matchedTransfer.amountUSDC} USDC on-chain`
      );
    }

    return matchedTransfer;
  }
}

export const polygonService = new PolygonService();
