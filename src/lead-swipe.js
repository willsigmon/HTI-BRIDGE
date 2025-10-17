/**
 * HTI-BRIDGE CRM - Lead Swipe Interface
 * Tinder-style swipe interface for quick lead qualification
 */

export class LeadSwipeInterface {
  constructor(container, leads, callbacks) {
    this.container = container;
    this.leads = leads;
    this.currentIndex = 0;
    this.callbacks = callbacks || {};
    
    // Swipe state
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
    
    // History for undo
    this.history = [];
    
    this.render();
    this.attachEventListeners();
  }
  
  getCurrentLead() {
    return this.leads[this.currentIndex];
  }
  
  hasMoreLeads() {
    return this.currentIndex < this.leads.length;
  }
  
  render() {
    const lead = this.getCurrentLead();
    
    if (!lead) {
      this.renderComplete();
      return;
    }
    
    const matchReasons = lead.customFields?.matchReasons || [];
    const grantImpact = lead.customFields?.grantImpactPercent || 0;
    const distance = lead.customFields?.distanceFromHTI || 0;
    const chromebooks = lead.customFields?.expectedChromebooks || 0;
    
    // Calculate match percentage (use score)
    const matchPercent = lead.score || 50;
    const matchStars = '⭐'.repeat(Math.ceil(matchPercent / 20));
    
    // Determine match quality
    let matchQuality = 'Good Match';
    let matchColor = '#3B82F6';
    if (matchPercent >= 90) {
      matchQuality = 'Excellent Match!';
      matchColor = '#10B981';
    } else if (matchPercent >= 75) {
      matchQuality = 'Great Match';
      matchColor = '#059669';
    } else if (matchPercent < 60) {
      matchQuality = 'Possible Match';
      matchColor = '#F59E0B';
    }
    
    this.container.innerHTML = `
      <div class="lead-swipe-container">
        <!-- Progress Bar -->
        <div class="swipe-progress">
          <div class="swipe-progress-bar" style="width: ${(this.currentIndex / this.leads.length) * 100}%"></div>
          <div class="swipe-progress-text">${this.currentIndex + 1} / ${this.leads.length}</div>
        </div>
        
        <!-- Swipe Card -->
        <div class="swipe-card-wrapper">
          <div class="swipe-card" id="current-swipe-card">
            <!-- Company Header -->
            <div class="swipe-card-header">
              <div class="company-logo">
                <div class="company-icon">${this.getCompanyIcon(lead)}</div>
              </div>
              <div class="company-info">
                <h2 class="company-name">${lead.company || lead.name}</h2>
                <p class="company-location">📍 ${lead.customFields?.headquarters || 'Location TBD'}</p>
                <p class="company-distance">${distance} miles from Henderson</p>
              </div>
            </div>
            
            <!-- Match Score -->
            <div class="match-score" style="background: ${matchColor}">
              <span class="match-stars">${matchStars}</span>
              <span class="match-percent">${matchPercent}% ${matchQuality}</span>
            </div>
            
            <!-- Key Stats -->
            <div class="lead-stats">
              <div class="stat-item">
                <div class="stat-icon">💻</div>
                <div class="stat-value">${chromebooks}</div>
                <div class="stat-label">Chromebooks/year</div>
              </div>
              <div class="stat-item">
                <div class="stat-icon">🎯</div>
                <div class="stat-value">${grantImpact.toFixed(1)}%</div>
                <div class="stat-label">Grant Impact</div>
              </div>
              <div class="stat-item">
                <div class="stat-icon">📏</div>
                <div class="stat-value">${distance}mi</div>
                <div class="stat-label">Distance</div>
              </div>
            </div>
            
            <!-- Why They're a Good Fit -->
            <div class="match-reasons">
              <h3>Why They're a Good Fit:</h3>
              <ul class="reasons-list">
                ${matchReasons.map(reason => `<li>${reason}</li>`).join('')}
              </ul>
            </div>
            
            <!-- Company Details -->
            <div class="company-details">
              <div class="detail-row">
                <span class="detail-label">Industry:</span>
                <span class="detail-value">${lead.customFields?.industry || 'Unknown'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Employees:</span>
                <span class="detail-value">${(lead.customFields?.employees || 0).toLocaleString()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Priority:</span>
                <span class="detail-value priority-${lead.priority}">${lead.priority || 'medium'}</span>
              </div>
            </div>
            
            <!-- Contact Info -->
            ${lead.email ? `
              <div class="contact-info">
                <div class="contact-item">
                  <span class="contact-icon">📧</span>
                  <span class="contact-value">${lead.email}</span>
                </div>
              </div>
            ` : ''}
          </div>
          
          <!-- Swipe Indicators -->
          <div class="swipe-indicator swipe-left" id="swipe-left-indicator">
            <div class="indicator-content">
              <div class="indicator-icon">❌</div>
              <div class="indicator-text">PASS</div>
            </div>
          </div>
          <div class="swipe-indicator swipe-right" id="swipe-right-indicator">
            <div class="indicator-content">
              <div class="indicator-icon">✅</div>
              <div class="indicator-text">CONTACT</div>
            </div>
          </div>
          <div class="swipe-indicator swipe-up" id="swipe-up-indicator">
            <div class="indicator-content">
              <div class="indicator-icon">⭐</div>
              <div class="indicator-text">PRIORITY</div>
            </div>
          </div>
          <div class="swipe-indicator swipe-down" id="swipe-down-indicator">
            <div class="indicator-content">
              <div class="indicator-icon">⏸️</div>
              <div class="indicator-text">MAYBE</div>
            </div>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="swipe-actions">
          <button class="swipe-btn swipe-btn-pass" id="btn-pass" title="Pass (Left Arrow or N)">
            <span class="btn-icon">❌</span>
            <span class="btn-label">Pass</span>
          </button>
          <button class="swipe-btn swipe-btn-maybe" id="btn-maybe" title="Maybe Later (Down Arrow or M)">
            <span class="btn-icon">⏸️</span>
            <span class="btn-label">Maybe</span>
          </button>
          <button class="swipe-btn swipe-btn-contact" id="btn-contact" title="Contact (Right Arrow or Y)">
            <span class="btn-icon">✅</span>
            <span class="btn-label">Contact</span>
          </button>
          <button class="swipe-btn swipe-btn-priority" id="btn-priority" title="Priority (Up Arrow or P)">
            <span class="btn-icon">⭐</span>
            <span class="btn-label">Priority</span>
          </button>
        </div>
        
        <!-- Undo Button -->
        ${this.history.length > 0 ? `
          <button class="undo-btn" id="btn-undo" title="Undo (Z)">
            <span>↩️ Undo</span>
          </button>
        ` : ''}
        
        <!-- Keyboard Hints -->
        <div class="keyboard-hints">
          <span>Keyboard: Y=Contact | N=Pass | M=Maybe | P=Priority | Z=Undo</span>
        </div>
      </div>
    `;
    
    this.attachCardEventListeners();
  }
  
