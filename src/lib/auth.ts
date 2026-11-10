import { jwtVerify, SignJWT } from "jose";

// In a real app, use a strong secret from env. Using a default for demo.
const JWT_SECRET_KEY = process.env.JWT_SECRET || "super-secret-restaurant-erp-key-2026";
const key = new TextEncoder().encode(JWT_SECRET_KEY);

export type UserTokenPayload = {
  id: string;
  name: string;
  email: string;
  role: string;
  restaurantId?: string | null;
  branchId?: string | null;
};

export async function signToken(payload: UserTokenPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h") // 24 hours
    .sign(key);
    
  return token;
}

export async function verifyToken(token: string): Promise<UserTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload as UserTokenPayload;
  } catch (error) {
    return null;
  }
}
