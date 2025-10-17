/**
 * Grant Swipe Interface
 * Tinder-style grant review for BRIDGE CRM
 */

class GrantSwipeInterface {
  constructor() {
    this.grants = [];
    this.currentIndex = 0;
    this.swipeHistory = [];
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.isDragging = false;
  }
  
  async init() {
    await this.loadGrants();
    this.render();
    this.attachEventListeners();
  }
  
  async loadGrants() {
    try {
      const response = await fetch('/api/grants?status=prospecting&minScore=60');
      const data = await response.json();
      
      if (data.success) {
        this.grants = data.data;
        this.currentIndex = 0;
      }
    } catch (error) {
      console.error('Error loading grants:', error);
    }
  }
  
  render() {
    const container = document.getElementById('grant-swipe-container');
    
    if (!container) {
      console.error('Grant swipe container not found');
      return;
    }
    
    container.innerHTML = `
      <div class="grant-swipe-wrapper">
        <div class="grant-swipe-header">
          <h2>💰 Grant Opportunities</h2>
          <div class="grant-swipe-stats">
            <span>${this.currentIndex + 1} / ${this.grants.length}</span>
          </div>
        </div>
        
        <div class="grant-card-stack">
          ${this.renderGrantCards()}
        </div>
        
        <div class="grant-swipe-actions">
          <button class="swipe-btn swipe-pass" data-action="pass">
            <span class="icon">❌</span>
            <span class="label">Pass</span>
          </button>
          <button class="swipe-btn swipe-maybe" data-action="maybe">
            <span class="icon">⏸️</span>
            <span class="label">Maybe</span>
          </button>
          <button class="swipe-btn swipe-apply" data-action="apply">
            <span class="icon">✅</span>
            <span class="label">Apply</span>
          </button>
          <button class="swipe-btn swipe-priority" data-action="priority">
            <span class="icon">⭐</span>
            <span class="label">Priority</span>
          </button>
        </div>
        
        <div class="grant-swipe-keyboard-hints">
          <span>Keyboard: ← Pass | ↓ Maybe | → Apply | ↑ Priority | Z Undo</span>
        </div>
        
        <button class="grant-swipe-undo" id="grant-undo-btn" disabled>
          ↩️ Undo
        </button>
      </div>
    `;
  }
  
  renderGrantCards() {
    if (this.grants.length === 0) {
      return '<div class="no-grants">🎉 No more grants to review!</div>';
    }
    
    // Render current card and next 2 cards (for stack effect)
    let html = '';
    for (let i = this.currentIndex; i < Math.min(this.currentIndex + 3, this.grants.length); i++) {
      const grant = this.grants[i];
      const isActive = i === this.currentIndex;
      const zIndex = 3 - (i - this.currentIndex);
      const scale = 1 - (i - this.currentIndex) * 0.05;
      
      html += `
        <div class="grant-card ${isActive ? 'active' : ''}" 
             data-index="${i}"
             style="z-index: ${zIndex}; transform: scale(${scale})">
          ${this.renderGrantCard(grant)}
        </div>
      `;
    }
    
    return html;
  }
  
