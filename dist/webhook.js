"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const body_parser_1 = __importDefault(require("body-parser"));
const express_1 = __importDefault(require("express"));
const stripe_1 = __importDefault(require("stripe"));
const firebase_admin_export_1 = __importDefault(require("./firebase-admin-export"));
const webhook = express_1.default.Router();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-04-30.basil',
});
// Используем raw body для webhook
webhook.use(body_parser_1.default.raw({ type: 'application/json' }));
webhook.post('/', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
        console.error('Webhook secret not configured.');
        res.status(500).send('Webhook secret not configured.');
        return;
    }
    if (!sig) {
        console.error('Stripe signature is missing.');
        res.status(400).send('Stripe signature is missing.');
        return;
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object;
                const userId = session.metadata?.userId;
                const courseId = session.metadata?.courseId;
                const sessionId = session.id;
                if (!userId || !courseId) {
                    console.warn(`Missing userId or courseId for session: ${sessionId}`);
                    res.status(400).json({ error: 'Missing userId or courseId' });
                    return;
                }
                console.log(`✅ Webhook received for user: ${userId}, course: ${courseId}, session: ${sessionId}`);
                const purchasesRef = firebase_admin_export_1.default.firestore().collection('purchases');
                // Проверяем, куплен ли уже этот курс пользователем
                const existingPurchaseQuery = await purchasesRef
                    .where('userId', '==', userId)
                    .where('courseId', '==', courseId)
                    .get();
                if (!existingPurchaseQuery.empty) {
                    console.log(`⚠️ User ${userId} has already purchased course ${courseId}`);
                    res.status(200).json({ message: 'Course already purchased' });
                    return;
                }
                // Записываем новую покупку
                await purchasesRef.doc(sessionId).set({
                    userId,
                    courseId,
                    sessionId,
                    courseAccess: true,
                    timestamp: firebase_admin_export_1.default.firestore.FieldValue.serverTimestamp(),
                });
                console.log(`✅ Purchase recorded for user ${userId}, course ${courseId}`);
                res.status(200).json({ received: true });
                break;
            default:
                console.warn(`Unhandled event type: ${event.type}`);
                res.status(200).json({ received: true });
        }
    }
    catch (err) {
        console.error('Webhook Error:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});
exports.default = webhook;
