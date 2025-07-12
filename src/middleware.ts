import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Handle OPTIONS (Preflight) requests sent by the browser
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set('Access-Control-Allow-Origin', '*'); // Be more specific in production
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    return response;
  }

  // Handle actual requests
  const response = NextResponse.next();
  
  response.headers.set('Access-Control-Allow-Origin', '*'); // Be more specific in production
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // **Major Fix: Allow sending credentials (cookies)**
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
  return response;
}

// Ensure the middleware only runs on API routes
export const config = {
  matcher: '/api/:path*',
};