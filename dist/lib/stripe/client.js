"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripePromise = void 0;
const stripe_js_1 = require("@stripe/stripe-js");
// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
exports.stripePromise = (0, stripe_js_1.loadStripe)(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
