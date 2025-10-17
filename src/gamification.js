/**
 * BRIDGE CRM - Gamification System
 * Points, badges, leaderboards, and achievements
 */

export class GamificationSystem {
  constructor() {
    this.POINTS = {
      LEAD_SWIPE: 1,
      LEAD_CONTACT: 5,
      LEAD_QUALIFIED: 10,
      LEAD_COMMITTED: 25,
      DONATION_RECEIVED: 50,
      CHROMEBOOK_DELIVERED: 2, // Per Chromebook
      DAILY_LOGIN: 5,
      STREAK_BONUS: 10, // Per day of streak
      TEAM_COLLABORATION: 3,
      NOTE_ADDED: 2,
      FOLLOW_UP_COMPLETED: 5
    };
    
    this.LEVELS = [
      { level: 1, name: 'Rookie', minPoints: 0, icon: '🌱' },
      { level: 2, name: 'Contributor', minPoints: 100, icon: '🌿' },
      { level: 3, name: 'Achiever', minPoints: 250, icon: '🌳' },
      { level: 4, name: 'Champion', minPoints: 500, icon: '⭐' },
      { level: 5, name: 'Hero', minPoints: 1000, icon: '🏆' },
      { level: 6, name: 'Legend', minPoints: 2500, icon: '👑' },
      { level: 7, name: 'Master', minPoints: 5000, icon: '💎' },
      { level: 8, name: 'Grand Master', minPoints: 10000, icon: '🔥' }
    ];
    
    this.ACHIEVEMENTS = [
      {
        id: 'first_swipe',
        name: 'First Swipe',
        description: 'Reviewed your first lead',
        icon: '👋',
        points: 10,
        condition: (stats) => stats.totalSwipes >= 1
      },
      {
        id: 'swipe_master',
        name: 'Swipe Master',
        description: 'Reviewed 100 leads',
        icon: '💪',
        points: 50,
        condition: (stats) => stats.totalSwipes >= 100
      },
      {
        id: 'first_contact',
        name: 'First Contact',
        description: 'Made your first outreach',
        icon: '📧',
        points: 25,
        condition: (stats) => stats.totalContacts >= 1
      },
      {
        id: 'networking_ninja',
        name: 'Networking Ninja',
        description: 'Contacted 50 leads',
        icon: '🥷',
        points: 100,
        condition: (stats) => stats.totalContacts >= 50
      },
      {
        id: 'first_donation',
        name: 'First Donation',
        description: 'Secured your first donation',
        icon: '🎉',
        points: 100,
        condition: (stats) => stats.totalDonations >= 1
      },
      {
        id: 'hundred_chromebooks',
        name: '100 Chromebooks',
        description: 'Helped deliver 100 Chromebooks',
        icon: '💻',
        points: 200,
        condition: (stats) => stats.totalChromebooks >= 100
      },
      {
        id: 'five_hundred_chromebooks',
        name: '500 Chromebooks',
        description: 'Helped deliver 500 Chromebooks',
        icon: '🚀',
        points: 500,
        condition: (stats) => stats.totalChromebooks >= 500
      },
      {
        id: 'thousand_chromebooks',
        name: '1,000 Chromebooks',
        description: 'Helped deliver 1,000 Chromebooks',
        icon: '🏆',
        points: 1000,
        condition: (stats) => stats.totalChromebooks >= 1000
      },
      {
        id: 'week_streak',
        name: 'Week Warrior',
        description: '7-day activity streak',
        icon: '🔥',
        points: 50,
        condition: (stats) => stats.currentStreak >= 7
      },
      {
        id: 'month_streak',
        name: 'Month Master',
        description: '30-day activity streak',
        icon: '💥',
        points: 200,
        condition: (stats) => stats.currentStreak >= 30
      },
      {
        id: 'raleigh_dominator',
        name: 'Raleigh Dominator',
        description: 'Secured 10 Raleigh-area donations',
        icon: '🏙️',
        points: 150,
        condition: (stats) => stats.raleighDonations >= 10
      },
      {
        id: 'law_firm_specialist',
        name: 'Law Firm Specialist',
        description: 'Secured 5 law firm donations',
        icon: '⚖️',
        points: 100,
        condition: (stats) => stats.lawFirmDonations >= 5
      },
      {
        id: 'speed_demon',
        name: 'Speed Demon',
        description: 'Reviewed 50 leads in one day',
        icon: '⚡',
        points: 75,
        condition: (stats) => stats.maxSwipesInDay >= 50
      },
      {
        id: 'team_player',
        name: 'Team Player',
        description: 'Collaborated on 25 leads',
        icon: '🤝',
        points: 50,
        condition: (stats) => stats.collaborations >= 25
      },
      {
        id: 'note_taker',
        name: 'Note Taker',
        description: 'Added 100 notes',
        icon: '📝',
        points: 50,
        condition: (stats) => stats.notesAdded >= 100
      },
      {
        id: 'early_bird',
        name: 'Early Bird',
        description: 'Logged in before 7am 10 times',
        icon: '🌅',
        points: 30,
        condition: (stats) => stats.earlyLogins >= 10
      },
      {
        id: 'night_owl',
        name: 'Night Owl',
        description: 'Logged in after 10pm 10 times',
        icon: '🦉',
        points: 30,
        condition: (stats) => stats.lateLogins >= 10
      }
    ];
  }
  
