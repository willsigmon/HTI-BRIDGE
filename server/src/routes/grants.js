/**
 * Grant Discovery API Routes
 * BRIDGE CRM
 */

import express from 'express';
import grantDiscoveryService from '../services/grant-discovery-service.js';
import grantRepository from '../repositories/grant-repository.js';

const router = express.Router();

/**
 * GET /api/grants/discover
 * Trigger grant discovery process
 */
router.post('/discover', async (req, res) => {
  try {
    const results = await grantDiscoveryService.discoverGrants();
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error discovering grants:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/grants
 * Get all grants with filters
 */
router.get('/', async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      minScore: req.query.minScore ? parseInt(req.query.minScore) : undefined,
      funderType: req.query.funderType,
      dismissed: req.query.dismissed === 'true',
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };
    
    const grants = await grantRepository.findAll(filters);
    res.json({
      success: true,
      data: grants
    });
  } catch (error

) {
    console.error('Error fetching grants:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/grants/stats
 * Get grant statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await grantDiscoveryService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching grant stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/grants/hot
 * Get hot opportunities (score >= 80)
 */
router.get('/hot', async (req, res) => {
  try {
    const grants = await grantDiscoveryService.getHotOpportunities();
    res.json({
      success: true,
      data: grants
    });
  } catch (error) {
    console.error('Error fetching hot grants:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/grants/deadlines
 * Get upcoming deadlines
 */
router.get('/deadlines', async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 30;
    const grants = await grantDiscoveryService.getUpcomingDeadlines(days);
    res.json({
      success: true,
      data: grants
    });
  } catch (error) {
    console.error('Error fetching deadlines:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/grants/:id
 * Get grant by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const grant = await grantRepository.findById(req.params.id);
    
    if (!grant) {
      return res.status(404).json({
        success: false,
        error: 'Grant not found'
      });
    }
    
    res.json({
      success: true,
      data: grant
    });
  } catch (error) {
    console.error('Error fetching grant:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/grants/:id/apply
 * Start application for a grant
 */
router.post('/:id/apply', async (req, res) => {
  try {
    const userId = req.body.userId || 1; // TODO: Get from auth
    const application = await grantDiscoveryService.startApplication(req.params.id, userId);
    
    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Error starting application:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/grants/:id/dismiss
 * Dismiss a grant
 */
router.post('/:id/dismiss', async (req, res) => {
  try {
    const reason = req.body.reason || 'Not interested';
    const grant = await grantDiscoveryService.dismissGrant(req.params.id, reason);
    
    res.json({
      success: true,
      data: grant
    });
  } catch (error) {
    console.error('Error dismissing grant:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/grants/applications
 * Get all applications
 */
router.get('/applications/all', async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      assignedTo: req.query.assignedTo ? parseInt(req.query.assignedTo) : undefined
    };
    
    const applications = await grantRepository.findAllApplications(filters);
    res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/grants/applications/:id
 * Get application by ID
 */
router.get('/applications/:id', async (req, res) => {
  try {
    const application = await grantRepository.findApplicationById(req.params.id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }
    
    // Get tasks
    const tasks = await grantRepository.findTasksByApplication(req.params.id);
    
    res.json({
      success: true,
      data: {
        ...application,
        tasks
      }
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PATCH /api/grants/applications/:id
 * Update application
 */
router.patch('/applications/:id', async (req, res) => {
  try {
    const updates = req.body;
    const application = await grantRepository.updateApplication(req.params.id, updates);
    
    res.json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/grants/applications/:id/tasks
 * Create task for application
 */
router.post('/applications/:id/tasks', async (req, res) => {
  try {
    const taskData = {
      application_id: req.params.id,
      ...req.body
    };
    
    const task = await grantRepository.createTask(taskData);
    
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PATCH /api/grants/tasks/:id
 * Update task
 */
router.patch('/tasks/:id', async (req, res) => {
  try {
    const updates = req.body;
    const task = await grantRepository.updateTask(req.params.id, updates);
    
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/grants/tasks/:id/complete
 * Mark task as complete
 */
router.post('/tasks/:id/complete', async (req, res) => {
  try {
    const task = await grantRepository.completeTask(req.params.id);
    
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

