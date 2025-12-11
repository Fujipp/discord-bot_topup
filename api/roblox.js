// api/roblox.js
// Roblox Groups v1 (Legacy) API Client
// ใช้สำหรับดึงข้อมูลกลุ่มและทำ Robux Payout
const axios = require('axios');
const { authenticator } = require('otplib');

const GROUPS_API_BASE = 'https://groups.roblox.com';
const ECONOMY_API_BASE = 'https://economy.roblox.com';
const THUMBNAILS_API_BASE = 'https://thumbnails.roblox.com';
const TWO_STEP_API_BASE = 'https://twostepverification.roblox.com';
const TRANSACTION_API_BASE = 'https://apis.roblox.com/transaction-records';

// Cache CSRF token
let csrfToken = null;

/**
 * อ่าน config จาก environment
 */
function getConfig() {
    return {
        cookie: (process.env.ROBLOX_SECURITY_COOKIE || '').trim(),
        groupId: (process.env.ROBLOX_GROUP_ID || '').trim(),
        totpSecret: (process.env.ROBLOX_TOTP_SECRET || '').trim().replace(/\s+/g, ''),
    };
}

/**
 * สร้าง TOTP code (เลข 6 หลัก) จาก secret key
 * @returns {string|null} - TOTP code หรือ null ถ้าไม่มี secret
 */
function generateTOTP() {
    const { totpSecret } = getConfig();
    if (!totpSecret) {
        console.log('[Roblox] No TOTP secret configured');
        return null;
    }
    try {
        const token = authenticator.generate(totpSecret);
        console.log('[Roblox] Generated TOTP code:', token);
        return token;
    } catch (err) {
        console.error('[Roblox] Failed to generate TOTP:', err.message);
        return null;
    }
}

/**
 * สร้าง headers พื้นฐานสำหรับ Roblox API
 */
function getHeaders(includeCsrf = false) {
    const { cookie } = getConfig();
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    if (cookie) {
        headers['Cookie'] = `.ROBLOSECURITY=${cookie}`;
    }

    if (includeCsrf && csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken;
    }

    return headers;
}

/**
 * ดึงข้อมูลกลุ่ม
 * @param {string} groupId - Group ID (optional, ใช้จาก env ถ้าไม่ระบุ)
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function getGroupInfo(groupId = null) {
    const gid = groupId || getConfig().groupId;
    if (!gid) {
        return { ok: false, error: { message: 'missing ROBLOX_GROUP_ID' } };
    }

    try {
        const res = await axios.get(`${GROUPS_API_BASE}/v1/groups/${gid}`, {
            headers: getHeaders(false),
        });

        return { ok: true, data: res.data };
    } catch (err) {
        return {
            ok: false,
            error: {
                message: err?.response?.data?.errors?.[0]?.message || err.message,
                status: err?.response?.status,
            },
        };
    }
}

/**
 * ดึง Robux balance ของกลุ่ม
 * @param {string} groupId - Group ID (optional, ใช้จาก env ถ้าไม่ระบุ)
 * @returns {Promise<{ok: boolean, robux?: number, error?: object}>}
 */
async function getGroupFunds(groupId = null) {
    const gid = groupId || getConfig().groupId;
    const { cookie } = getConfig();

    if (!gid) {
        return { ok: false, error: { message: 'missing ROBLOX_GROUP_ID' } };
    }
    if (!cookie) {
        return { ok: false, error: { message: 'missing ROBLOX_SECURITY_COOKIE' } };
    }

    try {
        const res = await axios.get(`${ECONOMY_API_BASE}/v1/groups/${gid}/currency`, {
            headers: getHeaders(false),
        });

        return { ok: true, robux: res.data?.robux ?? 0, data: res.data };
    } catch (err) {
        return {
            ok: false,
            error: {
                message: err?.response?.data?.errors?.[0]?.message || err.message,
                status: err?.response?.status,
            },
        };
    }
}

/**
 * ดึงสถานะ payout restriction ของกลุ่ม
 * @param {string} groupId - Group ID (optional, ใช้จาก env ถ้าไม่ระบุ)
 * @returns {Promise<{ok: boolean, canPayout?: boolean, data?: object, error?: object}>}
 */
