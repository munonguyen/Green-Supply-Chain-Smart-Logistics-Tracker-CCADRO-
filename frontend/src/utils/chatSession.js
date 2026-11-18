export function localChatSessionIssue(token) {
  if (!token)
    return { kind: 'AUTH_REQUIRED', message: 'Bạn cần đăng nhập để sử dụng chat trực tuyến.' };
  if (token.startsWith('iam-jwt-')) {
    return {
      kind: 'AUTH_REQUIRED',
      message:
        'Bạn đang dùng phiên đăng nhập cục bộ. Hãy đăng nhập lại với máy chủ để sử dụng chat trực tuyến.'
    };
  }
  return null;
}

export function chatRequestIssue(error) {
  if (error.status === 401) {
    return {
      kind: 'AUTH_REQUIRED',
      message:
        'Máy chủ không chấp nhận phiên đăng nhập hiện tại. Vui lòng đăng nhập lại để tiếp tục chat.'
    };
  }
  if (error.status === 403) {
    return { kind: 'FORBIDDEN', message: 'Bạn chưa có quyền thực hiện yêu cầu chat này.' };
  }
  return { kind: 'CONNECTION', message: error.message || 'Không thể kết nối chat.' };
}
