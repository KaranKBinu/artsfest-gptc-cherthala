'use client';

import React from 'react';
import { Inter, Cinzel } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
const cinzel = Cinzel({ subsets: ['latin'] });

interface LoadingOverlayProps {
    message?: string;
}

export default function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(10, 10, 10, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            animation: 'fadeIn 0.3s ease-out'
        }} className={inter.className}>
            <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.95); }
        }

        .spinner {
          width: 60px;
          height: 60px;
          border: 4px solid rgba(212, 175, 55, 0.1);
          border-top: 4px solid #D4AF37; /* Gold */
          border-radius: 50%;
          animation: spin 1s cubic-bezier(0.5, 0, 0.5, 1) infinite;
          margin-bottom: 2rem;
          position: relative;
        }

        .spinner::after {
          content: '';
          position: absolute;
          top: 10px;
          left: 10px;
          right: 10px;
          bottom: 10px;
          border: 2px solid rgba(139, 0, 0, 0.1);
          border-top: 2px solid #8B0000; /* Red */
          border-radius: 50%;
          animation: spin 1.5s linear infinite reverse;
        }

        .text {
          color: #FAF9F6;
          font-size: 1.2rem;
          font-weight: 500;
          letter-spacing: 2px;
          text-transform: uppercase;
          animation: pulse 2s ease-in-out infinite;
        }

        .sub-text {
          color: rgba(250, 249, 246, 0.6);
          font-size: 0.8rem;
          margin-top: 0.5rem;
          letter-spacing: 1px;
        }
      `}</style>

            <div className="spinner"></div>
            <div className={`${cinzel.className} text`}>{message}</div>
            <div className="sub-text">Please Wait...</div>
        </div>
    );
}