async function getPayoutRestriction(groupId = null) {
    const gid = groupId || getConfig().groupId;
    const { cookie } = getConfig();

    if (!gid) {
        return { ok: false, error: { message: 'missing ROBLOX_GROUP_ID' } };
    }
    if (!cookie) {
        return { ok: false, error: { message: 'missing ROBLOX_SECURITY_COOKIE' } };
    }

    try {
        const res = await axios.get(`${GROUPS_API_BASE}/v1/groups/${gid}/payout-restriction`, {
            headers: getHeaders(false),
        });

        return {
            ok: true,
            canPayout: res.data?.canUseRecurringPayout || res.data?.canUseOneTimePayout,
            data: res.data,
        };
    } catch (err) {
        return {
            ok: false,
            error: {
                message: err?.response?.data?.errors?.[0]?.message || err.message,
                status: err?.response?.status,
            },
        };
    }
}

/**
 * ดึง Group Icon URL
 * @param {string} groupId - Group ID (optional, ใช้จาก env ถ้าไม่ระบุ)
 * @returns {Promise<{ok: boolean, iconUrl?: string, error?: object}>}
 */
async function getGroupIcon(groupId = null) {
    const gid = groupId || getConfig().groupId;
    if (!gid) {
        return { ok: false, error: { message: 'missing ROBLOX_GROUP_ID' } };
    }

    try {
        const res = await axios.get(`${THUMBNAILS_API_BASE}/v1/groups/icons`, {
            params: {
                groupIds: gid,
                size: '420x420',
                format: 'Png',
                isCircular: false,
            },
            headers: getHeaders(false),
        });

        const iconData = res.data?.data?.[0];
        if (iconData?.imageUrl) {
            return { ok: true, iconUrl: iconData.imageUrl };
        }
        return { ok: false, error: { message: 'No icon found' } };
    } catch (err) {
        return {
            ok: false,
            error: {
                message: err?.response?.data?.errors?.[0]?.message || err.message,
                status: err?.response?.status,
            },
        };
    }
}

/**
 * ทำ One-time Robux Payout พร้อม 2FA Challenge
 * @param {number} userId - Roblox User ID
 * @param {number} amount - จำนวน Robux
 * @param {string} groupId - Group ID (optional, ใช้จาก env ถ้าไม่ระบุ)
 * @returns {Promise<{ok: boolean, error?: object}>}
 */
async function makeOneTimePayout(userId, amount, groupId = null) {
    const gid = groupId || getConfig().groupId;
    const { cookie, totpSecret } = getConfig();

    if (!gid) {
        return { ok: false, error: { message: 'missing ROBLOX_GROUP_ID' } };
    }
    if (!cookie) {
        return { ok: false, error: { message: 'missing ROBLOX_SECURITY_COOKIE' } };
    }
    if (!userId || !amount || amount <= 0) {
        return { ok: false, error: { message: 'invalid userId or amount' } };
    }

    const payload = {
        PayoutType: 'FixedAmount',
        Recipients: [
            {
                recipientId: Number(userId),
                recipientType: 'User',
                amount: Number(amount),
            },
        ],
    };

    const payoutUrl = `${GROUPS_API_BASE}/v1/groups/${gid}/payouts`;

    // Helper function สำหรับ payout request
    async function attemptPayout(extraHeaders = {}) {
        return axios.post(payoutUrl, payload, {
            headers: { ...getHeaders(true), ...extraHeaders },
        });
    }

    // ลอง request ครั้งแรก
    try {
        const res = await attemptPayout();
        return { ok: true, data: res.data };
    } catch (err) {
        // ถ้าได้ CSRF token กลับมา ให้ retry
        const newCsrf = err?.response?.headers?.['x-csrf-token'];
        if (err?.response?.status === 403 && newCsrf) {
            csrfToken = newCsrf;

            try {
                const retryRes = await attemptPayout();
                return { ok: true, data: retryRes.data };
            } catch (retryErr) {
                // ตรวจสอบว่าต้อง 2FA หรือไม่
                const challengeId = retryErr?.response?.headers?.['rblx-challenge-id'];
                const challengeType = retryErr?.response?.headers?.['rblx-challenge-type'];
                const challengeMetadata = retryErr?.response?.headers?.['rblx-challenge-metadata'];

                if (challengeId && challengeType === 'twostepverification') {
                    console.log('[Roblox] 2FA Challenge required:', challengeId);
                    return await handle2FAChallenge(challengeId, challengeMetadata, payload, gid);
                }

                return {
                    ok: false,
                    error: {
                        message: retryErr?.response?.data?.errors?.[0]?.message || retryErr.message,
                        status: retryErr?.response?.status,
                        code: retryErr?.response?.data?.errors?.[0]?.code,
                    },
                };
            }
        }

        // ตรวจสอบว่าต้อง 2FA หรือไม่
        const challengeId = err?.response?.headers?.['rblx-challenge-id'];
        const challengeType = err?.response?.headers?.['rblx-challenge-type'];
        const challengeMetadata = err?.response?.headers?.['rblx-challenge-metadata'];

        if (challengeId && challengeType === 'twostepverification') {
            console.log('[Roblox] 2FA Challenge required:', challengeId);
            return await handle2FAChallenge(challengeId, challengeMetadata, payload, gid);
        }

        return {
            ok: false,
            error: {
                message: err?.response?.data?.errors?.[0]?.message || err.message,
                status: err?.response?.status,
                code: err?.response?.data?.errors?.[0]?.code,
            },
        };
    }
}