  /**
   * Award points for an action
   */
  awardPoints(userId, action, metadata = {}) {
    const points = this.POINTS[action] || 0;
    
    if (points === 0) {
      console.warn(`Unknown action: ${action}`);
      return null;
    }
    
    // Special case: Chromebooks delivered (multiply by count)
    const actualPoints = action === 'CHROMEBOOK_DELIVERED' 
      ? points * (metadata.count || 1)
      : points;
    
    const event = {
      userId,
      action,
      points: actualPoints,
      metadata,
      timestamp: new Date().toISOString()
    };
    
    // Store in database (would be implemented in backend)
    this.logPointEvent(event);
    
    // Check for level up
    const newLevel = this.checkLevelUp(userId);
    
    // Check for achievements
    const newAchievements = this.checkAchievements(userId);
    
    return {
      points: actualPoints,
      newLevel,
      newAchievements,
      celebration: newLevel || newAchievements.length > 0
    };
  }
  
  /**
   * Get user's current level
   */
  getUserLevel(totalPoints) {
    let currentLevel = this.LEVELS[0];
    
    for (const level of this.LEVELS) {
      if (totalPoints >= level.minPoints) {
        currentLevel = level;
      } else {
        break;
      }
    }
    
    // Calculate progress to next level
    const nextLevelIndex = this.LEVELS.findIndex(l => l.level === currentLevel.level) + 1;
    const nextLevel = nextLevelIndex < this.LEVELS.length ? this.LEVELS[nextLevelIndex] : null;
    
    const progress = nextLevel 
      ? ((totalPoints - currentLevel.minPoints) / (nextLevel.minPoints - currentLevel.minPoints)) * 100
      : 100;
    
    return {
      ...currentLevel,
      progress: Math.round(progress),
      nextLevel,
      pointsToNext: nextLevel ? nextLevel.minPoints - totalPoints : 0
    };
  }
  
  /**
   * Check if user leveled up
   */
  checkLevelUp(userId) {
    // Would query database for user's total points
    // For now, return null
    return null;
  }
  
  /**
   * Check for new achievements
   */
  checkAchievements(userId) {
    // Would query database for user's stats
    // Compare against achievement conditions
    // Return array of newly unlocked achievements
    return [];
  }
  
  /**
   * Get leaderboard
   */
  getLeaderboard(timeframe = 'all', limit = 10) {
    // Timeframes: 'all', 'month', 'week', 'day'
    // Would query database and aggregate points
    
    return {
      timeframe,
      updated: new Date().toISOString(),
      leaders: [
        // Example data
        { rank: 1, userId: 'user1', name: 'Will Sigmon', points: 2547, level: 6, avatar: '👨‍💼' },
        { rank: 2, userId: 'user2', name: 'Mark', points: 1823, level: 5, avatar: '👨' },
        { rank: 3, userId: 'user3', name: 'Rachel', points: 1456, level: 5, avatar: '👩' },
        { rank: 4, userId: 'user4', name: 'Dee', points: 987, level: 4, avatar: '👩‍💼' },
        { rank: 5, userId: 'user5', name: 'Ron', points: 654, level: 3, avatar: '👨‍💼' }
      ]
    };
  }
  
