import React, { useState } from 'react';
import styles from './Tooltip.module.css';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
    className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    position = 'top',
    delay = 200,
    className = ''
}) => {
    const [active, setActive] = useState(false);
    let timeout: NodeJS.Timeout;

    const showTip = () => {
        timeout = setTimeout(() => {
            setActive(true);
        }, delay);
    };

    const hideTip = () => {
        if (timeout) clearTimeout(timeout);
        setActive(false);
    };

    return (
        <div
            className={`${styles.tooltipWrapper} ${className}`}
            onMouseEnter={showTip}
            onMouseLeave={hideTip}
        >
            {children}
            {active && (
                <div className={`${styles.tooltipTip} ${styles[position]}`}>
                    {content}
                </div>
            )}
        </div>
    );
};

export default Tooltip;
