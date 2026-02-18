import { ethers, BrowserProvider } from 'ethers';
import {
  POLYGON_CHAIN_ID_HEX,
  POLYGON_USDC_CONTRACT,
  POLYGON_USDC_DECIMALS,
  POLYGON_NETWORK_PARAMS,
  RECEIVER_WALLET_ADDRESS,
} from '@sortyapp/shared';

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
];

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
  }
}

export function isMetaMaskInstalled(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum?.isMetaMask;
}

export async function connectMetaMask(): Promise<string> {
  if (!window.ethereum) throw new Error('MetaMask is not installed');
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  if (!accounts || accounts.length === 0) throw new Error('No accounts found');
  return accounts[0];
}

export async function switchToPolygon(): Promise<void> {
  if (!window.ethereum) throw new Error('MetaMask is not installed');
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: POLYGON_CHAIN_ID_HEX }],
    });
  } catch (err: any) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [POLYGON_NETWORK_PARAMS],
      });
    } else {
      throw err;
    }
  }
}

export async function isOnPolygon(): Promise<boolean> {
  if (!window.ethereum) return false;
  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  return chainId === POLYGON_CHAIN_ID_HEX;
}

export async function getUSDCBalance(address: string): Promise<number> {
  if (!window.ethereum) throw new Error('MetaMask is not installed');
  const provider = new BrowserProvider(window.ethereum as any);
  const usdc = new ethers.Contract(POLYGON_USDC_CONTRACT, ERC20_ABI, provider);
  const balance = await usdc.balanceOf(address);
  return Number(ethers.formatUnits(balance, POLYGON_USDC_DECIMALS));
}

export async function sendUSDCTransfer(amountUSDC: number): Promise<string> {
  if (!window.ethereum) throw new Error('MetaMask is not installed');
  const provider = new BrowserProvider(window.ethereum as any);
  const signer = await provider.getSigner();
  const usdc = new ethers.Contract(POLYGON_USDC_CONTRACT, ERC20_ABI, signer);
  const rawAmount = ethers.parseUnits(amountUSDC.toString(), POLYGON_USDC_DECIMALS);
  const tx = await usdc.transfer(RECEIVER_WALLET_ADDRESS, rawAmount);
  const receipt = await tx.wait(1);
  return receipt.hash;
}
