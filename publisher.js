const fs = require('fs');

const QUEUE_FILE = 'queue.json';
const PUBLISHED_FILE = 'published.json';

function readJson(filePath, fallback = []) {
    if (!fs.existsSync(filePath)) return fallback;
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
        console.error(`Failed to parse ${filePath}:`, err.message);
        return fallback;
    }
}

async function publishToDiscord(post) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return { platform: 'discord', ok: false, reason: 'Missing DISCORD_WEBHOOK_URL secret' };

    const embed = {
        title: post.title || undefined,
        description: post.text || '',
        color: 0x6366f1,
        timestamp: new Date().toISOString()
    };

    if (post.imageUrl) {
        embed.image = { url: post.imageUrl };
    }

    const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] })
    });

    return { platform: 'discord', ok: res.ok, status: res.status };
}

async function publishToTelegram(post) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
        return { platform: 'telegram', ok: false, reason: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID' };
    }

    const captionOrText = post.html || post.text || post.title || '';
    const endpoint = post.imageUrl
        ? `https://api.telegram.org/bot${token}/sendPhoto`
        : `https://api.telegram.org/bot${token}/sendMessage`;

    const payload = post.imageUrl
        ? { chat_id: chatId, photo: post.imageUrl, caption: captionOrText, parse_mode: 'HTML' }
        : { chat_id: chatId, text: captionOrText, parse_mode: 'HTML' };

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    return { platform: 'telegram', ok: res.ok, status: res.status };
}

async function publishToCustomWebhook(post) {
    const webhookUrl = process.env.CUSTOM_WEBHOOK_URL;
    if (!webhookUrl) return { platform: 'webhook', ok: false, reason: 'Missing CUSTOM_WEBHOOK_URL secret' };

    const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: post.id,
            title: post.title,
            text: post.text,
            html: post.html,
            imageUrl: post.imageUrl,
            publishedAt: new Date().toISOString()
        })
    });

    return { platform: 'webhook', ok: res.ok, status: res.status };
}

const ADAPTERS = {
    discord: publishToDiscord,
    telegram: publishToTelegram,
    webhook: publishToCustomWebhook
};

async function runPublisher() {
    const now = new Date();
    const queue = readJson(QUEUE_FILE, []);
    const published = readJson(PUBLISHED_FILE, []);

    const remainingQueue = [];
    let processedCount = 0;

    for (const post of queue) {
        const scheduledTime = new Date(post.scheduledAt);
        const isDue = post.status === 'scheduled' && scheduledTime <= now;

        if (!isDue) {
            remainingQueue.push(post);
            continue;
        }

        console.log(`Processing due post: ${post.id} (${post.title || 'Untitled'})`);
        const deliveryResults = [];

        if (post.dryRun) {
            for (const platform of post.platforms || []) {
                deliveryResults.push({ platform, ok: true, mode: 'dry-run' });
            }
        } else {
            for (const platform of post.platforms || []) {
                const adapter = ADAPTERS[platform.toLowerCase()];
                if (!adapter) {
                    deliveryResults.push({ platform, ok: false, reason: 'Unsupported platform' });
                    continue;
                }
                try {
                    const result = await adapter(post);
                    deliveryResults.push(result);
                } catch (err) {
                    deliveryResults.push({ platform, ok: false, reason: err.message });
                }
            }
        }

        const anySuccess = deliveryResults.some(r => r.ok);

        if (anySuccess) {
            published.unshift({
                ...post,
                status: 'published',
                publishedAt: now.toISOString(),
                deliveryResults
            });
            processedCount++;
            console.log(`Published ${post.id}:`, JSON.stringify(deliveryResults));
        } else {
            remainingQueue.push({
                ...post,
                lastAttemptAt: now.toISOString(),
                lastError: deliveryResults
            });
            console.log(`Deferred ${post.id} (no successful deliveries):`, JSON.stringify(deliveryResults));
        }
    }

    // Keep last 100 published records
    const trimmedPublished = published.slice(0, 100);

    fs.writeFileSync(QUEUE_FILE, JSON.stringify(remainingQueue, null, 2));
    fs.writeFileSync(PUBLISHED_FILE, JSON.stringify(trimmedPublished, null, 2));

    console.log(`Run complete. Published: ${processedCount}, Remaining in queue: ${remainingQueue.length}`);
}

runPublisher();