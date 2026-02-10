'use client';

import React from 'react';

export default function LoadingSpinner({ size = '20px', color = 'currentColor' }: { size?: string, color?: string }) {
  return (
    <div className="spinner-container">
      <style jsx>{`
        .spinner-container {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: ${size};
          height: ${size};
        }

        .dot-pulse {
          position: relative;
          width: calc(${size} / 4);
          height: calc(${size} / 4);
          border-radius: 50%;
          background-color: ${color};
          color: ${color};
          animation: dot-pulse 1.5s infinite linear;
        }

        .dot-pulse::before, .dot-pulse::after {
          content: "";
          display: inline-block;
          position: absolute;
          top: 0;
          width: calc(${size} / 4);
          height: calc(${size} / 4);
          border-radius: 50%;
          background-color: ${color};
          color: ${color};
        }

        .dot-pulse::before {
          left: calc(-1.5 * (${size} / 4));
          animation: dot-pulse-before 1.5s infinite linear;
        }

        .dot-pulse::after {
          left: calc(1.5 * (${size} / 4));
          animation: dot-pulse-after 1.5s infinite linear;
        }

        @keyframes dot-pulse-before {
          0% { box-shadow: 9999px 0 0 -5px; }
          30% { box-shadow: 9999px 0 0 2px; }
          60%, 100% { box-shadow: 9999px 0 0 -5px; }
        }

        @keyframes dot-pulse {
          0% { box-shadow: 9999px 0 0 -5px; }
          30% { box-shadow: 9999px 0 0 -5px; }
          60% { box-shadow: 9999px 0 0 2px; }
          90%, 100% { box-shadow: 9999px 0 0 -5px; }
        }

        @keyframes dot-pulse-after {
          0%, 30% { box-shadow: 9999px 0 0 -5px; }
          60% { box-shadow: 9999px 0 0 -5px; }
          90% { box-shadow: 9999px 0 0 2px; }
          100% { box-shadow: 9999px 0 0 -5px; }
        }

        /* Simpler cleaner version if the complex one fails to render well */
        .simple-orbit {
          width: ${size};
          height: ${size};
          border: 2px solid transparent;
          border-top-color: ${color};
          border-radius: 50%;
          animation: orbit 0.8s linear infinite;
        }

        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div className="simple-orbit"></div>
    </div>
  );
}
