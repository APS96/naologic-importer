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