/**
 * BRIDGE CRM - Analytics Dashboard
 * Comprehensive analytics and reporting for donor pipeline
 */

export class AnalyticsDashboard {
  constructor(chartLib) {
    this.Chart = chartLib || (typeof Chart !== 'undefined' ? Chart : null);
    this.charts = {};
  }
  
  /**
   * Render complete analytics dashboard
   */
  render(container, data) {
    container.innerHTML = `
      <div class="analytics-dashboard">
        <!-- Key Metrics -->
        <div class="metrics-grid">
          ${this.renderKeyMetrics(data.metrics)}
        </div>
        
        <!-- Grant Progress -->
        <div class="grant-progress-section">
          ${this.renderGrantProgress(data.grantProgress)}
        </div>
        
        <!-- Charts Row 1 -->
        <div class="charts-row">
          <div class="chart-container">
            <h3>Lead Funnel</h3>
            <canvas id="funnelChart"></canvas>
          </div>
          <div class="chart-container">
            <h3>Leads by Vertical</h3>
            <canvas id="verticalChart"></canvas>
          </div>
        </div>
        
        <!-- Charts Row 2 -->
        <div class="charts-row">
          <div class="chart-container">
            <h3>Leads Over Time</h3>
            <canvas id="timelineChart"></canvas>
          </div>
          <div class="chart-container">
            <h3>Conversion Rates</h3>
            <canvas id="conversionChart"></canvas>
          </div>
        </div>
        
        <!-- Charts Row 3 -->
        <div class="charts-row">
          <div class="chart-container">
            <h3>Geographic Distribution</h3>
            <canvas id="geoChart"></canvas>
          </div>
          <div class="chart-container">
            <h3>Team Performance</h3>
            <canvas id="teamChart"></canvas>
          </div>
        </div>
        
        <!-- Insights -->
        <div class="insights-section">
          ${this.renderInsights(data.insights)}
        </div>
      </div>
    `;
    
    // Render all charts
    this.renderFunnelChart(data.funnel);
    this.renderVerticalChart(data.verticals);
    this.renderTimelineChart(data.timeline);
    this.renderConversionChart(data.conversions);
    this.renderGeoChart(data.geography);
    this.renderTeamChart(data.team);
  }
  
  /**
   * Render key metrics cards
   */
  renderKeyMetrics(metrics) {
    const cards = [
      {
        title: 'Total Leads',
        value: metrics.totalLeads,
        change: metrics.leadsChange,
        icon: '📊',
        color: '#3B82F6'
      },
      {
        title: 'Hot Leads',
        value: metrics.hotLeads,
        change: metrics.hotLeadsChange,
        icon: '🔥',
        color: '#EF4444'
      },
      {
        title: 'Committed',
        value: metrics.committed,
        change: metrics.committedChange,
        icon: '✅',
        color: '#10B981'
      },
      {
        title: 'Chromebooks Secured',
        value: metrics.chromebooks,
        change: metrics.chromebooksChange,
        icon: '💻',
        color: '#8B5CF6'
      },
      {
        title: 'Grant Progress',
        value: `${metrics.grantProgress}%`,
        change: metrics.grantProgressChange,
        icon: '🎯',
        color: '#F59E0B'
      },
      {
        title: 'Avg. Response Time',
        value: `${metrics.avgResponseTime}h`,
        change: metrics.responseTimeChange,
        icon: '⏱️',
        color: '#06B6D4'
      }
    ];
    
    return cards.map(card => `
      <div class="metric-card" style="border-left-color: ${card.color}">
        <div class="metric-header">
          <span class="metric-icon">${card.icon}</span>
          <span class="metric-title">${card.title}</span>
        </div>
        <div class="metric-value">${card.value.toLocaleString()}</div>
        <div class="metric-change ${card.change >= 0 ? 'positive' : 'negative'}">
          ${card.change >= 0 ? '↑' : '↓'} ${Math.abs(card.change)}% vs last month
        </div>
      </div>
    `).join('');
  }
  
  /**
   * Render grant progress section
   */
  renderGrantProgress(progress) {
    const percentage = (progress.current / progress.goal) * 100;
    const remaining = progress.goal - progress.current;
    const daysLeft = Math.ceil((new Date(progress.deadline) - new Date()) / (1000 * 60 * 60 * 24));
    const dailyTarget = Math.ceil(remaining / daysLeft);
    
    return `
      <div class="grant-progress-card">
        <div class="grant-header">
          <h2>🎯 Grant Progress: 5,000 Chromebooks for HUBZone Communities</h2>
          <div class="grant-deadline">Deadline: ${new Date(progress.deadline).toLocaleDateString()}</div>
        </div>
        
        <div class="grant-stats">
          <div class="grant-stat">
            <div class="grant-stat-value">${progress.current.toLocaleString()}</div>
            <div class="grant-stat-label">Secured</div>
          </div>
          <div class="grant-stat">
            <div class="grant-stat-value">${remaining.toLocaleString()}</div>
            <div class="grant-stat-label">Remaining</div>
          </div>
          <div class="grant-stat">
            <div class="grant-stat-value">${daysLeft}</div>
            <div class="grant-stat-label">Days Left</div>
          </div>
          <div class="grant-stat">
            <div class="grant-stat-value">${dailyTarget}</div>
            <div class="grant-stat-label">Daily Target</div>
          </div>
        </div>
        
        <div class="grant-progress-bar">
          <div class="grant-progress-fill" style="width: ${percentage}%">
            <span class="grant-progress-text">${percentage.toFixed(1)}%</span>
          </div>
        </div>
        
        <div class="grant-milestones">
          ${this.renderGrantMilestones(progress.milestones)}
        </div>
      </div>
    `;
  }
  
