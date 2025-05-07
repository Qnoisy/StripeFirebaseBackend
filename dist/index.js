"use strict";
// src/index.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Выполняем инициализацию Firebase до импорта admin
require("./firebase-init");
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const stripe_1 = __importDefault(require("stripe"));
const firebase_admin_export_1 = __importDefault(require("./firebase-admin-export"));
const app = (0, express_1.default)();
// Stripe инициализация
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-04-30.basil',
});
app.use((0, cors_1.default)({ origin: process.env.FRONTEND_URL }));
app.use(express_1.default.json());
// Middleware для проверки авторизации Firebase
async function authenticateFirebase(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new Error('Unauthorized'));
    }
    const idToken = authHeader.split(' ')[1];
    try {
        const decodedToken = await firebase_admin_export_1.default.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    }
    catch (error) {
        console.error('Error verifying Firebase ID token:', error);
        next(new Error('Unauthorized'));
    }
}
// Endpoint для создания Stripe Checkout Session
app.post('/create-checkout-session', authenticateFirebase, async (req, res, next) => {
    try {
        const userId = req.user?.uid;
        const session = await stripe.checkout.sessions.create({
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
        });
        await firebase_admin_export_1.default.firestore().collection('purchases').doc(session.id).set({
            userId,
            sessionId: session.id,
            courseAccess: true,
            timestamp: firebase_admin_export_1.default.firestore.FieldValue.serverTimestamp(),
        });
        res.status(200).json({ url: session.url });
    }
    catch (err) {
        console.error('Failed to create checkout session:', err);
        next(new Error('Internal Server Error'));
    }
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(401).json({ error: err.message });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
});
