import got from 'got/dist/source';

export default class Location {
  public static async getLocationToRegion(status: any): Promise<any> {
    const region = await got({
      method: 'GET',
      url: 'https://map.kakao.com/api/dapi/point/weather',
      searchParams: {
        inputCoordSystem: 'WGS84',
        outputCoordSystem: 'WGS84',
        version: 2,
        service: 'map.daum.net',
        x: status.gps.longitude,
        y: status.gps.latitude,
      },
    }).json<any>();

    return region;
  }

  public static async getLocationURL(kickboard: any): Promise<string> {
    return `https://map.kakao.com/link/to/${kickboard.kickboard.kickboardCode},${kickboard.status.gps.latitude},${kickboard.status.gps.longitude}`;
  }
}
