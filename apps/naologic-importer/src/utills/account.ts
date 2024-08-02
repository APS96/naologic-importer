import { ChatOpenAI } from '@langchain/openai';
import Joi from 'joi';
import { calculateKeys } from './calculateKeys';
export class Address {
    id: string;
    city: string;
    country: string;
    line1: string;
    line2?: string;
    state?: string;
    type?: 'shipping' | 'billing';
    zip: string;
}
export const addressSchema = Joi.object({
    id: Joi.string().required(),
    city: Joi.string().required(),
    country: Joi.string().required(),
    line1: Joi.string().required(),
    line2: Joi.string().optional(),
    state: Joi.string().optional(),
    type: Joi.string().valid('shipping', 'billing').optional(),
    zip: Joi.string().required(),
});
export class Account {
    name: string;
    type?: string;
    phoneNumber?: string;
    website?: string;
    notes?: string;
    addresses?: Address[];
    email: string;
    parentAccountId?: string;
}
export const accountSchema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string().optional(),
    phoneNumber: Joi.string().optional(),
    website: Joi.string().optional(),
    notes: Joi.string().optional(),
    addresses: Joi.array().items(addressSchema).optional(),
    email: Joi.string().email().required(),
    parentAccountId: Joi.string().optional(),
});
export const accountSchemaDescription = accountSchema.describe();
export const addressSchemaDescription = addressSchema.describe();
export const calculateAllKeys = () => {
    const description = accountSchemaDescription as any;
    const keys = [];
    calculateKeys(keys,description);
    return keys;
}

export async function classifyData(openAIKey: string, data: any) {
    const prompt = `
    Could you classify the account data 
    into one of these categories? [simple/complete]. 
    Return the complete if accocunt data has all the required fields.

    If parentId exists and has a numeric value then its "child_account"

    This is the acount data:
    ${JSON.stringify(data)}
    This is the schema:
    ${JSON.stringify(accountSchemaDescription)}
    Return the categories as a linebreak separated list. (lowercased)
    `;
    const model = new ChatOpenAI({
        model: 'gpt-3.5-turbo',
        temperature: 0.9,
        apiKey: openAIKey,
    });
    const result = await model.invoke(prompt);
    if(result){
        return (result.content as string).split('\n').map((line: string) => line.trim());
    }
    return result;
}

export async function enhacement(openAIKey: string, data: any) {
    const prompt = `
    Could you enhance the notes field for this account data?
    Make it more clear, understandable and concise.

    This is the acount data:
    ${JSON.stringify(data)}
    This is the schema:
    ${JSON.stringify(accountSchemaDescription)}
    
    Return the account with an enhacend note
    `;
    const model = new ChatOpenAI({
        model: 'gpt-3.5-turbo',
        temperature: 0.9,
        apiKey: openAIKey,
    });
    const result = await model.invoke(prompt);
    if(result){
        return JSON.parse(result.content as string);
    }
    return result;
}