import { Injectable, Logger } from '@nestjs/common';

// ─── TYPES ──────────────────────────────────────────
export interface ReverseGeocodeResult {
  displayName: string;
  city: string | null;
  state: string | null;
  country: string | null;
  countryCode: string | null;
  neighbourhood: string | null;
  road: string | null;
  type: string;
  osmType: string;
  osmId: number;
}

export interface POIResult {
  name: string;
  type: string;
  category: string;
  distance: number;
  osmId: number;
}

export interface GeofenceValidationResult {
  isRelevant: boolean;
  confidence: number;
  locationName: string;
  nearbyPOIs: POIResult[];
  questCategoryMatch: boolean;
  notes: string;
}

// ─── QUEST CATEGORY → POI TAGS ──────────────────────
const CATEGORY_POI_MAP: Record<string, { tags: string[]; keywords: string[] }> = {
  nature: {
    tags: ['park', 'garden', 'forest', 'nature_reserve', 'wood', 'fell', 'scrub', 'grassland', 'tree'],
    keywords: ['parque', 'jardín', 'bosque', 'naturaleza', 'plaza', 'verde', 'árbol', 'río', 'lago', 'montaña'],
  },
  creativity: {
    tags: ['arts_centre', 'studio', 'museum', 'gallery'],
    keywords: ['arte', 'galería', 'museo', 'estudio'],
  },
  kindness: {
    tags: ['hospital', 'church', 'community_centre', 'shelter'],
    keywords: ['iglesia', 'hospital', 'comunidad'],
  },
  learning: {
    tags: ['library', 'university', 'school', 'college'],
    keywords: ['biblioteca', 'universidad', 'escuela'],
  },
  movement: {
    tags: ['gym', 'sports_centre', 'swimming_pool', 'stadium', 'track'],
    keywords: ['gimnasio', 'cancha', 'piscina'],
  },
  social: {
    tags: ['cafe', 'restaurant', 'bar', 'community_centre', 'park'],
    keywords: ['café', 'restaurante', 'bar'],
  },
  photography: {
    tags: ['park', 'garden', 'viewpoint', 'monument', 'artwork', 'attraction'],
    keywords: ['foto', 'vista', 'monumento'],
  },
  relaxation: {
    tags: ['park', 'garden', 'spa', 'beach', 'lake', 'viewpoint'],
    keywords: ['parque', 'jardín', 'playa'],
  },
  adventure: {
    tags: ['peak', 'mountain', 'cliff', 'cave', 'spring', 'waterfall', 'viewpoint'],
    keywords: ['montaña', 'pico', 'cueva', 'cascada'],
  },
};

const NEARBY_RADIUS = 500;

@Injectable()
export class GeofenceService {
  private readonly logger = new Logger(GeofenceService.name);
  private readonly nominatimUrl = 'https://nominatim.openstreetmap.org';
  private readonly overpassUrls = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  // ─── REVERSE GEOCODE ──────────────────────────────
  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    this.logger.log(`Reverse geocoding: ${lat}, ${lng}`);

