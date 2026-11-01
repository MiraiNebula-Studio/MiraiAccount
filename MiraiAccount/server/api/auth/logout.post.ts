// 登出接口
import { defineApiHandler } from '../../lib/api';
import { authService } from '../../services/auth.service';

export default defineApiHandler(async ({ session }) => authService.logout(session));