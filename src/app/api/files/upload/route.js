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

    // 2. Parse Form Data
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('Uploading file to Pinata...');
    console.log('File name:', file.name);
    console.log('File size:', file.size);

    // 3. Upload to Pinata
    const upload = await pinata.upload.file(file);
    
    console.log('Pinata upload response:', upload);

    // The Pinata SDK returns { IpfsHash: "...", ... } or { cid: "..." }
    const cid = upload.IpfsHash || upload.cid;
    
    if (!cid) {
      console.error('No CID in Pinata response:', upload);
      return NextResponse.json({ 
        error: 'Upload succeeded but no CID returned',
        details: JSON.stringify(upload)
      }, { status: 500 });
    }

    console.log('Upload successful. CID:', cid);
    return NextResponse.json({ cid });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
