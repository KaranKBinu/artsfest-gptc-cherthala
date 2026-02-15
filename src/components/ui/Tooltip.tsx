import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './Tooltip.module.css';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
}

const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    position = 'top',
    delay = 200
}) => {
    const [active, setActive] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const updateCoords = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
            });
        }
    };

    const showTip = () => {
        updateCoords();
        timerRef.current = setTimeout(() => {
            setActive(true);
        }, delay);
    };

    const hideTip = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setActive(false);
    };

    useEffect(() => {
        if (active) {
            updateCoords();
            // Close tooltip on scroll or resize to prevent misalignment
            const handleScroll = () => setActive(false);
            window.addEventListener('scroll', handleScroll, true);
            window.addEventListener('resize', handleScroll);
            return () => {
                window.removeEventListener('scroll', handleScroll, true);
                window.removeEventListener('resize', handleScroll);
            };
        }
    }, [active]);

    // Calculate fixed positioning based on the selected position prop
    const getTooltipStyle = (): React.CSSProperties => {
        const offset = 8;
        switch (position) {
            case 'top':
                return {
                    top: coords.top - offset,
                    left: coords.left + coords.width / 2,
                    transform: 'translate(-50%, -100%)'
                };
            case 'bottom':
                return {
                    top: coords.top + coords.height + offset,
                    left: coords.left + coords.width / 2,
                    transform: 'translate(-50%, 0)'
                };
            case 'left':
                return {
                    top: coords.top + coords.height / 2,
                    left: coords.left - offset,
                    transform: 'translate(-100%, -50%)'
                };
            case 'right':
                return {
                    top: coords.top + coords.height / 2,
                    left: coords.left + coords.width + offset,
                    transform: 'translate(0, -50%)'
                };
            default:
                return {};
        }
    };

    return (
        <>
            <div
                ref={triggerRef}
                className={styles.tooltipWrapper}
                onMouseEnter={showTip}
                onMouseLeave={hideTip}
            >
                {children}
            </div>
            {active && typeof document !== 'undefined' && createPortal(
                <div
                    className={`${styles.tooltipTip} ${styles[position]}`}
                    style={getTooltipStyle()}
                >
                    {content}
                </div>,
                document.body
            )}
        </>
    );
};

export default Tooltip;