/**
 * Handle 2FA Challenge สำหรับ Payout
 * Flow: 1) Verify TOTP → 2) Continue challenge → 3) Retry payout
 */
async function handle2FAChallenge(firstChallengeId, challengeMetadataBase64, payload, groupId) {
    const { totpSecret } = getConfig();

    if (!totpSecret) {
        return {
            ok: false,
            error: { message: 'ต้องการ 2FA แต่ไม่ได้ตั้งค่า ROBLOX_TOTP_SECRET ใน .env' },
        };
    }

    try {
        // Decode metadata เพื่อดึง second challengeId
        let metadata = {};
        try {
            metadata = JSON.parse(Buffer.from(challengeMetadataBase64, 'base64').toString('utf8'));
            console.log('[Roblox] Challenge metadata:', JSON.stringify(metadata));
        } catch (e) {
            console.error('[Roblox] Could not parse challenge metadata:', e.message);
            return {
                ok: false,
                error: { message: 'ไม่สามารถ parse challenge metadata ได้' },
            };
        }

        const secondChallengeId = metadata.challengeId; // Challenge ID ตัวที่สองจาก metadata
        const userId = metadata.userId;

        if (!secondChallengeId || !userId) {
            console.error('[Roblox] Missing challengeId or userId in metadata');
            return {
                ok: false,
                error: { message: 'Metadata ไม่มี challengeId หรือ userId' },
            };
        }

        console.log('[Roblox] First Challenge ID:', firstChallengeId);
        console.log('[Roblox] Second Challenge ID:', secondChallengeId);
        console.log('[Roblox] User ID:', userId);

        // Generate TOTP code
        const totpCode = generateTOTP();
        if (!totpCode) {
            return {
                ok: false,
                error: { message: 'ไม่สามารถสร้าง TOTP code ได้ - ตรวจสอบ ROBLOX_TOTP_SECRET' },
            };
        }

        console.log('[Roblox] Step 1: Verifying 2FA with TOTP code...');

        // Step 1: Verify TOTP - ใช้ SECOND challenge ID
        const verifyRes = await axios.post(
            `${TWO_STEP_API_BASE}/v1/users/${userId}/challenges/authenticator/verify`,
            {
                challengeId: secondChallengeId, // ใช้ second challengeId!
                actionType: 'Generic',
                code: totpCode,
            },
            { headers: getHeaders(true) }
        );

        if (!verifyRes.data?.verificationToken) {
            console.error('[Roblox] No verification token received');
            return {
                ok: false,
                error: { message: '2FA verification failed - ไม่ได้รับ verification token' },
            };
        }

        const verificationToken = verifyRes.data.verificationToken;
        console.log('[Roblox] Step 1 success, got verification token');

        // Step 2: Continue challenge - ส่งไป apis.roblox.com/challenge/v1/continue
        console.log('[Roblox] Step 2: Continuing challenge...');

        const continueMetadata = JSON.stringify({
            verificationToken: verificationToken,
            rememberDevice: false,
            challengeId: secondChallengeId, // ใช้ second challengeId
        });

        const continueRes = await axios.post(
            'https://apis.roblox.com/challenge/v1/continue',
            {
                challengeId: firstChallengeId, // ใช้ first challengeId
                challengeMetadata: continueMetadata, // ต้องเป็น string ไม่ใช่ object
                challengeType: 'twostepverification',
            },
            { headers: getHeaders(true) }
        );

        console.log('[Roblox] Step 2 success, challenge continued');

        // Step 3: Retry payout with challenge headers
        console.log('[Roblox] Step 3: Retrying payout...');

        // สร้าง response metadata สำหรับ payout
        const responseMetadata = Buffer.from(JSON.stringify({
            verificationToken: verificationToken,
            rememberDevice: false,
            challengeId: secondChallengeId,
        })).toString('base64');

        const finalRes = await axios.post(
            `${GROUPS_API_BASE}/v1/groups/${groupId}/payouts`,
            payload,
            {
                headers: {
                    ...getHeaders(true),
                    'rblx-challenge-id': firstChallengeId,
                    'rblx-challenge-type': 'twostepverification',
                    'rblx-challenge-metadata': responseMetadata,
                },
            }
        );

        console.log('[Roblox] Payout successful with 2FA!');
        return { ok: true, data: finalRes.data };

    } catch (err) {
        console.error('[Roblox] 2FA Challenge failed:', err?.response?.data || err.message);
        return {
            ok: false,
            error: {
                message: err?.response?.data?.errors?.[0]?.message || err.message || '2FA Challenge failed',
                status: err?.response?.status,
            },
        };
    }
}


