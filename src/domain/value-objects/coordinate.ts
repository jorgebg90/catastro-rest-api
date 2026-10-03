import { InvalidQueryError } from '../errors/index.js';
import { err, ok, type Result } from '../result.js';

const SUPPORTED_SRS = new Set(['EPSG:4326', 'EPSG:4258']);
const MIN_LONGITUDE = -180;
const MAX_LONGITUDE = 180;
const MIN_LATITUDE = -90;
const MAX_LATITUDE = 90;

export interface CoordinateProps {
    readonly longitude: number | undefined;
    readonly latitude: number | undefined;
    readonly srs?: string;
}

export class Coordinate {
    private constructor(
        public readonly longitude: number,
        public readonly latitude: number,
        public readonly srs: string,
    ) {
        Object.freeze(this);
    }

    public static from(props: CoordinateProps): Result<Coordinate, InvalidQueryError> {
        if (props.longitude === undefined || props.longitude === null) {
            return err(new InvalidQueryError('MISSING_PARAMETER', 'Longitude is required'));
        }
        if (props.latitude === undefined || props.latitude === null) {
            return err(new InvalidQueryError('MISSING_PARAMETER', 'Latitude is required'));
        }

        const lon = Number(props.longitude);
        const lat = Number(props.latitude);

        if (!Number.isFinite(lon)) {
            return err(new InvalidQueryError('INVALID_PARAMETER', 'Longitude must be a finite number'));
        }
        if (!Number.isFinite(lat)) {
            return err(new InvalidQueryError('INVALID_PARAMETER', 'Latitude must be a finite number'));
        }

        if (lon < MIN_LONGITUDE || lon > MAX_LONGITUDE) {
            return err(new InvalidQueryError('INVALID_PARAMETER', `Longitude must be between ${MIN_LONGITUDE} and ${MAX_LONGITUDE}`));
        }
        if (lat < MIN_LATITUDE || lat > MAX_LATITUDE) {
            return err(new InvalidQueryError('INVALID_PARAMETER', `Latitude must be between ${MIN_LATITUDE} and ${MAX_LATITUDE}`));
        }

        const srs = (props.srs ?? 'EPSG:4326').trim().toUpperCase();
        if (!SUPPORTED_SRS.has(srs)) {
            return err(new InvalidQueryError('INVALID_PARAMETER', `Unsupported SRS: ${srs}. Supported values: EPSG:4326, EPSG:4258`));
        }

        return ok(new Coordinate(lon, lat, srs));
    }
}