  renderComplete() {
    const totalReviewed = this.history.length;
    const accepted = this.history.filter(h => h.action === 'contact' || h.action === 'priority').length;
    const passed = this.history.filter(h => h.action === 'pass').length;
    const maybe = this.history.filter(h => h.action === 'maybe').length;
    
    this.container.innerHTML = `
      <div class="swipe-complete">
        <div class="complete-icon">🎉</div>
        <h2>All Leads Reviewed!</h2>
        <p>Great job qualifying ${totalReviewed} leads</p>
        
        <div class="review-stats">
          <div class="review-stat">
            <div class="stat-number">${accepted}</div>
            <div class="stat-label">✅ To Contact</div>
          </div>
          <div class="review-stat">
            <div class="stat-number">${maybe}</div>
            <div class="stat-label">⏸️ Maybe Later</div>
          </div>
          <div class="review-stat">
            <div class="stat-number">${passed}</div>
            <div class="stat-label">❌ Passed</div>
          </div>
        </div>
        
        <button class="btn-primary" id="btn-view-pipeline">View Pipeline</button>
        <button class="btn-secondary" id="btn-review-more">Review More Leads</button>
      </div>
    `;
    
    // Attach completion button listeners
    const viewPipelineBtn = this.container.querySelector('#btn-view-pipeline');
    const reviewMoreBtn = this.container.querySelector('#btn-review-more');
    
    if (viewPipelineBtn) {
      viewPipelineBtn.addEventListener('click', () => {
        if (this.callbacks.onComplete) {
          this.callbacks.onComplete('view-pipeline');
        }
      });
    }
    
    if (reviewMoreBtn) {
      reviewMoreBtn.addEventListener('click', () => {
        if (this.callbacks.onComplete) {
          this.callbacks.onComplete('review-more');
        }
      });
    }
  }
  
