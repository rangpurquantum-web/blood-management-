import admin from './firebase-admin';

interface SendResult {
  successCount: number;
  failureCount?: number;
  invalidTokens?: string[];
}

export async function sendFCMNotification(
  tokens: string | string[],
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<SendResult | undefined> {
  const tokenList = Array.isArray(tokens) ? tokens : [tokens];

  if (tokenList.length === 0) {
    console.warn('sendFCMNotification: no tokens provided, skipping');
    return;
  }

  const message = {
    notification: { title, body },
    data,
    tokens: tokenList,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`FCM: ${response.successCount} success, ${response.failureCount} failed`);

    if (response.failureCount > 0) {
      const invalidTokens: string[] = [];
      response.responses.forEach((res, idx) => {
        if (!res.success) {
          const token = tokenList[idx];
            if (token) invalidTokens.push(token);
          console.error(`FCM error for token ${idx}:`, res.error?.message);
        }
      });

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
      };
    }

    return { successCount: response.successCount };
  } catch (err) {
    console.error('FCM send error:', err);
    throw err;
  }
}