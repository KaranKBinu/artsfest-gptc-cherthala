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
    <div className="overlay-container">
      <style jsx>{`
        .overlay-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--overlay-bg, rgba(255, 255, 255, 0.9));
          backdrop-filter: blur(5px);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 99999;
          animation: overlayFadeIn 0.3s ease-out forwards;
        }

        @media (prefers-color-scheme: dark) {
          .overlay-container {
            --overlay-bg: rgba(10, 10, 10, 0.9);
          }
        }

        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .pinterest-loader {
          display: flex;
          gap: 8px;
          margin-bottom: 1.5rem;
        }

        .dot {
          width: 14px;
          height: 14px;
          background: var(--primary-red);
          border-radius: 50%;
          animation: bounce 0.6s infinite alternate;
        }

        .dot:nth-child(2) {
          animation-delay: 0.2s;
          opacity: 0.8;
        }

        .dot:nth-child(3) {
          animation-delay: 0.4s;
          opacity: 0.6;
        }

        @keyframes bounce {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-16px);
          }
        }

        .message {
          font-family: ${cinzel.style.fontFamily}, serif;
          font-size: 1rem;
          font-weight: 700;
          color: var(--foreground);
          text-transform: uppercase;
          letter-spacing: 3px;
          text-align: center;
          margin-top: 10px;
        }

        .sub-text {
          font-family: ${inter.style.fontFamily}, sans-serif;
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-top: 8px;
          letter-spacing: 1px;
        }
      `}</style>

      <div className="pinterest-loader">
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>

      <div className="message">{message}</div>
      <div className="sub-text">Please Wait</div>
    </div>
  );
}
