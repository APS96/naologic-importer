import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('generate-presigned-url')
  async getSignedUrl(
    @Query('path') path: string,
  ) {
    try {
      const signedUrl = await this.appService.getSignedUrl(
        path,
        'putObject', // operation
        120 // expires in 120
      );
      return { 
        path,
        uploadURL: signedUrl
      };
    }catch(e){
      return undefined;
    }
  }
  // MISSING: Check if the file is Excel
  @Get('download-presigned-url')
  async downloadSignedUrl(
    @Query('path') path: string,
  ) {
    try {
      const downloadUrl = await this.appService.getSignedUrl(
        path,
        'getObject', // operation
        120 // expires in 120
      );
      return { 
        downloadURL: downloadUrl 
      };
    } catch (error) {
      return undefined;
    }
  }

  @Get('parse-excel')
  async parseExcelFile(
    @Query('file-name') fileName: string
  ){
    const result = await this.appService.parseExcelFile(fileName);
    return result;
  }

  @Post('map-document-preview')
  async mapDocument(
    @Query('file-name') fileName: string,
    @Body() body: {targetHeader: string, targetHeaderType:string,inputHeader: string}[]
  ){
    return this.appService.mapDocumentPreview(fileName, body);
  }

  @Post('validate-documents')
  async validateDocuments(
    @Query('file-name') fileName: string,
    @Query('current-page') currentPage: string,
    @Query('page-size') pageSize: string,
    @Body() body: { targetHeader: string, targetHeaderType: string, inputHeader: string }[]
  ) {
    const page = parseInt(currentPage, 10) || 1;
    const size = parseInt(pageSize, 10) || 10;
    return this.appService.validateDocuments(fileName, page, size, body);
  }
}


