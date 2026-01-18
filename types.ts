
export enum EscrowStatus {
  PENDING = 'PENDING', // Created, waiting for other party to accept
  ACCEPTED = 'ACCEPTED', // Both parties agreed
  FUNDED = 'FUNDED', // Buyer has paid into escrow
  SHIPPED = 'SHIPPED', // Seller has sent item/service
  DELIVERED = 'DELIVERED', // Buyer received item
  COMPLETED = 'COMPLETED', // Funds released to seller
  DISPUTED = 'DISPUTED', // Conflict raised
  CANCELLED = 'CANCELLED' // Terminated before acceptance
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

export interface Escrow {
  id: string;
  title: string;
  description: string;
  amount: number;
  commission: number;
  currency: string;
  creatorId: string;
  partnerEmail: string;
  partnerId?: string;
  creatorRole: 'BUYER' | 'SELLER';
  status: EscrowStatus;
  createdAt: number;
  messages: Message[];
  disputeReason?: string;
  inspectionPeriodDays: number;
}

export interface AppState {
  currentUser: User | null;
  escrows: Escrow[];
  loading: boolean;
}