    const url = `${this.nominatimUrl}/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'HaruApp/1.0 (haru@boti.app)' },
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`);
    }

    const data = await response.json();

    return {
      displayName: data.display_name || 'Unknown location',
      city: data.address?.city || data.address?.town || data.address?.village || null,
      state: data.address?.state || null,
      country: data.address?.country || null,
      countryCode: data.address?.country_code?.toUpperCase() || null,
      neighbourhood: data.address?.neighbourhood || data.address?.suburb || null,
      road: data.address?.road || null,
      type: data.type || 'unknown',
      osmType: data.osm_type || '',
      osmId: data.osm_id || 0,
    };
  }

  // ─── FIND NEARBY POIs ─────────────────────────────
  async findNearbyPOIs(lat: number, lng: number, radius: number = NEARBY_RADIUS): Promise<POIResult[]> {
    this.logger.log(`Finding POIs near ${lat}, ${lng} (radius: ${radius}m)`);

    const query = `
      [out:json][timeout:10];
      (
        node["name"](around:${radius},${lat},${lng});
        way["name"](around:${radius},${lat},${lng});
        node["leisure"](around:${radius},${lat},${lng});
        node["natural"](around:${radius},${lat},${lng});
        node["tourism"](around:${radius},${lat},${lng});
        node["amenity"](around:${radius},${lat},${lng});
      );
      out body center 50;
    `;

    let response: Response | null = null;
    for (const url of this.overpassUrls) {
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          body: `data=${encodeURIComponent(query)}`,
        });
        if (response.ok) break;
      } catch {
        continue;
      }
    }

    if (!response || !response.ok) {
      this.logger.warn(`Overpass API unavailable (${response?.status || 'no response'}) — returning empty POIs`);
      return [];
    }

    const data = await response.json();
    const pois: POIResult[] = [];

    for (const element of data.elements || []) {
      const elLat = element.lat || element.center?.lat;
      const elLng = element.lon || element.center?.lon;
      if (!elLat || !elLng) continue;

      const distance = this.calculateDistance(lat, lng, elLat, elLng);
      if (distance > radius) continue;

      const name = element.tags?.name || element.tags?.['name:es'] || this.getPOIName(element.tags);
      const type = this.getPOIType(element.tags);
      const category = this.getPOICategory(element.tags);

      if (name || type !== 'unknown') {
        pois.push({
          name: name || type,
          type,
          category,
          distance: Math.round(distance),
          osmId: element.id,
        });
      }
    }

    pois.sort((a, b) => a.distance - b.distance);
    this.logger.log(`Found ${pois.length} POIs nearby`);
    return pois.slice(0, 20);
  }

  // ─── VALIDATE LOCATION FOR QUEST ──────────────────
  async validateLocationForQuest(
    lat: number,
    lng: number,
    questCategory: string,
    questTitle: string,
    questDescription: string,
  ): Promise<GeofenceValidationResult> {
    this.logger.log(`Validating location for quest: "${questTitle}" (${questCategory})`);

    const geocode = await this.reverseGeocode(lat, lng);
    const nearbyPOIs = await this.findNearbyPOIs(lat, lng);

    const categoryConfig = CATEGORY_POI_MAP[questCategory];
    let questCategoryMatch = false;
    let confidence = 50;
    let notes = '';

    if (categoryConfig) {
      const matchingPOIs = nearbyPOIs.filter((poi) => {
        const typeMatch = categoryConfig.tags.some((tag) =>
          poi.type.toLowerCase().includes(tag) || poi.category.toLowerCase().includes(tag),
        );
        const keywordMatch = categoryConfig.keywords.some((kw) =>
          poi.name.toLowerCase().includes(kw) || poi.type.toLowerCase().includes(kw),
        );
        return typeMatch || keywordMatch;
      });

      if (matchingPOIs.length > 0) {
        questCategoryMatch = true;
        confidence = 85 + Math.min(matchingPOIs.length * 3, 10);
        notes = `Found ${matchingPOIs.length} relevant POI(s): ${matchingPOIs.slice(0, 3).map((p) => p.name).join(', ')}`;
      } else if (nearbyPOIs.length > 0) {
        confidence = 60;
        notes = `${nearbyPOIs.length} POIs nearby, none matching ${questCategory}`;
      } else {
        // No POIs — check reverse geocode type
        const locationType = geocode.type || '';
        const natureTypes = ['park', 'garden', 'nature_reserve', 'wood', 'fell', 'scrub', 'grassland', 'peak', 'mountain'];
        const isNatureType = natureTypes.some((t) => locationType.includes(t));

        if (isNatureType && questCategory === 'nature') {
          confidence = 80;
          notes = `Location type '${locationType}' matches nature quest (via Nominatim)`;
          questCategoryMatch = true;
        } else {
          confidence = 55;
          notes = `No POIs found (Overpass may be unavailable). Location: ${geocode.displayName.substring(0, 120)}`;
        }
      }
    }

    // Boost if quest description mentions location keywords
    const descLower = questDescription.toLowerCase();
    const locationLower = geocode.displayName.toLowerCase();
    const locationKeywords = locationLower.split(/[,\s]+/).filter((w) => w.length > 3);
    if (locationKeywords.some((kw) => descLower.includes(kw))) {
      confidence = Math.min(confidence + 10, 95);
      notes += ' (quest description mentions this area)';
    }

    return {
      isRelevant: questCategoryMatch || confidence >= 70,
      confidence,
      locationName: geocode.displayName.substring(0, 200),
      nearbyPOIs: nearbyPOIs.slice(0, 10),
      questCategoryMatch,
      notes,
    };
  }

  // ─── DISTANCE (Haversine) ─────────────────────────
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private getPOIName(tags: any): string | null {
    return tags?.name || tags?.['name:es'] || tags?.['name:en'] || null;
  }

  private getPOIType(tags: any): string {
    if (tags?.amenity) return tags.amenity;
    if (tags?.leisure) return tags.leisure;
    if (tags?.tourism) return tags.tourism;
    if (tags?.natural) return tags.natural;
    if (tags?.shop) return tags.shop;
    if (tags?.landuse) return tags.landuse;
    return 'unknown';
  }

  private getPOICategory(tags: any): string {
    if (tags?.amenity) return `amenity/${tags.amenity}`;
    if (tags?.leisure) return `leisure/${tags.leisure}`;
    if (tags?.tourism) return `tourism/${tags.tourism}`;
    if (tags?.natural) return `natural/${tags.natural}`;
    return 'other';
  }
}
