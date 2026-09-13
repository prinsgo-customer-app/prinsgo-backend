const AIApproval = require('../models/AIApproval');
const AITask = require('../models/AITask');
const AIAuditLog = require('../models/AIAuditLog');

class AIApprovalService {
  async getApprovals(workspaceId, page = 1, limit = 10, status = 'PENDING') {
      const skip = (page - 1) * limit;
      const query = { workspaceId };
      if (status) query.status = status;

      const approvals = await AIApproval.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('taskId', 'instructions status')
          .populate('requestedById', 'name email');
      const total = await AIApproval.countDocuments(query);
      return { approvals, total, page, pages: Math.ceil(total / limit) };
  }

  async getApprovalDetails(approvalId, workspaceId) {
      const approval = await AIApproval.findOne({ _id: approvalId, workspaceId })
          .populate('taskId', 'instructions status result error')
          .populate('requestedById', 'name email')
          .populate('approvedById', 'name')
          .populate('rejectedById', 'name');
      if (!approval) throw new Error("Approval not found");
      return approval;
  }

  async createApproval(workspaceId, taskId, requestedById, action, resource) {
      const approval = new AIApproval({
         workspaceId,
         taskId,
         requestedById,
         action,
         resource,
         status: 'PENDING'
      });
      await approval.save();

      // Log creation
      await AIAuditLog.create({
          workspaceId,
          userId: requestedById,
          action: 'APPROVAL_REQUESTED',
          taskId,
          approvalId: approval._id,
          status: 'INFO',
          details: { action, resource }
      });

      return approval;
  }

  async resolveApproval(approvalId, resolvedById, status, reason) {
      const approval = await AIApproval.findById(approvalId);
      if(!approval) throw new Error("Approval not found");
      if(approval.status !== 'PENDING') throw new Error("Approval is already resolved");

      approval.status = status;
      approval.reason = reason;

      if(status === 'APPROVED') {
         approval.approvedById = resolvedById;
      } else {
         approval.rejectedById = resolvedById;
      }
      await approval.save();

      // Log resolution
      await AIAuditLog.create({
          workspaceId: approval.workspaceId,
          userId: resolvedById,
          action: status === 'APPROVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
          taskId: approval.taskId,
          approvalId: approval._id,
          status: 'INFO',
          details: { reason }
      });

      return approval;
  }
}

module.exports = new AIApprovalService();
