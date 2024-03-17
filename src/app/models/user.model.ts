import {getPool} from "../../config/db";
import Logger from "../../config/logger";
import {ResultSetHeader} from "mysql2";


const registerUser = async (email: string, first_name: string, last_name: string, password: string): Promise<ResultSetHeader> => {
    Logger.info("Registering User...");

    const conn = await getPool().getConnection();
    const query = 'insert into user (email, first_name, last_name, password) values (?, ?, ?, ?)';
    const [ rows ] = await conn.query( query, [ email, first_name, last_name, password ] );
    await conn.release();
    return rows;
};

const getOne = async (id: number) : Promise<any> => {
    Logger.info(`Getting user ${id} from the database`);

    const conn = await getPool().getConnection();
    const query = 'select email, first_name, last_name from user where id = ?';
    const [ rows ] = await conn.query( query, [ id ] );
    await conn.release();
    return rows;
};

const getHashedPasswordFromEmail = async (email: string): Promise<any> => {
    Logger.info(`Getting hashed password from user ${email} from the database`);

    const conn = await getPool().getConnection();
    const query = 'select password from user where email = ?'
    const [ rows ] = await conn.query( query, [ email ]);
    return rows;
}

const checkIfEmailExists = async (email: string): Promise<boolean> => {
    try {
    Logger.info(`Getting if ${email} is in the database`);

    const conn = await getPool().getConnection();
    const query = 'select email from user where email = ?'
    const [ rows ] = await conn.query( query, [ email ]);

    return rows.length >= 1;
    } catch {
        return false;
    }
}

const alterUser = async (email: string, first_name: string, last_name: string, password: string, userid: number): Promise<ResultSetHeader> => {
    Logger.info(`Updating user ${userid} in the database`);

    const conn = await getPool().getConnection();
    const query = 'update user set email = ?, first_name = ?, last_name = ?, password = ? where id = ?';
    const [ rows ] = await conn.query( query, [ email, first_name, last_name, password, userid ]);
    return rows;
}

const getPasswordFromId = async (id: number): Promise<any> => {
    Logger.info(`Getting user ${id}'s hashed password from the database`);

    const conn = await getPool().getConnection();
    const query = 'select password from user where id = ?';
    const [ rows ] = await conn.query( query, [ id ]);
    return rows;
}

const updateUserToken = async (token: string, email: string): Promise<any> => {
    Logger.info(`Updating ${email}'s token into the database`);

    const conn = await getPool().getConnection();
    const query = 'update user set auth_token = ? where email = ?';
    const [ rows ] = await conn.query( query, [ token, email ]);
    return rows;
}

export { registerUser, getOne, getHashedPasswordFromEmail, checkIfEmailExists, alterUser, getPasswordFromId, updateUserToken }