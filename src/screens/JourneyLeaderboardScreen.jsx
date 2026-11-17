import { CSS } from './Home'
import JourneyLeaderboard from '../components/JourneyLeaderboard'

/** The Journey leaderboard on its own screen, opened from the Home tile. */
export default function JourneyLeaderboardScreen({ womanId }) {
  return (
    <div className="shell fade-in home">
      <style>{CSS}</style>
      <div className="home-hero">
        <div className="home-eyebrow">✦ IMARA Journey</div>
        <h1>leaderboard</h1>
        <p>Who is leading, week by week</p>
      </div>
      <div className="home-body">
        <JourneyLeaderboard womanId={womanId} />
      </div>
    </div>
  )
}
