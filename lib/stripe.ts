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
    price: 12,
  },
  {
    id: 'popular',
    name: 'Popular Pack',
    credits: 40,
    price: 30,
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    credits: 110,
    price: 80,
  },
  {
    id: 'business',
    name: 'Business Pack',
    credits: 305,
    price: 200,
  },
];
