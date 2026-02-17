'use client'

import { useEffect, useState } from 'react'
import { Cinzel, Inter } from 'next/font/google'
import styles from './scoreboard.module.css'
import { getHouseLeaderboard } from '@/actions/results'

const cinzel = Cinzel({ subsets: ['latin'] })
const inter = Inter({ subsets: ['latin'] })

interface HouseScore {
    id: string
    name: string
    color: string | null
    score: number
    rank?: number
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
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    const fetchScores = async () => {
        try {
            const res = await getHouseLeaderboard()
            if (res.success && res.data) {
                setScores(res.data)
                setLastUpdated(new Date())
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchScores()
        const interval = setInterval(fetchScores, 10000) // Poll every 10 seconds
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
                <h1 className={`${styles.title} ${cinzel.className}`}>Live Scoreboard</h1>

                {/* Back Button (Top Left) */}
                <a href="/" className={styles.backButton}>
                    ← Back to Home
                </a>

                {/* Live Status (Top Right) */}
                <div className={styles.liveStatusContainer}>
                    <div className={styles.liveIndicator}></div>
                    {lastUpdated ? `Updated: ${lastUpdated.toLocaleTimeString()}` : 'Connecting...'}
                </div>
            </header>

            <div className={styles.podiumSection}>
                {/* 2nd Place Group */}
                <div className={`${styles.podiumColumn} ${styles.secondPlace}`}>
                    <div className={styles.tieContainer}>
                        {rank2.map(house => (
                            <div key={house.id} className={`${styles.podiumBar} ${styles.rank2}`}>
                                <div className={`${styles.rankLabel} ${styles.r2}`}>2</div>
                                <div className={`${styles.houseName} ${cinzel.className}`}>{house.name}</div>
                                <div className={styles.houseScore}>{house.score}</div>
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
                                    <div key={house.id} className={`${styles.podiumBar} ${styles.rank1}`}>
                                        <div className={`${styles.rankLabel} ${styles.r1}`}>1</div>
                                        <div className={`${styles.houseName} ${cinzel.className}`}>{house.name}</div>
                                        <div className={styles.houseScore}>{house.score}</div>
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
                            <div key={house.id} className={`${styles.podiumBar} ${styles.rank3}`}>
                                <div className={`${styles.rankLabel} ${styles.r3}`}>3</div>
                                <div className={`${styles.houseName} ${cinzel.className}`}>{house.name}</div>
                                <div className={styles.houseScore}>{house.score}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className={styles.listSection}>
                {rest.map((house, index) => {
                    // Calculate relative rank
                    // 1st tier (rank1.length), 2nd tier (rank2.length), 3rd tier (rank3.length)
                    // So start rank is 4? Or based on actual count?
                    // Let's just show "#" + (Rank 1 + Rank 2 + Rank 3 + index + 1)
                    // Or simplified: Just 4, 5, 6...
                    const displayRank = rank1.length + rank2.length + rank3.length + index + 1;
                    return (
                        <div key={house.id} className={styles.listRow}>
                            <div className={`${styles.listRank} ${cinzel.className}`}>#{displayRank}</div>
                            <div className={styles.listName}>{house.name}</div>
                            <div className={styles.listScore}>{house.score}</div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
