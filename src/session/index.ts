/**
 * 会话管理层导出接口
 */

export {
  createSession,
  getSessionMetadata,
  pauseSession,
  resumeSession,
  completeSession,
  failSession,
  checkSessionExpiration,
  getAllActiveSessions,
  deleteSession,
  setSessionVariable,
  getSessionVariable,
  getSessionVariables,
  generateSessionReport,
  clearSessions
} from './session-manager.js'

export type { SessionStatus, SessionMetadata } from './session-manager.js'