  renderGrantCard(grant) {
    const matchReasons = JSON.parse(grant.match_reasons || '[]');
    const keywords = JSON.parse(grant.mission_keywords || '[]');
    const deadline = new Date(grant.deadline);
    const daysUntil = Math.floor((deadline - new Date()) / (1000 * 60 * 60 * 24));
    
    // Calculate grant impact (% of annual budget)
    const avgAmount = (grant.amount_min + grant.amount_max) / 2;
    const budgetImpact = ((avgAmount / 750000) * 100).toFixed(1);
    
    return `
      <div class="grant-card-inner">
        <div class="grant-card-header">
          <div class="grant-funder-logo">
            ${this.getFunderIcon(grant.funder_type)}
          </div>
          <div class="grant-card-title">
            <h3>${grant.title}</h3>
            <p class="grant-funder">${grant.funder}</p>
          </div>
          <div class="grant-match-score ${this.getScoreClass(grant.match_score)}">
            <div class="score-circle">
              <span class="score-value">${grant.match_score}</span>
              <span class="score-label">%</span>
            </div>
            <div class="score-stars">${this.renderStars(grant.match_score)}</div>
          </div>
        </div>
        
        <div class="grant-card-body">
          <div class="grant-quick-facts">
            <div class="grant-fact">
              <span class="fact-icon">💵</span>
              <span class="fact-label">Funding</span>
              <span class="fact-value">$${this.formatAmount(grant.amount_min)} - $${this.formatAmount(grant.amount_max)}</span>
            </div>
            <div class="grant-fact">
              <span class="fact-icon">📅</span>
              <span class="fact-label">Deadline</span>
              <span class="fact-value ${daysUntil < 30 ? 'urgent' : ''}">${deadline.toLocaleDateString()} (${daysUntil} days)</span>
            </div>
            <div class="grant-fact">
              <span class="fact-icon">📍</span>
              <span class="fact-label">Geographic Focus</span>
              <span class="fact-value">${grant.geographic_focus || 'National'}</span>
            </div>
            ${grant.cfda_number ? `
            <div class="grant-fact">
              <span class="fact-icon">🔢</span>
              <span class="fact-label">CFDA</span>
              <span class="fact-value">${grant.cfda_number}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="grant-why-good-fit">
            <h4>✨ Why It's a Good Fit:</h4>
            <ul class="match-reasons">
              ${matchReasons.map(reason => `<li>✅ ${reason}</li>`).join('')}
            </ul>
          </div>
          
          ${keywords.length > 0 ? `
          <div class="grant-keywords">
            <h4>🏷️ Keywords:</h4>
            <div class="keyword-tags">
              ${keywords.map(kw => `<span class="keyword-tag">${kw}</span>`).join('')}
            </div>
          </div>
          ` : ''}
          
          <div class="grant-impact-metrics">
            <div class="impact-metric">
              <span class="metric-label">Grant Impact</span>
              <span class="metric-value">${budgetImpact}% of annual budget</span>
            </div>
            <div class="impact-metric">
              <span class="metric-label">Potential Chromebooks</span>
              <span class="metric-value">${Math.floor(avgAmount / 150)} units</span>
            </div>
          </div>
          
          <div class="grant-description">
            <h4>📄 Description:</h4>
            <p>${this.truncateText(grant.description, 300)}</p>
            ${grant.url ? `<a href="${grant.url}" target="_blank" class="grant-link">View Full Opportunity →</a>` : ''}
          </div>
        </div>
      </div>
    `;
  }
  
  getFunderIcon(funderType) {
    const icons = {
      federal: '🏛️',
      state: '🏢',
      foundation: '🏦',
      corporate: '🏭'
    };
    return icons[funderType] || '💼';
  }
  
  getScoreClass(score) {
    if (score >= 90) return 'score-excellent';
    if (score >= 80) return 'score-great';
    if (score >= 70) return 'score-good';
    if (score >= 60) return 'score-fair';
    return 'score-poor';
  }
  
  renderStars(score) {
    const stars = Math.round(score / 20); // 0-5 stars
    return '⭐'.repeat(stars) + '☆'.repeat(5 - stars);
  }
  
  formatAmount(amount) {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return amount.toString();
  }
  
  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
  
  attachEventListeners() {
    // Button clicks
    document.querySelectorAll('.swipe-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.handleSwipe(action);
      });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch(e.key) {
        case 'ArrowLeft':
          this.handleSwipe('pass');
          break;
        case 'ArrowRight':
          this.handleSwipe('apply');
          break;
        case 'ArrowUp':
          this.handleSwipe('priority');
          break;
        case 'ArrowDown':
          this.handleSwipe('maybe');
          break;
        case 'z':
        case 'Z':
          this.undo();
          break;
      }
    });
    
    // Touch/mouse swipe
    const cardStack = document.querySelector('.grant-card-stack');
    if (cardStack) {
      cardStack.addEventListener('mousedown', this.handleDragStart.bind(this));
      cardStack.addEventListener('touchstart', this.handleDragStart.bind(this));
      cardStack.addEventListener('mousemove', this.handleDragMove.bind(this));
      cardStack.addEventListener('touchmove', this.handleDragMove.bind(this));
      cardStack.addEventListener('mouseup', this.handleDragEnd.bind(this));
      cardStack.addEventListener('touchend', this.handleDragEnd.bind(this));
    }
    
    // Undo button
    const undoBtn = document.getElementById('grant-undo-btn');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => this.undo());
    }
  }
  
  handleDragStart(e) {
    const touch = e.touches ? e.touches[0] : e;
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.isDragging = true;
  }
  
  handleDragMove(e) {
    if (!this.isDragging) return;
    
    const touch = e.touches ? e.touches[0] : e;
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    
    const activeCard = document.querySelector('.grant-card.active');
    if (activeCard) {
      activeCard.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(${deltaX * 0.1}deg)`;
      
      // Show visual feedback
      if (Math.abs(deltaX) > 100) {
        if (deltaX > 0) {
          activeCard.classList.add('swiping-right');
        } else {
          activeCard.classList.add('swiping-left');
        }
      }
    }
  }
  
  handleDragEnd(e) {
    if (!this.isDragging) return;
    this.isDragging = false;
    
    const touch = e.changedTouches ? e.changedTouches[0] : e;
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    
    const activeCard = document.querySelector('.grant-card.active');
    if (activeCard) {
      activeCard.classList.remove('swiping-left', 'swiping-right');
      
      // Determine action based on swipe
      if (Math.abs(deltaX) > 150) {
        if (deltaX > 0) {
          this.handleSwipe('apply');
        } else {
          this.handleSwipe('pass');
        }
      } else if (deltaY > 150) {
        this.handleSwipe('maybe');
      } else if (deltaY < -150) {
        this.handleSwipe('priority');
      } else {
        // Reset card position
        activeCard.style.transform = '';
      }
    }
  }
  
  async handleSwipe(action) {
    if (this.currentIndex >= this.grants.length) return;
    
    const grant = this.grants[this.currentIndex];
    const activeCard = document.querySelector('.grant-card.active');
    
    // Animate card out
    if (activeCard) {
      activeCard.classList.add(`swipe-${action}`);
    }
    
    // Save to history
    this.swipeHistory.push({
      grant: grant,
      action: action,
      index: this.currentIndex
    });
    
    // Send action to server
    await this.processSwipeAction(grant, action);
    
    // Move to next card
    setTimeout(() => {
      this.currentIndex++;
      this.render();
      this.attachEventListeners();
      this.updateUndoButton();
      
      // Check if finished
      if (this.currentIndex >= this.grants.length) {
        this.showCompletionMessage();
      }
    }, 300);
  }
  
  async processSwipeAction(grant, action) {
    try {
      switch(action) {
        case 'apply':
          await fetch(`/api/grants/${grant.id}/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 1 }) // TODO: Get from auth
          });
          break;
        
        case 'pass':
          await fetch(`/api/grants/${grant.id}/dismiss`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'Not interested' })
          });
          break;
        
        case 'maybe':
          // TODO: Add to "watch later" list
          break;
        
        case 'priority':
          await fetch(`/api/grants/${grant.id}/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 1, priority: 'urgent' })
          });
          break;
      }
    } catch (error) {
      console.error('Error processing swipe:', error);
    }
  }
  
  undo() {
    if (this.swipeHistory.length === 0) return;
    
    const lastSwipe = this.swipeHistory.pop();
    this.currentIndex = lastSwipe.index;
    
    this.render();
    this.attachEventListeners();
    this.updateUndoButton();
  }
  
  updateUndoButton() {
    const undoBtn = document.getElementById('grant-undo-btn');
    if (undoBtn) {
      undoBtn.disabled = this.swipeHistory.length === 0;
    }
  }
  
  showCompletionMessage() {
    const container = document.getElementById('grant-swipe-container');
    container.innerHTML = `
      <div class="grant-swipe-complete">
        <div class="completion-animation">🎉</div>
        <h2>All Caught Up!</h2>
        <p>You've reviewed all available grant opportunities.</p>
        <div class="completion-stats">
          <div class="stat">
            <span class="stat-value">${this.swipeHistory.filter(s => s.action === 'apply' || s.action === 'priority').length}</span>
            <span class="stat-label">Applications Started</span>
          </div>
          <div class="stat">
            <span class="stat-value">${this.swipeHistory.filter(s => s.action === 'pass').length}</span>
            <span class="stat-label">Passed</span>
          </div>
          <div class="stat">
            <span class="stat-value">${this.swipeHistory.filter(s => s.action === 'maybe').length}</span>
            <span class="stat-label">Saved for Later</span>
          </div>
        </div>
        <button class="btn-primary" onclick="location.reload()">Refresh Grants</button>
      </div>
    `;
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('grant-swipe-container')) {
      const grantSwipe = new GrantSwipeInterface();
      grantSwipe.init();
    }
  });
} else {
  if (document.getElementById('grant-swipe-container')) {
    const grantSwipe = new GrantSwipeInterface();
    grantSwipe.init();
  }
}

