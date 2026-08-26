import { Module, Global } from '@nestjs/common';
import { GeofenceService } from './geofence.service';

@Global()
@Module({
  providers: [GeofenceService],
  exports: [GeofenceService],
})
export class GeofenceModule {}