  getCompanyIcon(lead) {
    const industry = lead.customFields?.industry || '';
    const icons = {
      'Technology': '💻',
      'Financial Services': '🏦',
      'Healthcare': '🏥',
      'Government': '🏛️',
      'Education': '🎓',
      'Retail': '🛒',
      'Manufacturing': '🏭',
      'Energy': '⚡',
      'Utilities': '💡',
      'Consulting': '💼',
      'Defense': '🛡️',
      'Insurance': '🏢',
      'Logistics': '🚚',
      'Transportation': '✈️'
    };
    return icons[industry] || '🏢';
  }
  
  attachCardEventListeners() {
    const card = this.container.querySelector('#current-swipe-card');
    if (!card) return;
    
    // Touch events
    card.addEventListener('touchstart', this.handleDragStart.bind(this));
    card.addEventListener('touchmove', this.handleDragMove.bind(this));
    card.addEventListener('touchend', this.handleDragEnd.bind(this));
    
    // Mouse events
    card.addEventListener('mousedown', this.handleDragStart.bind(this));
    document.addEventListener('mousemove', this.handleDragMove.bind(this));
    document.addEventListener('mouseup', this.handleDragEnd.bind(this));
  }
  
  attachEventListeners() {
    // Button clicks
    this.container.addEventListener('click', (e) => {
      if (e.target.closest('#btn-pass')) this.handlePass();
      else if (e.target.closest('#btn-maybe')) this.handleMaybe();
      else if (e.target.closest('#btn-contact')) this.handleContact();
      else if (e.target.closest('#btn-priority')) this.handlePriority();
      else if (e.target.closest('#btn-undo')) this.handleUndo();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch(e.key.toLowerCase()) {
        case 'n':
        case 'arrowleft':
          this.handlePass();
          break;
        case 'y':
        case 'arrowright':
          this.handleContact();
          break;
        case 'm':
        case 'arrowdown':
          this.handleMaybe();
          break;
        case 'p':
        case 'arrowup':
          this.handlePriority();
          break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.handleUndo();
          }
          break;
      }
    });
  }
  
  handleDragStart(e) {
    this.isDragging = true;
    const touch = e.touches ? e.touches[0] : e;
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    
    const card = this.container.querySelector('#current-swipe-card');
    if (card) {
      card.style.transition = 'none';
    }
  }
  
  handleDragMove(e) {
    if (!this.isDragging) return;
    
    const touch = e.touches ? e.touches[0] : e;
    this.currentX = touch.clientX - this.startX;
    this.currentY = touch.clientY - this.startY;
    
    const card = this.container.querySelector('#current-swipe-card');
    if (!card) return;
    
    // Apply transform
    const rotation = this.currentX * 0.1;
    card.style.transform = `translate(${this.currentX}px, ${this.currentY}px) rotate(${rotation}deg)`;
    
    // Show indicators
    const leftIndicator = this.container.querySelector('#swipe-left-indicator');
    const rightIndicator = this.container.querySelector('#swipe-right-indicator');
    const upIndicator = this.container.querySelector('#swipe-up-indicator');
    const downIndicator = this.container.querySelector('#swipe-down-indicator');
    
    if (leftIndicator) leftIndicator.style.opacity = this.currentX < -50 ? '1' : '0';
    if (rightIndicator) rightIndicator.style.opacity = this.currentX > 50 ? '1' : '0';
    if (upIndicator) upIndicator.style.opacity = this.currentY < -50 ? '1' : '0';
    if (downIndicator) downIndicator.style.opacity = this.currentY > 50 ? '1' : '0';
  }
  
  handleDragEnd(e) {
    if (!this.isDragging) return;
    this.isDragging = false;
    
    const card = this.container.querySelector('#current-swipe-card');
    if (!card) return;
    
    // Determine action based on swipe distance
    const threshold = 100;
    
    if (Math.abs(this.currentX) > Math.abs(this.currentY)) {
      // Horizontal swipe
      if (this.currentX > threshold) {
        this.animateSwipe('right', () => this.handleContact());
      } else if (this.currentX < -threshold) {
        this.animateSwipe('left', () => this.handlePass());
      } else {
        this.resetCard();
      }
    } else {
      // Vertical swipe
      if (this.currentY < -threshold) {
        this.animateSwipe('up', () => this.handlePriority());
      } else if (this.currentY > threshold) {
        this.animateSwipe('down', () => this.handleMaybe());
      } else {
        this.resetCard();
      }
    }
  }
  
  animateSwipe(direction, callback) {
    const card = this.container.querySelector('#current-swipe-card');
    if (!card) return;
    
    const distance = window.innerWidth;
    let transform = '';
    
    switch(direction) {
      case 'left':
        transform = `translate(-${distance}px, 0) rotate(-30deg)`;
        break;
      case 'right':
        transform = `translate(${distance}px, 0) rotate(30deg)`;
        break;
      case 'up':
        transform = `translate(0, -${distance}px) scale(0.8)`;
        break;
      case 'down':
        transform = `translate(0, ${distance}px) scale(0.8)`;
        break;
    }
    
    card.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
    card.style.transform = transform;
    card.style.opacity = '0';
    
    setTimeout(() => {
      callback();
    }, 300);
  }
  
  resetCard() {
    const card = this.container.querySelector('#current-swipe-card');
    if (!card) return;
    
    card.style.transition = 'transform 0.3s ease-out';
    card.style.transform = 'translate(0, 0) rotate(0)';
    
    // Hide indicators
    const indicators = this.container.querySelectorAll('.swipe-indicator');
    indicators.forEach(ind => ind.style.opacity = '0');
    
    this.currentX = 0;
    this.currentY = 0;
  }
  
  handlePass() {
    const lead = this.getCurrentLead();
    if (!lead) return;
    
    this.history.push({ lead, action: 'pass', index: this.currentIndex });
    
    if (this.callbacks.onPass) {
      this.callbacks.onPass(lead);
    }
    
    this.currentIndex++;
    this.render();
  }
  
  handleMaybe() {
    const lead = this.getCurrentLead();
    if (!lead) return;
    
    this.history.push({ lead, action: 'maybe', index: this.currentIndex });
    
    if (this.callbacks.onMaybe) {
      this.callbacks.onMaybe(lead);
    }
    
    this.currentIndex++;
    this.render();
  }
  
  handleContact() {
    const lead = this.getCurrentLead();
    if (!lead) return;
    
    this.history.push({ lead, action: 'contact', index: this.currentIndex });
    
    if (this.callbacks.onContact) {
      this.callbacks.onContact(lead);
    }
    
    this.currentIndex++;
    this.render();
  }
  
  handlePriority() {
    const lead = this.getCurrentLead();
    if (!lead) return;
    
    this.history.push({ lead, action: 'priority', index: this.currentIndex });
    
    if (this.callbacks.onPriority) {
      this.callbacks.onPriority(lead);
    }
    
    this.currentIndex++;
    this.render();
  }
  
  handleUndo() {
    if (this.history.length === 0) return;
    
    const lastAction = this.history.pop();
    this.currentIndex = lastAction.index;
    
    if (this.callbacks.onUndo) {
      this.callbacks.onUndo(lastAction);
    }
    
    this.render();
  }
}

