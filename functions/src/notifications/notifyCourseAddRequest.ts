import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/** 코스 추가 요청 알림 수신 메일 */
export const COURSE_ADD_REQUEST_NOTIFY_EMAIL = 'dev@burunet.co.kr';

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

/**
 * SMTP는 functions/.env (또는 .env.scorecard-app-6f9bd) 로 설정합니다.
 * (구 functions:config:set 는 2026-03 이후 사용 불가)
 */
function readSmtpConfig(): SmtpConfig | null {
  const host = (process.env.SMTP_HOST || '').trim();
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();
  const port = Number(process.env.SMTP_PORT || '587');
  const from =
    (process.env.SMTP_FROM || '').trim() ||
    (user ? `라베스코 알림 <${user}>` : '');

  if (!host || !user || !pass || !from) return null;
  return { host, port, user, pass, from };
}

function buildEmailBody(
  requestId: string,
  data: FirebaseFirestore.DocumentData
): {
  subject: string;
  text: string;
  html: string;
} {
  const golfCourseName = String(data.golfCourseName ?? '(이름 없음)');
  const region = String(data.region ?? '-');
  const details = String(data.details ?? '').trim() || '(상세 없음)';
  const userNickname = String(data.userNickname ?? '-');
  const userEmail = String(data.userEmail ?? '-');
  const userId = String(data.userId ?? '-');

  const subject = `[라베스코] 코스 추가 요청: ${golfCourseName}`;
  const text = [
    '새로운 골프장(코스) 추가 요청이 등록되었습니다.',
    '',
    `요청 ID: ${requestId}`,
    `골프장명: ${golfCourseName}`,
    `지역: ${region}`,
    `요청자: ${userNickname}`,
    `이메일: ${userEmail}`,
    `UID: ${userId}`,
    '',
    '상세 내용:',
    details,
    '',
    'admin-web > 코스 추가 요청 메뉴에서 처리해 주세요.',
  ].join('\n');

  const html = `
    <div style="font-family:sans-serif;line-height:1.5;color:#111">
      <h2 style="margin:0 0 12px">코스 추가 요청</h2>
      <p>새로운 골프장(코스) 추가 요청이 등록되었습니다.</p>
      <table style="border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:4px 12px 4px 0;color:#666">요청 ID</td><td>${escapeHtml(requestId)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">골프장명</td><td><strong>${escapeHtml(golfCourseName)}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">지역</td><td>${escapeHtml(region)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">요청자</td><td>${escapeHtml(userNickname)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">이메일</td><td>${escapeHtml(userEmail)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666">UID</td><td>${escapeHtml(userId)}</td></tr>
      </table>
      <p style="margin:8px 0 4px;color:#666">상세 내용</p>
      <pre style="white-space:pre-wrap;background:#f4f4f5;padding:12px;border-radius:8px">${escapeHtml(details)}</pre>
      <p style="margin-top:16px;font-size:13px;color:#666">admin-web → 코스 추가 요청 메뉴에서 처리해 주세요.</p>
    </div>
  `;

  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * courseAddRequests 문서 생성 시 관리자 메일 알림.
 * 1) mail 컬렉션에 적재 (Firebase Trigger Email 확장과 호환)
 * 2) SMTP(.env)가 있으면 nodemailer로 즉시 발송
 */
export const notifyCourseAddRequestCreated = functions.firestore
  .document('courseAddRequests/{requestId}')
  .onCreate(async (snap, context) => {
    const requestId = context.params.requestId as string;
    const data = snap.data() || {};
    const { subject, text, html } = buildEmailBody(requestId, data);
    const to = COURSE_ADD_REQUEST_NOTIFY_EMAIL;

    await admin.firestore().collection('mail').add({
      to: [to],
      message: { subject, text, html },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'courseAddRequests',
      sourceId: requestId,
    });

    const smtp = readSmtpConfig();
    if (!smtp) {
      functions.logger.warn(
        'SMTP not configured. Queued mail doc only. Add functions/.env with SMTP_* and redeploy.',
        { requestId, to }
      );
      return null;
    }

    // 콜드스타트 완화: nodemailer는 메일 발송 시에만 로드
    const nodemailer = (await import('nodemailer')).default;
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    });

    await transporter.sendMail({
      from: smtp.from,
      to,
      subject,
      text,
      html,
    });

    functions.logger.info('Course add request email sent', { requestId, to });
    return null;
  });