  /**
   * Get user's achievements
   */
  getUserAchievements(userId) {
    // Would query database for user's unlocked achievements
    
    return {
      unlocked: [],
      locked: this.ACHIEVEMENTS,
      totalPoints: 0,
      progress: 0 // Percentage of achievements unlocked
    };
  }
  
  /**
   * Calculate user stats
   */
  calculateUserStats(userId) {
    // Would aggregate from database
    
    return {
      totalPoints: 0,
      totalSwipes: 0,
      totalContacts: 0,
      totalDonations: 0,
      totalChromebooks: 0,
      currentStreak: 0,
      longestStreak: 0,
      raleighDonations: 0,
      lawFirmDonations: 0,
      maxSwipesInDay: 0,
      collaborations: 0,
      notesAdded: 0,
      earlyLogins: 0,
      lateLogins: 0
    };
  }
  
  /**
   * Update daily streak
   */
  updateStreak(userId) {
    // Check if user was active yesterday
    // If yes, increment streak
    // If no, reset streak to 1
    // Award streak bonus points
    
    const streakBonus = this.POINTS.STREAK_BONUS;
    
    return {
      currentStreak: 1,
      bonusPoints: streakBonus
    };
  }
  
  /**
   * Log point event (would save to database)
   */
  logPointEvent(event) {
    console.log('Point Event:', event);
    // In production, save to database
  }
  
  /**
   * Render achievement badge HTML
   */
  renderAchievementBadge(achievement, unlocked = false) {
    const opacity = unlocked ? '1' : '0.3';
    const filter = unlocked ? '' : 'grayscale(100%)';
    
    return `
      <div class="achievement-badge ${unlocked ? 'unlocked' : 'locked'}" 
           style="opacity: ${opacity}; filter: ${filter};"
           title="${achievement.description}">
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-name">${achievement.name}</div>
        <div class="achievement-points">+${achievement.points} pts</div>
      </div>
    `;
  }
  
  /**
   * Render level badge
   */
  renderLevelBadge(level) {
    return `
      <div class="level-badge level-${level.level}">
        <div class="level-icon">${level.icon}</div>
        <div class="level-name">${level.name}</div>
        <div class="level-number">Level ${level.level}</div>
      </div>
    `;
  }
  
  /**
   * Render leaderboard
   */
  renderLeaderboard(leaderboard) {
    const rows = leaderboard.leaders.map(leader => `
      <tr class="leaderboard-row ${leader.rank <= 3 ? 'top-three' : ''}">
        <td class="rank">
          ${leader.rank === 1 ? '🥇' : leader.rank === 2 ? '🥈' : leader.rank === 3 ? '🥉' : leader.rank}
        </td>
        <td class="avatar">${leader.avatar}</td>
        <td class="name">${leader.name}</td>
        <td class="level">${this.getUserLevel(leader.points).icon} ${this.getUserLevel(leader.points).name}</td>
        <td class="points">${leader.points.toLocaleString()} pts</td>
      </tr>
    `).join('');
    
    return `
      <div class="leaderboard">
        <div class="leaderboard-header">
          <h3>🏆 Leaderboard</h3>
          <div class="leaderboard-timeframe">${leaderboard.timeframe}</div>
        </div>
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th></th>
              <th>Name</th>
              <th>Level</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }
  
  /**
   * Show celebration animation
   */
  showCelebration(type = 'achievement') {
    // Would trigger confetti or other celebration animation
    console.log(`🎉 Celebration: ${type}`);
    
    if (typeof confetti !== 'undefined') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }
  
  /**
   * Get daily challenge
   */
  getDailyChallenge() {
    const challenges = [
      { id: 'swipe_10', name: 'Swipe 10 leads', target: 10, reward: 25, icon: '👆' },
      { id: 'contact_5', name: 'Contact 5 leads', target: 5, reward: 50, icon: '📧' },
      { id: 'note_10', name: 'Add 10 notes', target: 10, reward: 30, icon: '📝' },
      { id: 'qualify_3', name: 'Qualify 3 leads', target: 3, reward: 75, icon: '✅' }
    ];
    
    // Rotate daily based on day of year
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const todayChallenge = challenges[dayOfYear % challenges.length];
    
    return {
      ...todayChallenge,
      progress: 0,
      complete: false
    };
  }
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GamificationSystem };
}

