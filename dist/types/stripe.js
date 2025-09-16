"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUBSCRIPTION_PLANS = void 0;
exports.SUBSCRIPTION_PLANS = [
    {
        id: 'free',
        name: 'Free',
        description: 'Perfect for trying out our platform',
        price: 0,
        priceId: '',
        interval: 'monthly',
        features: [
            'Up to 2 trading accounts',
            '1 copy mapping',
            'Basic analytics',
            'Email support',
        ],
        maxAccounts: 2,
        maxCopyMappings: 1,
    },
    {
        id: 'starter',
        name: 'Starter',
        description: 'Great for individual traders',
        price: 29,
        priceId: process.env.STRIPE_STARTER_PRICE_ID || '',
        interval: 'monthly',
        features: [
            'Up to 5 trading accounts',
            '3 copy mappings',
            'Advanced analytics',
            'Risk management tools',
            'Priority email support',
        ],
        maxAccounts: 5,
        maxCopyMappings: 3,
        isPopular: true,
    },
    {
        id: 'pro',
        name: 'Professional',
        description: 'For serious traders and small teams',
        price: 79,
        priceId: process.env.STRIPE_PRO_PRICE_ID || '',
        interval: 'monthly',
        features: [
            'Up to 15 trading accounts',
            '10 copy mappings',
            'Advanced analytics & reporting',
            'Custom risk management',
            'API access',
            'Phone & email support',
        ],
        maxAccounts: 15,
        maxCopyMappings: 10,
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'For large trading operations',
        price: 199,
        priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
        interval: 'monthly',
        features: [
            'Unlimited trading accounts',
            'Unlimited copy mappings',
            'White-label options',
            'Custom integrations',
            'Dedicated account manager',
            '24/7 priority support',
        ],
        maxAccounts: -1, // unlimited
        maxCopyMappings: -1, // unlimited
    },
];
