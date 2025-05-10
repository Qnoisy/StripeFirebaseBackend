"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stripe_1 = __importDefault(require("stripe"));
const middlewares_1 = require("./middlewares");
const router = express_1.default.Router();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-01-01',
});
router.post('/create-checkout-session', middlewares_1.authenticateFirebase, async (req, res, next) => {
    try {
        const userId = req.user?.uid;
        const sessionParams = {
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price: process.env.STRIPE_PRICE_ID,
                    quantity: 1,
                },
            ],
            success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/cancel`,
            metadata: {
                userId: userId ?? '', // Если userId нет, передаем пустую строку
            },
        };
        const session = await stripe.checkout.sessions.create(sessionParams);
        res.status(200).json({ url: session.url });
    }
    catch (err) {
        console.error('Error creating checkout session:', err);
        next(new Error('Internal Server Error'));
    }
});
exports.default = router;
