import bcrypt from 'bcrypt';

const hash = async (password: string): Promise<string> => {
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        return hashedPassword;
    } catch (error) {
        throw error;
    }
}

const compare = async (password: string, comp: string): Promise<boolean> => {
    try {
        return await bcrypt.compare(password, comp);
    } catch (error) {
        throw error;
    }
}

function generateToken(length: number) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let token = '';
    for(let i = 0; i < length; i++) {
        token += chars[Math.floor(Math.random() * chars.length)];
    }
    return token;
}

function isValidEmail(email: string): boolean {
    const emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}


export {hash, compare, generateToken, isValidEmail}

