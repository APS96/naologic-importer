import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class S3Service{
    client;
    constructor(){
        this.client = new S3Client({ 
            region: 'us-west-2',
            credentials:{
                accessKeyId: 'AKIAU6GDZNW25ARJBWEF',
                secretAccessKey: '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',
            }
        });
        console.log('S3Service created');
    }

    async checkS3Client(){
        if(this.client) return true;
        throw new Error('S3 client not created');
    }

    async getPreSignedURL(
        bucketName: string,
        path: string,
        operation: 'putObject' | 'getObject' = 'putObject',
        expires = 60
    ) {
        try {
            await this.checkS3Client();
            let command;
            switch(operation){
                case 'putObject':
                    command = new PutObjectCommand({
                        Bucket: bucketName,
                        Key: path,
                    });
                    break;
                case 'getObject':
                    command = new GetObjectCommand({
                        Bucket: bucketName,
                        Key: path
                    });
                    break;
                default:
                    throw new Error('Operation not supported');
            }
            const signedUrl = await getSignedUrl(
                this.client, 
                command, 
                { 
                    expiresIn: expires,
                    
                }
            );
            return signedUrl;
        }catch(e){
            console.log(e);
            return undefined;
        }
           
    }

    async getObject(bucketName: string, path: string){
        try {
            await this.checkS3Client();
            const command = new GetObjectCommand({
                Bucket: bucketName,
                Key: path
            });
            const response = await this.client.send(command);
            return response;
        } catch (error) {
            console.log(error);
            return undefined;
        }
    }
}