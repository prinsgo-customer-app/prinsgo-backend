const jwt = require('jsonwebtoken');
const User = require('../../../models/User');
const AIWorkspace = require('../models/AIWorkspace');

// Authenticate and attach user. Similar to protectCustomer but used for AI backend
const protectAIUser = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized for AI resources. Token missing.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // We allow anyone with a valid token to try, but their role impacts RBAC
    const user = await User.findById(decoded.id || decoded._id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Your account is blocked.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
      error: error.message,
    });
  }
};

// Workspace Isolation Middleware
// Ensures the user has access to the workspace specified in req.params.workspaceId or req.body.workspaceId
const requireWorkspaceAccess = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({ success: false, message: 'Workspace ID is required for this operation.' });
    }

    const workspace = await AIWorkspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found.' });
    }

    // Check if the user is the owner (can be extended for members later)
    if (workspace.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Access denied. You do not own this workspace.' });
    }

    req.workspace = workspace;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error checking workspace access.', error: error.message });
  }
};

// RBAC Middleware
const requireAIPermission = (requiredPermission) => {
  return (req, res, next) => {
    // For now, map permissions to roles. Admins have all permissions.
    // In a fully-fledged system, this would check a user_permissions table.

    const adminPermissions = [
      'AI_AGENT_VIEW', 'AI_AGENT_CREATE', 'AI_AGENT_UPDATE', 'AI_AGENT_DELETE',
      'AI_TASK_CREATE', 'AI_TASK_EXECUTE', 'AI_TASK_CANCEL',
      'AI_APPROVAL_VIEW', 'AI_APPROVAL_APPROVE', 'AI_APPROVAL_REJECT',
      'AI_MEMORY_VIEW', 'AI_MEMORY_MANAGE', 'AI_REPOSITORY_VIEW', 'AI_REPOSITORY_MANAGE',
      'AI_CODE_ANALYSIS', 'AI_CODE_MODIFICATION', 'AI_GITHUB_READ', 'AI_GITHUB_WRITE',
      'AI_AUTOMATION_MANAGE', 'AI_PROVIDER_MANAGE', 'AI_INTEGRATION_MANAGE'
    ];

    const customerPermissions = [
      'AI_AGENT_VIEW', 'AI_TASK_CREATE', 'AI_TASK_EXECUTE', 'AI_MEMORY_VIEW', 'AI_MEMORY_MANAGE'
    ];

    let userPermissions = [];
    if (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.role === 'manager') {
       userPermissions = adminPermissions;
    } else {
       userPermissions = customerPermissions;
    }

    if (!userPermissions.includes(requiredPermission)) {
        return res.status(403).json({
          success: false,
          message: `Missing required permission: ${requiredPermission}`,
        });
    }

    next();
  };
};

module.exports = {
  protectAIUser,
  requireWorkspaceAccess,
  requireAIPermission
};
