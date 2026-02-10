'use client';

import React from 'react';

export default function LoadingSpinner({ size = '24px', color = 'currentColor' }: { size?: string, color?: string }) {
    return (
        <div style={{
            display: 'inline-block',
            width: size,
            height: size,
            border: `2px solid transparent`,
            borderTop: `2px solid ${color}`,
            borderLeft: `2px solid ${color}`,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
        }}>
            <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
