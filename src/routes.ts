import express from 'express';
import Stripe from 'stripe';
import { authenticateFirebase } from './middlewares';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
	apiVersion: '2024-01-01' as Stripe.LatestApiVersion,
});

router.post(
	'/create-checkout-session',
	authenticateFirebase,
	async (req, res, next) => {
		try {
			const userId = req.user?.uid;

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
					userId: userId ?? '', // Если userId нет, передаем пустую строку
				},
			};

			const session = await stripe.checkout.sessions.create(sessionParams);

			res.status(200).json({ url: session.url });
		} catch (err) {
			console.error('Error creating checkout session:', err);
			next(new Error('Internal Server Error'));
		}
	}
);

export default router;
