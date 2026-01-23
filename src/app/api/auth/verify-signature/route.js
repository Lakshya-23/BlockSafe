import dbConnect from '@/lib/db';
import User from '@/models/User';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

export async function POST(request) {
  await dbConnect();

  const { address, signature, nonce } = await request.json();

  if (!address || !signature || !nonce) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const user = await User.findOne({ walletAddress: address.toLowerCase() });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Verify nonce matches (prevent replay attacks)
  if (user.nonce !== nonce) {
    return NextResponse.json({ error: 'Invalid nonce' }, { status: 401 });
  }

  const message = `Sign this message to log in to BlockSafe. Nonce: ${nonce}`;

  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, address: user.walletAddress },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '1d' }
    );

    return NextResponse.json({ token });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
