import dbConnect from '@/lib/db';
import User from '@/models/User';
import crypto from 'crypto';
import { NextResponse } from 'next/server';

export async function POST(request) {
  await dbConnect();

  const { address } = await request.json();

  if (!address) {
    return NextResponse.json(
      { error: 'Address is required' },
      { status: 400 }
    );
  }

  const nonce = crypto.randomBytes(32).toString('hex');
  const message = `Sign this message to log in to BlockSafe. Nonce: ${nonce}`;

  // Upsert user with new nonce
  await User.findOneAndUpdate(
    { walletAddress: address.toLowerCase() },
    { nonce: nonce },
    { upsert: true, new: true }
  );

  return NextResponse.json({ message, nonce });
}