/**
 * Error code mapping จาก Roblox
 */
const ROBLOX_ERROR_CODES = {
    1: 'ROBLOX_GROUP_INVALID',
    12: 'ROBLOX_INSUFFICIENT_FUNDS',
    22: 'ROBLOX_FEATURE_DISABLED',
    23: 'ROBLOX_INSUFFICIENT_PERMISSIONS',
    24: 'ROBLOX_INVALID_PAYOUT_TYPE',
    25: 'ROBLOX_INVALID_AMOUNT',
    26: 'ROBLOX_TOO_MANY_RECIPIENTS',
    28: 'ROBLOX_PAYOUT_RATE_LIMIT',
    35: 'ROBLOX_2FA_REQUIRED',
};

/**
 * แปลง error code เป็น internal enum
 */
function mapErrorCode(code) {
    return ROBLOX_ERROR_CODES[code] || 'ROBLOX_UNKNOWN_ERROR';
}

const USERS_API_BASE = 'https://users.roblox.com';

/**
 * ค้นหา Roblox User จาก username
 * @param {string} username - Roblox username
 * @returns {Promise<{ok: boolean, userId?: number, username?: string, error?: object}>}
 */
async function getUserByUsername(username) {
    if (!username || typeof username !== 'string') {
        return { ok: false, error: { message: 'กรุณาระบุ username' } };
    }

    try {
        const res = await axios.post(`${USERS_API_BASE}/v1/usernames/users`, {
            usernames: [username.trim()],
            excludeBannedUsers: true,
        });

        const user = res.data?.data?.[0];
        if (!user) {
            return { ok: false, error: { message: `ไม่พบผู้ใช้ชื่อ ${username}` } };
        }

        return { ok: true, userId: user.id, username: user.name, displayName: user.displayName };
    } catch (err) {
        return {
            ok: false,
            error: {
                message: err?.response?.data?.errors?.[0]?.message || err.message,
                status: err?.response?.status,
            },
        };
    }
}

/**
 * ตรวจสอบสิทธิ์รับ Robux ของผู้ใช้
 * @param {string} username - Roblox username
 * @param {string} groupId - Group ID (optional, ใช้จาก env ถ้าไม่ระบุ)
 * @returns {Promise<{ok: boolean, eligible?: boolean, status?: string, message?: string, color?: number, userId?: number, username?: string}>}
 */