  /**
   * Render grant milestones
   */
  renderGrantMilestones(milestones) {
    return milestones.map((milestone, index) => {
      const isComplete = milestone.complete;
      const isCurrent = !isComplete && index === milestones.findIndex(m => !m.complete);
      
      return `
        <div class="milestone ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}">
          <div class="milestone-icon">${isComplete ? '✅' : isCurrent ? '🎯' : '⭕'}</div>
          <div class="milestone-info">
            <div class="milestone-title">${milestone.title}</div>
            <div class="milestone-value">${milestone.value.toLocaleString()} Chromebooks</div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  /**
   * Render funnel chart
   */
  renderFunnelChart(data) {
    const ctx = document.getElementById('funnelChart');
    if (!ctx || !this.Chart) return;
    
    this.charts.funnel = new this.Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.stages,
        datasets: [{
          label: 'Leads',
          data: data.counts,
          backgroundColor: [
            '#3B82F6',
            '#10B981',
            '#F59E0B',
            '#EF4444',
            '#8B5CF6',
            '#06B6D4'
          ]
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              afterLabel: (context) => {
                const total = data.counts[0];
                const percentage = ((context.parsed.x / total) * 100).toFixed(1);
                return `${percentage}% of total`;
              }
            }
          }
        }
      }
    });
  }
  
  /**
   * Render vertical distribution chart
   */
  renderVerticalChart(data) {
    const ctx = document.getElementById('verticalChart');
    if (!ctx || !this.Chart) return;
    
    this.charts.vertical = new this.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.verticals,
        datasets: [{
          data: data.counts,
          backgroundColor: [
            '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
            '#8B5CF6', '#06B6D4', '#EC4899', '#14B8A6',
            '#F97316', '#84CC16', '#6366F1', '#A855F7'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  }
  
  /**
   * Render timeline chart
   */
  renderTimelineChart(data) {
    const ctx = document.getElementById('timelineChart');
    if (!ctx || !this.Chart) return;
    
    this.charts.timeline = new this.Chart(ctx, {
      type: 'line',
      data: {
        labels: data.dates,
        datasets: [
          {
            label: 'New Leads',
            data: data.newLeads,
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true
          },
          {
            label: 'Qualified',
            data: data.qualified,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true
          },
          {
            label: 'Committed',
            data: data.committed,
            borderColor: '#8B5CF6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }
  
  /**
   * Render conversion rates chart
   */
  renderConversionChart(data) {
    const ctx = document.getElementById('conversionChart');
    if (!ctx || !this.Chart) return;
    
    this.charts.conversion = new this.Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.verticals,
        datasets: [{
          label: 'Conversion Rate (%)',
          data: data.rates,
          backgroundColor: '#10B981'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (value) => value + '%'
            }
          }
        }
      }
    });
  }
  
  /**
   * Render geographic distribution chart
   */
  renderGeoChart(data) {
    const ctx = document.getElementById('geoChart');
    if (!ctx || !this.Chart) return;
    
    this.charts.geo = new this.Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.locations,
        datasets: [{
          label: 'Leads by Location',
          data: data.counts,
          backgroundColor: '#3B82F6'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }
  
  /**
   * Render team performance chart
   */
  renderTeamChart(data) {
    const ctx = document.getElementById('teamChart');
    if (!ctx || !this.Chart) return;
    
    this.charts.team = new this.Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.members,
        datasets: [
          {
            label: 'Contacted',
            data: data.contacted,
            backgroundColor: '#3B82F6'
          },
          {
            label: 'Qualified',
            data: data.qualified,
            backgroundColor: '#10B981'
          },
          {
            label: 'Committed',
            data: data.committed,
            backgroundColor: '#8B5CF6'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top'
          }
        },
        scales: {
          x: {
            stacked: false
          },
          y: {
            stacked: false,
            beginAtZero: true
          }
        }
      }
    });
  }
  
  /**
   * Render insights section
   */
  renderInsights(insights) {
    return `
      <div class="insights-grid">
        ${insights.map(insight => `
          <div class="insight-card ${insight.type}">
            <div class="insight-icon">${insight.icon}</div>
            <div class="insight-content">
              <h4>${insight.title}</h4>
              <p>${insight.description}</p>
              ${insight.action ? `<button class="insight-action">${insight.action}</button>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  /**
   * Destroy all charts (cleanup)
   */
  destroy() {
    Object.values(this.charts).forEach(chart => {
      if (chart && chart.destroy) {
        chart.destroy();
      }
    });
    this.charts = {};
  }
  
  /**
   * Update charts with new data
   */
  update(data) {
    // Update each chart with new data
    if (this.charts.funnel) {
      this.charts.funnel.data.datasets[0].data = data.funnel.counts;
      this.charts.funnel.update();
    }
    
    if (this.charts.timeline) {
      this.charts.timeline.data.labels = data.timeline.dates;
      this.charts.timeline.data.datasets[0].data = data.timeline.newLeads;
      this.charts.timeline.data.datasets[1].data = data.timeline.qualified;
      this.charts.timeline.data.datasets[2].data = data.timeline.committed;
      this.charts.timeline.update();
    }
    
    // Update other charts similarly...
  }
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AnalyticsDashboard };
}

