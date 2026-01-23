import { NextResponse } from 'next/server';
import { PinataSDK } from 'pinata';
import jwt from 'jsonwebtoken';

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY,
});

export async function POST(request) {
  try {
    // 1. Verify JWT
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. Parse Request Body
    const { cid } = await request.json();

    if (!cid) {
      return NextResponse.json({ error: 'No CID provided' }, { status: 400 });
    }

    console.log('Unpinning file from Pinata, CID:', cid);

    
    const unpin = await pinata.unpin([cid]);
    
    console.log('Pinata unpin response:', unpin);

    return NextResponse.json({ success: true, response: unpin });
    
  } catch (error) {
    console.error('Unpin error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
