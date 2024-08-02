import { Injectable } from '@nestjs/common';
import { S3Service } from 'aws/src/lib/s3.service';
import { getCountryISO3 } from "country-iso-2-to-3";
import * as lodash from 'lodash';
import moment from 'moment';
import { v4 as uuid } from 'uuid';
import * as XLSX from 'xlsx';
import { accountSchema, calculateAllKeys } from '../utills/account';
@Injectable()
export class AppService {
  CACHED_PARSED_EXCELS: Map<string,{
    headersInfo: {
        inputHeader: string;
        inputType: string;
    }[];
    contractInfo: any[];
    data: unknown[];
  }> = new Map();

  constructor(private readonly s3Service: S3Service) {
  }

  getData(): { message: string } {
    return ({ message: 'Hello API' });
  }

  async getSignedUrl(
    path: string,
    operation: 'putObject' | 'getObject' = 'putObject',
    expires = 60
  ): Promise<string> {
    return await this.s3Service.getPreSignedURL('naologic-importer',path,operation,expires);
  }

  private streamToBuffer(stream: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async parseExcelFile(
    fileName: string
  ){
    const response = await this.s3Service.getObject('naologic-importer', fileName);
    if(!response) return undefined;
    const workbook = XLSX.read(await this.streamToBuffer(response.Body), {
      type: 'buffer',
    });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    // const maxRow = worksheet['!ref'].split(':')[1].match(/\d+/)[0];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const headers: string[] = jsonData.shift() as string[];
    const headersInfo = headers.map((header: string, index: number) => {
      const row = jsonData[0];
      let inputType: string = typeof row[index];
      if(!inputType || inputType === 'undefined') inputType = 'string';
      return {
        inputHeader: header,
        inputType: inputType,
      }
    });
    const res = {
      headersInfo,
      contractInfo: calculateAllKeys(),
      data: jsonData
    };
    this.CACHED_PARSED_EXCELS.set(fileName, res);
    return res;
  }

  async mapDocumentPreview(
    fileName: string,
    body: {targetHeader: string, targetHeaderType:string, inputHeader: string}[]
  ){
    const filteredData = body.filter(item => item.targetHeader && item.targetHeader.trim() !== '');
    const mergedStructure = filteredData.reduce((acc, item) => {
      const nestedStructure = createNestedStructure(item.targetHeader, `${item.targetHeaderType}`);
      return lodash.merge(acc, nestedStructure);
    }, {});
    let parsedExcel:{
        headersInfo: {
            inputHeader: string;
            inputType: string;
        }[];
        contractInfo: any[];
        data: unknown[];
    };
    if(this.CACHED_PARSED_EXCELS.has(fileName)){
      parsedExcel = this.CACHED_PARSED_EXCELS.get(fileName);
    }else{
      parsedExcel = await this.parseExcelFile(fileName);
    }
    if(parsedExcel && parsedExcel.data && parsedExcel.data.length > 0) return {
      mergedStructure,
      mappedDocument: mapExcelValues(filteredData, parsedExcel.data[0])
    };
    return {
      mergedStructure,
      mappedDocument: undefined
    };
  }

  async validateDocuments(
    fileName: string,
    currentPage: number,
    pageSize: number,
    body: { targetHeader: string, targetHeaderType: string, inputHeader: string }[]
  ) {
    const filteredData = body.filter(item => item.targetHeader && item.targetHeader.trim() !== '');
    const mergedStructure = filteredData.reduce((acc, item) => {
      const nestedStructure = createNestedStructure(item.targetHeader, `${item.targetHeaderType}`);
      return lodash.merge(acc, nestedStructure);
    }, {});

    let parsedExcel: {
      headersInfo: {
        inputHeader: string;
        inputType: string;
      }[];
      contractInfo: any[];
      data: unknown[];
    };
    
    if (this.CACHED_PARSED_EXCELS.has(fileName)) {
      parsedExcel = this.CACHED_PARSED_EXCELS.get(fileName);
    } else {
      parsedExcel = await this.parseExcelFile(fileName);
    }

    if (parsedExcel && parsedExcel.data && parsedExcel.data.length > 0) {
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = parsedExcel.data.slice(startIndex, endIndex);
      console.log("headerInfo.inputDateFormat");
      const documents = paginatedData.map((data: any) => {
        const document: any = mapExcelValues(filteredData, data);
        console.log("document");
        
        document.id = uuid();
        document.addresses = document?.addresses?.map((address: any) => {
          address.id = uuid();
          return address;
        });
        const { error } = accountSchema.validate(document);
        return {
          document,
          valid: !error,
          errors: error ? error.details: []
        }
      });
      return {
        mergedStructure,
        mappedDocuments: documents
      };
    }
    return {
      mergedStructure,
      mappedDocument: undefined
    };
  }

}

// These functions would go to a utils file
const createObjectFromArray = (keys: string[], value: [] | object | 'string' | 'number') => {
  if (!Array.isArray(keys) || keys.length === 0) {
    throw new Error('Invalid input: keys must be a non-empty array');
  }
  let result = {};
  for (let i = keys.length - 1; i >= 0; i--) {
    if(keys[i] === 'Array0'){
      if(i - 1 >= 0){
        let newValue: [] | object | 'string' | 'number' = [result];
        if(Object.keys(result).length === 0) newValue = value;
        result = {
          [keys[i-1]]: newValue
        };
        i--;
      }
    }else{
      let newValue: [] | object | 'string' | 'number' = result;
      if(Object.keys(result).length === 0) newValue = value;
      result = {
        [keys[i]]: newValue
      };
    }
  }
  return result;
};
const createNestedStructure = (path: string, value: any) => {
  path = path.replace(/\[N\].{0,1}/g, '[N]Array0[N]');
  const segments = path.split(/\[N\]|\./).filter(segment => segment !== '');
  const obj = createObjectFromArray(segments, value);
  return obj;
};
function decodeArrays(obj: any) {
  const regex = /\[\d+\]/;
  Object.keys(obj).forEach(key => {
    if(regex.test(key)){
      const newKey = key.replace(/\[\d+\]/, '');
      if(!obj[newKey]) obj[newKey] = [];
      obj[newKey].push(obj[key]);
      delete obj[key];
      decodeArrays(obj[newKey]);
    }else if(typeof obj[key] === 'object'){
      decodeArrays(obj[key]);
    }else if(Array.isArray(obj[key])){
      obj[key].forEach((item: any) => {
        decodeArrays(item);
      });
    }
  });
}
function mapExcelValues(headersInfo: any, parsedExcel: any) {
  let result = {};

  for(let i = 0; i < headersInfo.length; i++){
    const headerInfo = headersInfo[i];
    const indexMatch = headerInfo.inputHeader.match(/\.(\d+)\./);
    const arrayIndex = indexMatch ? parseInt(indexMatch[1], 10) : 0;
    const targetHeaderWithIndex = headerInfo.targetHeader.replace(/\[N\]/g, `[${arrayIndex}]`);
    let value = parsedExcel[headerInfo.index];
    if(headerInfo.inputHeaderType === 'date'){
      const example = moment(value,headerInfo.inputDateFormat);
      if(!example.isValid()){
        value = 'invalid';
      }else{
        value = example.toISOString();
      }
    }
    if(['country','language'].includes(headerInfo.inputHeader)){
      const resISO3 = getCountryISO3(value);
      if(resISO3) value = resISO3
    }
    if(headerInfo.inputHeaderType === 'number'){
      if(isNaN(value)){
        value = 'invalid';
      }else{
        value = parseFloat(value);
      }
    }
    const pobj = createNestedStructure(targetHeaderWithIndex,value);
    result = lodash.merge(result, pobj);
  }
  decodeArrays(result)
  if(result['firstName'] && result['lastName']){
    result['fullName'] = `${result['firstName']} ${result['lastName']}`;
    delete result['firstName'];
    delete result['lastName'];
  }
  return result;
}