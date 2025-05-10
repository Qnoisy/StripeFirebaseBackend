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
    apiVersion: '2024-01-01',
});
// Используем raw body для webhook
webhook.use(body_parser_1.default.raw({ type: 'application/json' }));
webhook.post('/', (req, res, next) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
        console.error('Webhook secret not configured.');
        return res.status(500).send('Webhook secret not configured.');
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Webhook signature verification failed:', errorMessage);
        return res.status(400).send(`Webhook Error: ${errorMessage}`);
    }
    // Используем функцию для обработки асинхронного кода
    handleWebhookEvent(event)
        .then(() => {
        res.json({ received: true });
    })
        .catch(err => {
        console.error('Error processing webhook:', err);
        res.status(500).send('Internal Server Error');
    });
});
// Асинхронная функция для обработки событий Webhook
async function handleWebhookEvent(event) {
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            const userId = session.metadata?.userId;
            if (userId) {
                try {
                    await firebase_admin_export_1.default.firestore().collection('purchases').doc(session.id).set({
                        userId,
                        sessionId: session.id,
                        courseAccess: true,
                        timestamp: firebase_admin_export_1.default.firestore.FieldValue.serverTimestamp(),
                    });
                    console.log(`✅ Purchase recorded for user ${userId}`);
                }
                catch (err) {
                    console.error('Error saving purchase:', err);
                    throw new Error('Error saving purchase');
                }
            }
            break;
        default:
            console.warn(`Unhandled event type: ${event.type}`);
    }
}
exports.default = webhook;
