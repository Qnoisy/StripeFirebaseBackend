"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stripe_1 = __importDefault(require("stripe"));
const firebase_admin_export_1 = __importDefault(require("./firebase-admin-export"));
const middlewares_1 = require("./middlewares");
const router = express_1.default.Router();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-04-30.basil',
});
const COURSE_ID = 'unique_course_id'; // Фиксированный ID курса
/**
 * POST /api/create-checkout-session
 */
router.post('/create-checkout-session', middlewares_1.authenticateFirebase, async (req, res, next) => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const purchasesRef = firebase_admin_export_1.default.firestore().collection('purchases');
        const existingPurchase = await purchasesRef
            .where('userId', '==', userId)
            .where('courseId', '==', COURSE_ID)
            .get();
        if (!existingPurchase.empty) {
            res.status(400).json({ error: 'You already own this course.' });
            return;
        }
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'blik'], // Apple Pay включён через "card"
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
                userId,
                courseId: COURSE_ID,
            },
        });
        res.status(200).json({ url: session.url });
    }
    catch (err) {
        console.error('Error creating checkout session:', err);
        next(err);
    }
});
/**
 * POST /api/check-access
 */
router.post('/check-access', middlewares_1.authenticateFirebase, (req, res, next) => {
    (async () => {
        try {
            const userId = req.user?.uid;
            if (!userId) {
                res
                    .status(401)
                    .json({ access: false, message: 'User not authenticated' });
                return;
            }
            const purchasesRef = firebase_admin_export_1.default.firestore().collection('purchases');
            const existingPurchase = await purchasesRef
                .where('userId', '==', userId)
                .where('courseId', '==', COURSE_ID)
                .get();
            if (!existingPurchase.empty) {
                res.json({ access: true });
                return;
            }
            res.json({ access: false });
        }
        catch (err) {
            console.error('Error checking access:', err);
            next(err);
        }
    })();
});
exports.default = router;
