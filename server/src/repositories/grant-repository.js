/**
 * Grant Repository
 * Database operations for grant discovery system
 */

import grantsDb from '../db/grants-db.js';

class GrantRepository {
  /**
   * Create or update a grant
   */
  async upsertGrant(grantData) {
    const existing = this.findBySourceId(grantData.source, grantData.source_id);
    
    if (existing) {
      return this.updateGrant(existing.id, grantData);
    } else {
      return this.createGrant(grantData);
    }
  }
  
  /**
   * Create a new grant
   */
  createGrant(grantData) {
    return grantsDb.addGrant({
      ...grantData,
      status: grantData.status || 'prospecting',
      dismissed: false
    });
  }
  
  /**
   * Update an existing grant
   */
  updateGrant(id, grantData) {
    return grantsDb.updateGrant(id, grantData);
  }
  
  /**
   * Find grant by ID
   */
  findById(id) {
    return grantsDb.getGrantById(id);
  }
  
  /**
   * Find grant by source and source_id
   */
  findBySourceId(source, sourceId) {
    return grantsDb.getGrantBySourceId(source, sourceId);
  }
  
  /**
   * Find all grants with filters
   */
  findAll(filters = {}) {
    let grants = grantsDb.getGrants();
    
    // Apply filters
    if (filters.status) {
      grants = grants.filter(g => g.status === filters.status);
    }
    
    if (filters.minScore) {
      grants = grants.filter(g => g.match_score >= filters.minScore);
    }
    
    if (filters.funderType) {
      grants = grants.filter(g => g.funder_type === filters.funderType);
    }
    
    if (filters.dismissed === false) {
      grants = grants.filter(g => !g.dismissed);
    }
    
    if (filters.deadlineAfter) {
      grants = grants.filter(g => g.deadline && g.deadline >= filters.deadlineAfter);
    }
    
    if (filters.deadlineBefore) {
      grants = grants.filter(g => g.deadline && g.deadline <= filters.deadlineBefore);
    }
    
    // Sort by match score desc, deadline asc
    grants.sort((a, b) => {
      if (b.match_score !== a.match_score) {
        return b.match_score - a.match_score;
      }
      if (a.deadline && b.deadline) {
        return new Date(a.deadline) - new Date(b.deadline);
      }
      return 0;
    });
    
    if (filters.limit) {
      grants = grants.slice(0, filters.limit);
    }
    
    return grants;
  }
  
  /**
   * Get grant statistics
   */
  getStats() {
    const grants = grantsDb.getGrants();
    const applications = grantsDb.getApplications();
    
    const stats = {
      total: grants.length,
      prospecting: grants.filter(g => g.status === 'prospecting').length,
      in_progress: grants.filter(g => g.status === 'in_progress').length,
      submitted: grants.filter(g => g.status === 'submitted').length,
      awarded: grants.filter(g => g.status === 'awarded').length,
      hot_opportunities: grants.filter(g => g.match_score >= 80 && !g.dismissed).length,
      potential_funding: grants
        .filter(g => g.status === 'prospecting' && !g.dismissed)
        .reduce((sum, g) => sum + (g.amount_max || 0), 0),
      awarded_funding: applications
        .filter(a => a.status === 'awarded')
        .reduce((sum, a) => sum + (a.amount_awarded || 0), 0),
      avg_match_score: grants.length > 0 
        ? Math.round(grants.reduce((sum, g) => sum + g.match_score, 0) / grants.length)
        : 0
    };
    
    return stats;
  }
  
  /**
   * Dismiss a grant
   */
  dismissGrant(id, reason) {
    return grantsDb.updateGrant(id, {
      dismissed: true,
      dismissed_reason: reason,
      status: 'archived'
    });
  }
  
  /**
   * Update grant status
   */
  updateStatus(id, status) {
    return grantsDb.updateGrant(id, { status });
  }
  
  /**
   * Create grant application
   */
  createApplication(applicationData) {
    const application = grantsDb.addApplication({
      ...applicationData,
      status: applicationData.status || 'draft',
      progress: 0
    });
    
    // Update grant status
    this.updateStatus(applicationData.grant_id, 'in_progress');
    
    return this.findApplicationById(application.id);
  }
  
  /**
   * Find application by ID
   */
  findApplicationById(id) {
    const application = grantsDb.getApplicationById(id);
    if (!application) return null;
    
    const grant = grantsDb.getGrantById(application.grant_id);
    return {
      ...application,
      grant_title: grant?.title,
      funder: grant?.funder,
      deadline: grant?.deadline,
      amount_max: grant?.amount_max
    };
  }
  
  /**
   * Find all applications
   */
  findAllApplications(filters = {}) {
    let applications = grantsDb.getApplications();
    
    if (filters.status) {
      applications = applications.filter(a => a.status === filters.status);
    }
    
    if (filters.assignedTo) {
      applications = applications.filter(a => a.assigned_to === filters.assignedTo);
    }
    
    // Enrich with grant data
    applications = applications.map(app => {
      const grant = grantsDb.getGrantById(app.grant_id);
      return {
        ...app,
        grant_title: grant?.title,
        funder: grant?.funder,
        deadline: grant?.deadline,
        amount_max: grant?.amount_max
      };
    });
    
    // Sort by deadline
    applications.sort((a, b) => {
      if (a.deadline && b.deadline) {
        return new Date(a.deadline) - new Date(b.deadline);
      }
      return 0;
    });
    
    return applications;
  }
  
  /**
   * Update application
   */
  updateApplication(id, updates) {
    grantsDb.updateApplication(id, updates);
    return this.findApplicationById(id);
  }
  
  /**
   * Create grant task
   */
  createTask(taskData) {
    return grantsDb.addTask({
      ...taskData,
      priority: taskData.priority || 'medium',
      completed: false
    });
  }
  
  /**
   * Find task by ID
   */
  findTaskById(id) {
    return grantsDb.getTaskById(id);
  }
  
  /**
   * Find tasks by application
   */
  findTasksByApplication(applicationId) {
    const tasks = grantsDb.getTasksByApplication(applicationId);
    return tasks.sort((a, b) => {
      if (a.due_date && b.due_date) {
        return new Date(a.due_date) - new Date(b.due_date);
      }
      return 0;
    });
  }
  
  /**
   * Update task
   */
  updateTask(id, updates) {
    return grantsDb.updateTask(id, updates);
  }
  
  /**
   * Complete task
   */
  completeTask(id) {
    return grantsDb.updateTask(id, {
      completed: true,
      completed_at: new Date().toISOString()
    });
  }
}

export default new GrantRepository();

