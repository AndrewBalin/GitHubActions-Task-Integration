const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const BITRIX_WEBHOOK_URL = process.env.BITRIX_WEBHOOK_URL;
const BITRIX_TASK_URL = process.env.BITRIX_TASK_URL;

const sendTelegramMessage = async (message) => {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
    });
};

const getBitrixTaskTitle = async (taskId) => {
    const res = await axios.get(`${BITRIX_WEBHOOK_URL}/tasks.task.get`, {
        params: { taskId },
    });
    return res.data.result.task.title;
};

const updateBitrixTaskStatus = async (taskId, status) => {
    await axios.get(`${BITRIX_WEBHOOK_URL}/tasks.task.update`, {
        params: { taskId, fields: { STAGE_ID: status } },
    });
};

app.post('/webhook', async (req, res) => {
    const { environment, branches } = req.body;

    const taskIds = branches
        .map(branch => branch.match(/#(\d+)/))
        .filter(match => match)
        .map(match => match[1]);

    let message = `🚀 *Деплой на ${environment} завершен*\n\nЗадачи:\n`;

    for (const taskId of taskIds) {
        const title = await getBitrixTaskTitle(taskId);
        const taskLink = `${BITRIX_TASK_URL}${taskId}/`;
        message += `- [#${taskId}](${taskLink}) ${title}\n`;

        if (environment === 'prod') {
            await updateBitrixTaskStatus(taskId, 'Проверить на проде');
        }
    }

    await sendTelegramMessage(message);

    res.status(200).send('Webhook обработан');
});

app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
