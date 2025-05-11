"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateFirebase = authenticateFirebase;
const firebase_admin_export_1 = __importDefault(require("./firebase-admin-export"));
async function authenticateFirebase(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new Error('Unauthorized'));
    }
    const idToken = authHeader.split(' ')[1];
    try {
        const decodedToken = await firebase_admin_export_1.default.auth().verifyIdToken(idToken);
        req.user = decodedToken; // Теперь TypeScript должен понимать `req.user`
        next();
    }
    catch (error) {
        console.error('Error verifying Firebase ID token:', error);
        next(new Error('Unauthorized'));
    }
}
