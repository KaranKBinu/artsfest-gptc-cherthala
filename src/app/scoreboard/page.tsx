'use client'

import { useEffect, useState } from 'react'
import { Cinzel, Inter } from 'next/font/google'
import styles from './scoreboard.module.css'
import { getHouseLeaderboard, getRecentResults } from '@/actions/results'

const cinzel = Cinzel({ subsets: ['latin'] })
const inter = Inter({ subsets: ['latin'] })

const AnimatedScore = ({ score, className }: { score: number, className?: string }) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [prevScore, setPrevScore] = useState(score);

    useEffect(() => {
        if (score !== prevScore) {
            setIsUpdating(true);
            setPrevScore(score);
            const timer = setTimeout(() => setIsUpdating(false), 1000);
            return () => clearTimeout(timer);
        }
    }, [score, prevScore]);

    return (
        <div className={`${className} ${isUpdating ? styles.scoreUpdating : ''}`}>
            {score}
        </div>
    );
};

function hexToRgb(hex: string | null) {
    if (!hex || !hex.startsWith('#')) return '212, 175, 55';
    try {
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
            r = parseInt(hex.slice(1, 3), 16);
            g = parseInt(hex.slice(3, 5), 16);
            b = parseInt(hex.slice(5, 7), 16);
        }
        return `${r}, ${g}, ${b}`;
    } catch {
        return '212, 175, 55';
    }
}

interface HouseScore {
    id: string
    name: string
    color: string | null
    score: number
    rank?: number
}

interface RecentResult {
    id: string
    programId: string
    userId: string
    groupName: string | null
    grade: string | null
    isGroup: boolean
    Program: { name: string }
    User: { fullName: string }
    House: { name: string; color: string | null }
    updatedAt: Date
}

// Helper to calculate dense ranks
function calculateRanks(houses: HouseScore[]): HouseScore[] {
    if (!houses.length) return [];

    // Sort just in case
    const sorted = [...houses].sort((a, b) => b.score - a.score);

    let currentRank = 1;
    let currentScore = sorted[0].score;

    return sorted.map((house, index) => {
        if (house.score < currentScore) {
            currentRank = index + 1; // Standard Competition Ranking (1, 1, 3, 4)
            // Use (currentRank++) for dense ranking (1, 1, 2, 3) if preferred, but usually competition rank is better for "Top 3" logic visually? 
            // Actually for visual podiums, "Tied for 1st" usually means they share the top spot. The next person is 3rd.
            // But let's stick to standard competition ranking: 1, 1, 3.
            // If we have 1, 1, 2... that's dense.
            // Let's use dense ranking for the PODIUM so we don't have empty slots if there's a tie for 1st.
            // e.g. 1st (A, B) -> 2nd (C) -> 3rd (D)
            // Dense ranking logic below:
            // currentRank++; 
            currentScore = house.score;
        }
        return { ...house, rank: currentRank };
    });
}

// DENSE RANKING VERSION for Podium visual
function calculateDenseRanks(houses: HouseScore[]): { rank1: HouseScore[], rank2: HouseScore[], rank3: HouseScore[], rest: HouseScore[] } {
    if (!houses.length) return { rank1: [], rank2: [], rank3: [], rest: [] };

    const uniqueScores = Array.from(new Set(houses.map(h => h.score))).sort((a, b) => b - a);

    const rank1Score = uniqueScores[0];
    const rank2Score = uniqueScores[1];
    const rank3Score = uniqueScores[2];

    const rank1 = houses.filter(h => h.score === rank1Score);
    const rank2 = houses.filter(h => h.score === rank2Score);
    const rank3 = houses.filter(h => h.score === rank3Score);

    // Anyone else is rest
    // If uniqueScores has < 3 items, some arrays will be empty, which is fine.
    const rest = houses.filter(h => h.score < (rank3Score ?? -9999));

    return { rank1, rank2, rank3, rest };
}

