import { Liquid } from 'liquidjs';
import moment from 'moment';
import mongoose from 'mongoose';
import { Telegraf } from 'telegraf';
import { Kickboard, logger } from '.';

export * from './controllers';
export * from './models';
export * from './tools';

export async function main() {
  moment.locale('ko');
  logger.info('시스템이 활성화되었습니다.');
  const bot = new Telegraf(process.env.TELEGRAM_BOT!);
  const liquid = new Liquid({ root: './templates' });
  mongoose.Promise = global.Promise;
  await bot.launch();

  logger.info('텔레그램 봇이 연결되었습니다.');
  const DATABASE_URL =
    process.env.DATABASE_URL || 'mongodb://localhost:27017/kickboard';
  mongoose.Promise = global.Promise;
  await mongoose.connect(DATABASE_URL);
  logger.info('데이터베이스와 연결되었습니다.');
  const res = await Kickboard.getFalldown();
  logger.info(`넘어진 킥보드를 ${res.length}개를 발견하였습니다.`);
  const kickboards: any = [];
  for (const kickboard of res) {
    const result = await Kickboard.getKickboardWithRegion(kickboard);
    kickboards.push(result);
  }

  const regions: { [key: string]: any[] } = {};
  const defaultRegions = process.env.CHANNEL_REGIONS || '';
  defaultRegions
    .split(',')
    .filter((region) => region.length > 0)
    .forEach((region) => (regions[region] = []));

  kickboards.forEach((kickboard: any) => {
    let { code1 } = kickboard.region;
    if (!process.env[`${code1}_CHANNEL_ID`]) {
      code1 = process.env.DEFAULT_REGION_ID;
    }

    if (!regions[code1]) regions[code1] = [];
    regions[code1].push(kickboard);
  });

  const current = moment().format('LLL');
  for (const key of Object.keys(regions)) {
    try {
      const value = regions[key];
      const channelId = process.env[`REGION_${key}_CHANNEL_ID`];
      const messageId = process.env[`REGION_${key}_MESSAGE_ID`];
      const message = await liquid.renderFileSync('list.liquid', {
        current,
        kickboards: value.sort(
          (a: any, b: any) => a.region.code1 - b.region.code1
        ),
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
    } catch (err: any) {
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
