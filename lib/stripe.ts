import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  priceId?: string; // Stripe Price ID (will be created)
  popular?: boolean;
}

export const creditPackages: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 15,
    price: 8.99,
  },
  {
    id: 'popular',
    name: 'Popular Pack',
    credits: 45,
    price: 24.99,
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    credits: 110,
    price: 64.99,
  },
  {
    id: 'business',
    name: 'Business Pack',
    credits: 305,
    price: 179.99,
  },
];
