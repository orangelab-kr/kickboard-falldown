import moment from 'moment';
import { Location, StatusModel } from '..';

export class Kickboard {
  public static async getKickboardWithRegion(kickboard: any): Promise<any[]> {
    const { status } = kickboard;
    kickboard.status.createdAt = moment(status.createdAt).format('LLL');
    const region = await Location.getLocationToRegion(status);
    const url = await Location.getLocationURL(kickboard);
    return {
      ...kickboard,
      region: region.codes.hcode,
      url,
    };
  }

  public static async getFalldown(): Promise<any[]> {
    const $gt = moment().add(-30, 'minutes').toDate();
    const kickboards = await StatusModel.aggregate([
      { $match: { createdAt: { $gt } } },
      {
        $group: {
          _id: '$kickboardId',
          reports: { $sum: 1 },
          enabled: { $sum: { $cond: [{ $eq: ['$isEnabled', true] }, 1, 0] } },
          falldown: { $sum: { $cond: [{ $eq: ['$isFallDown', true] }, 1, 0] } },
        },
      },
      { $addFields: { result: { $eq: ['$reports', '$falldown'] } } },
      { $match: { enabled: 0, result: true } },
      { $sort: { reports: -1 } },
      {
        $lookup: {
          from: 'kickboards',
          localField: '_id',
          foreignField: 'kickboardId',
          as: 'kickboard',
        },
      },
      { $unwind: '$kickboard' },
      {
        $lookup: {
          from: 'status',
          localField: 'kickboard.status',
          foreignField: '_id',
          as: 'status',
        },
      },
      { $unwind: '$status' },
    ]);

    return kickboards;
  }
}