async function checkRobloxEligibility(username, groupId = null) {
    const gid = groupId || getConfig().groupId;
    const { cookie } = getConfig();

    if (!gid) {
        return { ok: false, message: 'ยังไม่ได้ตั้งค่า ROBLOX_GROUP_ID', color: 0xed4245 };
    }
    if (!cookie) {
        return { ok: false, message: 'ยังไม่ได้ตั้งค่า ROBLOX_SECURITY_COOKIE', color: 0xed4245 };
    }

    // หา userId จาก username
    const userResult = await getUserByUsername(username);
    if (!userResult.ok) {
        return {
            ok: false,
            message: userResult.error?.message || 'ไม่พบผู้ใช้',
            color: 0xed4245,
        };
    }

    const userId = userResult.userId;
    const robloxUsername = userResult.username;

    try {
        const url = `${ECONOMY_API_BASE}/v1/groups/${gid}/users-payout-eligibility?userIds=${userId}`;
        const res = await axios.get(url, {
            headers: getHeaders(false),
        });

        const status = res.data?.usersGroupPayoutEligibility?.[userId];

        let message = '';
        let color = 0x7987AC;
        let eligible = false;

        switch (status) {
            case 'Eligible':
                message = `<:Ts_22_discord_1ture:1397892606209429584> ผู้ใช้ **${robloxUsername}** มีสิทธิ์รับ Robux แล้ว`;
                color = 0x3ba55d;
                eligible = true;
                break;
            case 'NotInGroup':
                message = `<:Ts_22_discord_1false:1397892604040974479> ผู้ใช้ **${robloxUsername}** ยังไม่ได้เข้ากลุ่ม`;
                color = 0xed4245;
                break;
            case 'NotEligibleDueToJoinDate':
            case 'PayoutRestricted':
                message = `<:Ts_22_discord_1false:1397892604040974479> ผู้ใช้ **${robloxUsername}** ยังไม่ครบกำหนดเวลา 14 วัน หรือถูกจำกัดสิทธิ์`;
                color = 0xed4245;
                break;
            case 'GroupRestricted':
                message = `<:Ts_22_discord_1false:1397892604040974479> กลุ่มนี้ไม่สามารถจ่าย Robux ได้ในขณะนี้`;
                color = 0xed4245;
                break;
            case 'UserRestricted':
                message = `<:Ts_22_discord_1false:1397892604040974479> บัญชีผู้ใช้นี้ถูกจำกัด ไม่สามารถรับ Robux`;
                color = 0xed4245;
                break;
            default:
                message = `<:Ts_22_discord_1false:1397892604040974479> ไม่สามารถตรวจสอบสถานะได้ (${status || 'Unknown'})`;
                color = 0xed4245;
        }

        return {
            ok: true,
            eligible,
            status,
            message,
            color,
            userId,
            username: robloxUsername,
        };
    } catch (err) {
        console.error('[Roblox] Eligibility check failed:', err?.response?.data || err.message);
        return {
            ok: false,
            message: 'อาจเกิดจาก:\n- ชื่อผู้ใช้ผิด\n- ระบบ Roblox ขัดข้อง\n- การเชื่อมต่อผิดพลาด',
            color: 0xed4245,
        };
    }
}

/**
 * ดึง Avatar/Headshot URL ของ Roblox User
 * @param {number} userId - Roblox User ID
 * @returns {Promise<{ok: boolean, avatarUrl?: string, error?: object}>}
 */
async function getUserAvatarUrl(userId) {
    if (!userId) {
        return { ok: false, error: { message: 'missing userId' } };
    }

    try {
        const res = await axios.get(`${THUMBNAILS_API_BASE}/v1/users/avatar-headshot`, {
            params: {
                userIds: userId,
                size: '150x150',
                format: 'Png',
                isCircular: false,
            },
        });

        const data = res.data?.data?.[0];
        if (data?.imageUrl) {
            return { ok: true, avatarUrl: data.imageUrl };
        }
        return { ok: false, error: { message: 'No avatar found' } };
    } catch (err) {
        console.error('[Roblox] Failed to get user avatar:', err?.message);
        return {
            ok: false,
            error: {
                message: err?.response?.data?.errors?.[0]?.message || err.message,
            },
        };
    }
}

/**
 * ดึงสรุปรายได้/รายจ่ายของกลุ่ม (ปี)
 * @param {string} groupId - Group ID (optional, ใช้จาก env ถ้าไม่ระบุ)
 * @returns {Promise<{ok: boolean, data?: object, error?: object}>}
 */
async function getGroupRevenueSummary(groupId = null) {
    const gid = groupId || getConfig().groupId;

    if (!gid) {
        return { ok: false, error: { message: 'missing ROBLOX_GROUP_ID' } };
    }

    try {
        const res = await axios.get(
            `${TRANSACTION_API_BASE}/v1/groups/${gid}/revenue/summary/year`,
            { headers: getHeaders(true) }
        );

        return {
            ok: true,
            data: res.data,
            // ข้อมูลที่สำคัญ
            itemSaleRobux: res.data?.itemSaleRobux || 0,
            groupPayoutRobux: Math.abs(res.data?.groupPayoutRobux || 0), // ค่าเป็นลบ ต้อง abs
            pendingRobux: res.data?.pendingRobux || 0,
            commissionRobux: res.data?.commissionRobux || 0,
        };
    } catch (err) {
        console.error('[Roblox] Failed to get revenue summary:', err?.response?.data || err.message);
        return {
            ok: false,
            error: {
                message: err?.response?.data?.errors?.[0]?.message || err.message,
                status: err?.response?.status,
            },
        };
    }
}

module.exports = {
    getGroupInfo,
    getGroupFunds,
    getGroupIcon,
    getPayoutRestriction,
    makeOneTimePayout,
    mapErrorCode,
    getConfig,
    getUserByUsername,
    checkRobloxEligibility,
    getUserAvatarUrl,
    getGroupRevenueSummary,
    ROBLOX_ERROR_CODES,
};
