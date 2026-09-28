import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { loginLimiter } from '../middleware/rate-limit'
import { loginHandler, logoutHandler, meHandler } from '../controllers/auth.controller'

export const authRouter = Router()

authRouter.post('/login', loginLimiter, loginHandler)
authRouter.get('/me', requireAuth, meHandler)
authRouter.post('/logout', requireAuth, logoutHandler)
