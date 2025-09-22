import { listAutomations, recordAutomationExecution, createTask } from '../repositories/automations.js';
import { addActivity } from '../repositories/activities.js';

export function runLeadAutomations({ previous, next, actorId = 'system' }) {
  if (!next && !previous) return { patches: [], executions: [] };
  const workspaceId = next?.workspaceId || previous?.workspaceId;
  if (!workspaceId) {
    return { patches: [], executions: [] };
  }

  const automations = listAutomations({ workspaceId, status: 'active' });
  const patches = [];
  const executions = [];

  for (const automation of automations) {
    try {
      if (!matchesTrigger(automation, previous, next)) continue;
      if (!satisfiesConditions(automation, previous, next)) continue;
      const context = {
        automation,
        previous,
        next,
        actorId
      };
      const actionResults = [];
      for (const action of automation.actions) {
        const result = executeAction(action, context);
        if (result?.patch) {
          patches.push(result.patch);
        }
        if (result?.activity) {
          addActivity(result.activity);
        }
        if (result?.log) {
          actionResults.push(result.log);
        }
      }
      recordAutomationExecution({
        automationId: automation.id,
        leadId: next?.id || previous?.id,
        status: 'success',
        result: actionResults,
        actorId
      });
      executions.push({ automationId: automation.id, results: actionResults });
    } catch (error) {
      recordAutomationExecution({
        automationId: automation.id,
        leadId: next?.id || previous?.id,
        status: 'error',
        result: { message: error.message }
      });
    }
  }

  return { patches, executions };
}

function matchesTrigger(automation, previous, next) {
  if (!automation?.trigger?.type) return false;
  const trigger = automation.trigger;
  switch (trigger.type) {
    case 'stage_change': {
      const prevStage = previous?.stageId || previous?.pipelineStageId;
      const nextStage = next?.stageId || next?.pipelineStageId;
      if (prevStage === nextStage) return false;
      if (trigger.pipelineId && trigger.pipelineId !== (next?.pipelineId || previous?.pipelineId)) {
        return false;
      }
      if (trigger.stageIds && trigger.stageIds.length && !trigger.stageIds.includes(nextStage)) {
        return false;
      }
      if (trigger.fromStageIds && trigger.fromStageIds.length && !trigger.fromStageIds.includes(prevStage)) {
        return false;
      }
      return true;
    }
    case 'status_change': {
      const prevStatus = previous?.status;
      const nextStatus = next?.status;
      if (prevStatus === nextStatus) return false;
      if (trigger.toStatuses?.length && !trigger.toStatuses.includes(nextStatus)) return false;
      if (trigger.fromStatuses?.length && !trigger.fromStatuses.includes(prevStatus)) return false;
      return true;
    }
    case 'grant_deadline': {
      if (!next?.grantMilestoneId) return false;
      const dueDate = new Date(next.grantDueDate || trigger.dueDate);
      const now = new Date();
      const daysOut = trigger.daysOut ?? 14;
      const deltaDays = Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      return deltaDays === daysOut;
    }
    default:
      return false;
  }
}

function satisfiesConditions(automation, previous, next) {
  const conditions = automation.conditions || {};
  if (conditions.minimumPriority && (next?.priority ?? 0) < conditions.minimumPriority) {
    return false;
  }
  if (conditions.minimumProbability && (next?.probability ?? 0) < conditions.minimumProbability) {
    return false;
  }
  if (conditions.hasGrant && !next?.grantFlag) {
    return false;
  }
  if (conditions.hasTasksOpen && !(next?.openTaskCount > 0)) {
    return false;
  }
  return true;
}

function executeAction(action, context) {
  switch (action.type) {
    case 'create_task':
      return createFollowUpTask(action, context);
    case 'schedule_follow_up':
      return scheduleFollowUp(action, context);
    case 'record_activity':
      return recordActivity(action, context);
    case 'flag_grant':
      return flagGrant(action, context);
    default:
      return null;
  }
}

function createFollowUpTask(action, { next, actorId }) {
  const dueDate = action.dueInDays
    ? new Date(Date.now() + action.dueInDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : action.dueDate || null;
  const task = createTask(
    {
      title: action.title || `Follow up: ${next?.title || next?.company}`,
      description: action.description || 'Automated follow-up task triggered by pipeline change.',
      leadId: next?.id,
      dueDate,
      priority: action.priority || 'high',
      workspaceId: next?.workspaceId
    },
    { actorId }
  );
  return {
    log: { taskId: task.id, title: task.title },
    activity: {
      text: `Automation created task "${task.title}" for lead ${next?.title || next?.company}`,
      type: 'automation'
    }
  };
}

function scheduleFollowUp(action, { next }) {
  const followUpDate = action.dueInDays
    ? new Date(Date.now() + action.dueInDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : action.followUpDate || next?.followUpDate;
  if (!followUpDate) return null;
  return {
    patch: {
      followUpDate,
      followUpReason: action.reason || 'Automated follow-up scheduled'
    },
    activity: {
      text: `Automated follow-up scheduled for ${followUpDate} on ${next?.title}`,
      type: 'automation'
    }
  };
}

function recordActivity(action, { next }) {
  return {
    activity: {
      text: action.message || `Automation note on ${next?.title}`,
      type: action.activityType || 'note'
    }
  };
}

function flagGrant(action, { next }) {
  return {
    patch: {
      grantFlag: action.flag || true,
      grantNotes: action.notes || 'Grant opportunity flagged by automation'
    },
    activity: {
      text: `Flagged ${next?.title} for grant follow-up`,
      type: 'grant'
    }
  };
}
