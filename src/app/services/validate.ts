import Ajv from 'ajv';
import { error } from 'winston';

const ajv = new Ajv({ removeAdditional: 'all', strict: false });

const validate = async (schema: object, data: any) => {
    try {
        const validator = ajv.compile(schema);
        const valid = await validator(data);
        if (!valid) {
            return ajv.errorsText(validator.errors);
        }
        return true;
    } catch (err) {
        // Log the error using Winston
        return err.message;
    }
};

export { validate };
