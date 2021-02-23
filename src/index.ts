import Kickboard from './controllers/kickboard';
import { Liquid } from 'liquidjs';
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import logger from './tools/logger';
import moment from 'moment';
import mongoose from 'mongoose';
import { readFileSync } from 'fs';
if (process.env.NODE_ENV === 'dev') dotenv.config();

async function main() {
  moment.locale('ko');
  logger.info('시스템이 활성화되었습니다.');
  const bot = new Telegraf(process.env.TELEGRAM_BOT!);
  const sslCA = [readFileSync('rds-combined-ca-bundle.pem')];
  const liquid = new Liquid({ root: './templates' });
  mongoose.Promise = global.Promise;
  await bot.launch();

  logger.info('텔레그램 봇이 연결되었습니다.');
  await mongoose.connect(process.env.MONGODB_URI!, {
    useCreateIndex: true,
    useUnifiedTopology: true,
    useNewUrlParser: true,
    sslValidate: false,
    sslCA,
  });

  logger.info('데이터베이스와 연결되었습니다.');
  const res = await Kickboard.getFalldown();
  logger.info(`넘어진 킥보드를 ${res.length}개를 발견하였습니다.`);

  const kickboards: any = [];
  for (const kickboard of res) {
    const result = await Kickboard.getKickboardWithRegion(kickboard);
    kickboards.push(result);
  }

  const message = await liquid.renderFile('list.liquid', {
    current: moment().format('LLL'),
    kickboards: kickboards.sort(
      (a: any, b: any) => a.region.code2 - b.region.code2
    ),
  });

  const regions: { [key: string]: any[] } = {};
  kickboards.forEach((kickboard: any) => {
    let { code2 } = kickboard.region;
    if (!process.env[`${code2}_CHANNEL_ID`]) {
      code2 = process.env.DEFAULT_REGION_ID;
    }

    if (!regions[code2]) regions[code2] = [];
    regions[code2].push(kickboard);
  });

  const current = moment().format('LLL');
  for (const key of Object.keys(regions)) {
    try {
      const value = regions[key];
      const channelId = process.env[`${key}_CHANNEL_ID`];
      const messageId = process.env[`${key}_MESSAGE_ID`];
      const message = await liquid.renderFileSync('list.liquid', {
        current,
        kickboards: value,
      });

      logger.info(`[${key}] 메세지를 렌더링했습니다.`);
      await bot.telegram.editMessageText(
        Number(channelId),
        Number(messageId),
        undefined,
        message,
        { disable_web_page_preview: true }
      );

      logger.info(`[${key}] 메세지를 전송했습니다.`);
    } catch (err) {
      if (
        err.message ===
        '400: Bad Request: message is not modified: specified new message content and reply markup are exactly the same as a current content and reply markup of the message'
      ) {
        logger.info(`[${key}] 업데이트 사항이 없습니다.`);
        continue;
      }

      logger.error(`[${key}] ${err.message}`);
    }
  }

  logger.info('시스템을 종료합니다.');
  process.exit(0);
}

main();