export default function ScoreboardPage() {
    const [scores, setScores] = useState<HouseScore[]>([])
    const [recentResults, setRecentResults] = useState<RecentResult[]>([])
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    const fetchData = async () => {
        try {
            const [leaderboardRes, resultsRes] = await Promise.all([
                getHouseLeaderboard(),
                getRecentResults()
            ])

            if (leaderboardRes.success && leaderboardRes.data) {
                setScores(leaderboardRes.data)
            }
            if (resultsRes.success && resultsRes.data) {
                setRecentResults(resultsRes.data as RecentResult[])
            }
            setLastUpdated(new Date())
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 10000) // Poll every 10 seconds
        return () => clearInterval(interval)
    }, [])

    if (loading) {
        return (
            <div className={`${styles.container} ${inter.className}`}>
                <div className={styles.loader}></div>
                <p style={{ marginTop: '1rem', opacity: 0.7 }}>Loading Scores...</p>
            </div>
        )
    }

    // Use Dense Ranking for visual podium placement
    const { rank1, rank2, rank3, rest } = calculateDenseRanks(scores);

    // Assign "real" ranks for the list view if needed, or just follow the flow
    // For the list view "rest", let's calculate their actual place.
    // If rank1 has 2 people, rank2 is visually "2nd" here (Silver), but technically 3rd? 
    // Let's stick to "1st Prize", "2nd Prize", "3rd Prize" logic which usually follows distinct score tiers in many festivals.
    // i.e. Everyone with top score gets Gold. Everyone with 2nd top score gets Silver.

    return (
        <div className={`${styles.container} ${inter.className}`}>
            <header className={styles.header}>
                <div className={styles.topNav}>
                    {/* Back Button */}
                    <a href="/" className={styles.backButton}>
                        ← Back
                    </a>

                    {/* Live Status */}
                    <div className={styles.liveStatusContainer}>
                        <div className={styles.liveIndicator}></div>
                        {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                    </div>
                </div>

                <h1 className={`${styles.title} ${cinzel.className}`}>Scoreboard</h1>
            </header>

            <main className={styles.mainLayout}>
                <section className={styles.scoreboardSection}>
                    <div className={styles.podiumSection}>
                        {/* 2nd Place Group */}
                        <div className={`${styles.podiumColumn} ${styles.secondPlace}`}>
                            <div className={styles.tieContainer}>
                                {rank2.map(house => (
                                    <div
                                        key={house.id}
                                        className={`${styles.podiumBar} ${styles.rank2}`}
                                        style={{
                                            '--house-color': house.color || '#C0C0C0',
                                            '--house-rgb': hexToRgb(house.color)
                                        } as React.CSSProperties}
                                    >
                                        <div className={`${styles.rankLabel} ${styles.r2}`}>2</div>
                                        <div className={`${styles.houseName} ${cinzel.className}`}>{house.name}</div>
                                        <AnimatedScore score={house.score} className={styles.houseScore} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 1st Place Group */}
                        <div className={`${styles.podiumColumn} ${styles.firstPlace}`}>
                            {rank1.length > 0 ? (
                                <>
                                    <div className={styles.crown}>👑</div>
                                    <div className={styles.tieContainer}>
                                        {rank1.map(house => (
                                            <div
                                                key={house.id}
                                                className={`${styles.podiumBar} ${styles.rank1}`}
                                                style={{
                                                    '--house-color': house.color || '#D4AF37',
                                                    '--house-rgb': hexToRgb(house.color)
                                                } as React.CSSProperties}
                                            >
                                                <div className={`${styles.rankLabel} ${styles.r1}`}>1</div>
                                                <div className={`${styles.houseName} ${cinzel.className}`}>{house.name}</div>
                                                <AnimatedScore score={house.score} className={styles.houseScore} />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className={styles.loader}></div>
                            )}
                        </div>

                        {/* 3rd Place Group */}
                        <div className={`${styles.podiumColumn} ${styles.thirdPlace}`}>
                            <div className={styles.tieContainer}>
                                {rank3.map(house => (
                                    <div
                                        key={house.id}
                                        className={`${styles.podiumBar} ${styles.rank3}`}
                                        style={{
                                            '--house-color': house.color || '#CD7F32',
                                            '--house-rgb': hexToRgb(house.color)
                                        } as React.CSSProperties}
                                    >
                                        <div className={`${styles.rankLabel} ${styles.r3}`}>3</div>
                                        <div className={`${styles.houseName} ${cinzel.className}`}>{house.name}</div>
                                        <AnimatedScore score={house.score} className={styles.houseScore} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className={styles.listSection}>
                        {rest.map((house, index) => {
                            const displayRank = rank1.length + rank2.length + rank3.length + index + 1;
                            return (
                                <div
                                    key={house.id}
                                    className={styles.listRow}
                                    style={{
                                        '--house-color': house.color || 'var(--primary-gold)',
                                        '--house-rgb': hexToRgb(house.color)
                                    } as React.CSSProperties}
                                >
                                    <div className={`${styles.listRank} ${cinzel.className}`}>#{displayRank}</div>
                                    <div className={styles.listName}>{house.name}</div>
                                    <AnimatedScore score={house.score} className={styles.listScore} />
                                </div>
                            )
                        })}
                    </div>
                </section>

                <section className={styles.liveResultsSection}>
                    <div className={styles.liveResultsHeader}>
                        <span className={styles.livePulse}></span>
                        LIVE RESULTS
                    </div>
                    <div className={styles.liveResultsFeed}>
                        {recentResults.map(result => (
                            <div key={result.id} className={styles.resultCard}>
                                <div className={styles.resultHouseIndicator} style={{ backgroundColor: result.House.color || '#D4AF37' }}></div>
                                <div className={styles.resultInfo}>
                                    <div className={styles.resultHeader}>
                                        <span className={styles.resultParticipant}>
                                            {result.isGroup ? result.groupName : result.User.fullName}
                                        </span>
                                        <span className={styles.resultGrade} data-grade={result.grade}>
                                            {result.grade?.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className={styles.resultProgram}>{result.Program.name}</div>
                                    <div className={styles.resultHouseName}>{result.House.name}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    )
}
