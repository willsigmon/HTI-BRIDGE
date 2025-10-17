/**
 * Grant Discovery Service
 * Orchestrates grant search, scoring, and storage
 */

import * as grantsGovAPI from './grants-gov-api.js';
import grantRepository from '../repositories/grant-repository.js';

class GrantDiscoveryService {
  /**
   * Discover new grants from all sources
   */
  async discoverGrants() {
    console.log('Starting grant discovery...');
    
    const results = {
      total: 0,
      new: 0,
      updated: 0,
      hot: 0,
      sources: {}
    };
    
    try {
      // Search Grants.gov
      const grantsGovResults = await this.discoverGrantsGov();
      results.sources['grants.gov'] = grantsGovResults;
      results.total += grantsGovResults.total;
      results.new += grantsGovResults.new;
      results.updated += grantsGovResults.updated;
      results.hot += grantsGovResults.hot;
      
      // TODO: Add other sources (NC state, foundations, etc.)
      
      console.log('Grant discovery complete:', results);
      return results;
    } catch (error) {
      console.error('Error during grant discovery:', error);
      throw error;
    }
  }
  
  /**
   * Discover grants from Grants.gov
   */
  async discoverGrantsGov() {
    const results = {
      total: 0,
      new: 0,
      updated: 0,
      hot: 0
    };
    
    try {
      // Search for HTI-relevant grants
      const searchResults = await grantsGovAPI.searchHTIGrants();
      results.total = searchResults.total;
      
      // Process each grant
      for (const grantData of searchResults.grants) {
        // Calculate match score
        const matchResult = grantsGovAPI.calculateMatchScore(grantData);
        grantData.match_score = matchResult.score;
        grantData.match_reasons = matchResult.reasons;
        
        // Save or update grant
        const existing = await grantRepository.findBySourceId(grantData.source, grantData.source_id);
        
        if (existing) {
          await grantRepository.updateGrant(existing.id, grantData);
          results.updated++;
        } else {
          await grantRepository.createGrant(grantData);
          results.new++;
        }
        
        // Count hot opportunities
        if (grantData.match_score >= 80) {
          results.hot++;
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error discovering Grants.gov grants:', error);
      return results;
    }
  }
  
  /**
   * Get grant recommendations for user
   */
  async getRecommendations(filters = {}) {
    const defaultFilters = {
      status: 'prospecting',
      minScore: 60,
      dismissed: false,
      deadlineAfter: new Date().toISOString().split('T')[0],
      limit: 50
    };
    
    const mergedFilters = { ...defaultFilters, ...filters };
    return grantRepository.findAll(mergedFilters);
  }
  
  /**
   * Get hot opportunities (score >= 80)
   */
  async getHotOpportunities() {
    return this.getRecommendations({
      minScore: 80,
      limit: 20
    });
  }
  
  /**
   * Get grant statistics
   */
  async getStats() {
    return grantRepository.getStats();
  }
  
  /**
   * Start application for a grant
   */
  async startApplication(grantId, userId) {
    const grant = await grantRepository.findById(grantId);
    
    if (!grant) {
      throw new Error('Grant not found');
    }
    
    // Create application
    const application = await grantRepository.createApplication({
      grant_id: grantId,
      status: 'draft',
      amount_requested: grant.amount_max || grant.amount_min,
      assigned_to: userId,
      project_title: `HTI Chromebook Distribution - ${grant.title}`,
      project_description: 'Digital equity initiative to provide refurbished Chromebooks to underserved HUBZone communities in North Carolina.',
      notes: ''
    });
    
    // Create default tasks
    await this.createDefaultTasks(application.id);
    
    return application;
  }
  
  /**
   * Create default tasks for new application
   */
  async createDefaultTasks(applicationId) {
    const application = await grantRepository.findApplicationById(applicationId);
    const deadline = new Date(application.deadline);
    
    // Calculate task due dates (work backwards from deadline)
    const tasks = [
      {
        title: 'Review grant guidelines',
        description: 'Read full RFP and eligibility requirements',
        priority: 'high',
        due_date: new Date(deadline.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days before
      },
      {
        title: 'Gather required documents',
        description: '501c3, financial statements, board resolution, etc.',
        priority: 'high',
        due_date: new Date(deadline.getTime() - 25 * 24 * 60 * 60 * 1000) // 25 days before
      },
      {
        title: 'Draft project narrative',
        description: 'Write proposal narrative using AI assistant',
        priority: 'high',
        due_date: new Date(deadline.getTime() - 20 * 24 * 60 * 60 * 1000) // 20 days before
      },
      {
        title: 'Prepare budget',
        description: 'Create detailed budget and justification',
        priority: 'medium',
        due_date: new Date(deadline.getTime() - 15 * 24 * 60 * 60 * 1000) // 15 days before
      },
      {
        title: 'Get letters of support',
        description: 'Request letters from partners and community leaders',
        priority: 'medium',
        due_date: new Date(deadline.getTime() - 10 * 24 * 60 * 60 * 1000) // 10 days before
      },
      {
        title: 'Internal review',
        description: 'Team review of complete application',
        priority: 'high',
        due_date: new Date(deadline.getTime() - 5 * 24 * 60 * 60 * 1000) // 5 days before
      },
      {
        title: 'Submit application',
        description: 'Final submission through grants portal',
        priority: 'urgent',
        due_date: new Date(deadline.getTime() - 1 * 24 * 60 * 60 * 1000) // 1 day before (buffer)
      }
    ];
    
    for (const taskData of tasks) {
      await grantRepository.createTask({
        application_id: applicationId,
        assigned_to: application.assigned_to,
        ...taskData
      });
    }
  }
  
  /**
   * Dismiss a grant
   */
  async dismissGrant(grantId, reason) {
    return grantRepository.dismissGrant(grantId, reason);
  }
  
  /**
   * Get upcoming deadlines
   */
  async getUpcomingDeadlines(days = 30) {
    const today = new Date();
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    
    return grantRepository.findAll({
      status: ['prospecting', 'in_progress'],
      dismissed: false,
      deadlineAfter: today.toISOString().split('T')[0],
      deadlineBefore: futureDate.toISOString().split('T')[0]
    });
  }
}

export default new GrantDiscoveryService();

