// src/middlewares.ts
import { NextFunction, Request, Response } from 'express';
import admin from './firebase-admin-export';

export async function authenticateFirebase(
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return next(new Error('Unauthorized'));
	}

	const idToken = authHeader.split(' ')[1];

	try {
		const decodedToken = await admin.auth().verifyIdToken(idToken);
		req.user = decodedToken; // Теперь TypeScript должен понимать `req.user`
		next();
	} catch (error) {
		console.error('Error verifying Firebase ID token:', error);
		next(new Error('Unauthorized'));
	}
}
