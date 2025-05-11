import express, { NextFunction, Request, Response } from 'express';
import Stripe from 'stripe';
import admin from './firebase-admin-export';
import { authenticateFirebase } from './middlewares';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
	apiVersion: '2025-04-30.basil',
});

/**
 * POST /api/create-checkout-session
 */
router.post(
	'/create-checkout-session',
	authenticateFirebase,
	async (req, res, next): Promise<void> => {
		try {
			const userId = req.user?.uid ?? '';

			const sessionParams: Stripe.Checkout.SessionCreateParams = {
				payment_method_types: ['card'],
				mode: 'payment',
				line_items: [
					{
						price: process.env.STRIPE_PRICE_ID as string,
						quantity: 1,
					},
				],
				success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
				cancel_url: `${process.env.FRONTEND_URL}/cancel`,
				metadata: {
					userId,
				},
			};

			const session = await stripe.checkout.sessions.create(sessionParams);

			res.status(200).json({ url: session.url });
		} catch (err) {
			console.error('Error creating checkout session:', err);
			next(err);
		}
	}
);

/**
 * POST /api/check-access
 */
router.post(
	'/check-access',
	authenticateFirebase,
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const userId = req.user?.uid;

			if (!userId) {
				res
					.status(401)
					.json({ access: false, message: 'User not authenticated' });
				return;
			}

			const purchasesRef = admin.firestore().collection('purchases');
			const snapshot = await purchasesRef.where('userId', '==', userId).get();

			if (snapshot.empty) {
				res.json({ access: false });
				return;
			}

			console.log(`✅ Access confirmed for user: ${userId}`);
			res.json({ access: true });
		} catch (err) {
			console.error('Error checking access:', err);
			next(err);
		}
	}
);

/**
 * GET /api/create-checkout-session (Test Route)
 */
router.get('/create-checkout-session', (req, res): void => {
	res.json({ message: 'Checkout session route is working' });
});

export default router;
