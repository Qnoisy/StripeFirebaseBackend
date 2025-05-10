// src/middlewares.ts
import { NextFunction, Request, Response } from 'express';
import admin from './firebase-admin-export';

export const authenticateFirebase = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		res.status(401).json({ error: 'Unauthorized' });
		return;
	}

	const idToken = authHeader.split(' ')[1];

	try {
		const decodedToken = await admin.auth().verifyIdToken(idToken);
		req.user = decodedToken;
		next();
	} catch (error) {
		console.error('Error verifying Firebase ID token:', error);
		res.status(401).json({ error: 'Unauthorized' });
	}
};
