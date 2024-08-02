import { AwsModule } from '@naologic-importer/aws';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [AwsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
