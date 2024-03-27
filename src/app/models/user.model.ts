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
    Logger.info(`Checking if ${email} is in the database`);

    const conn = await getPool().getConnection();
    const query = 'select email from user where email = ?'
    const [ rows ] = await conn.query( query, [ email ]);

    return rows.length === 0;
    }

const alterUserWithoutPassword = async (email: string, first_name: string, last_name: string, userid: number): Promise<ResultSetHeader> => {
    Logger.info(`Updating user ${userid} in the database`);

    const conn = await getPool().getConnection();
    const query = 'update user set email = ?, first_name = ?, last_name = ? where id = ?';
    const [ rows ] = await conn.query( query, [ email, first_name, last_name, userid ]);
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

const getUserIdAndTokenFromEmail = async (email: string): Promise<any> => {
    Logger.info(`Getting User ID and Token from ${email}`);

    const conn = await getPool().getConnection();
    const query = 'select id, auth_token from user where email = ?';
    const [ rows ] = await conn.query( query, [ email ]);
    return rows;
}

const getUserAuthToken = async (id: number):Promise<any> => {
    Logger.info(`Getting User Auth Token for user ${id}`);

    const conn = await getPool().getConnection();
    const query = 'select auth_token from user where id = ?';
    const [ rows ] = await conn.query( query, [ id ]);
    return rows;
}

const updatePassword = async (id: number, password: string): Promise<any> => {
    Logger.info(`Updating User ${id}'s password`);

    const conn = await getPool().getConnection();
    const query = 'update user set password = ? where id = ?';
    const [ rows ] = await conn.query( query, [ password, id ]);
    return rows;
}

const removeUserAuthToken = async (token: string): Promise<any> => {
    Logger.info(`Removing logged in user from the database`);

    const conn = await getPool().getConnection();
    const query = 'update user set auth_token = null where auth_token = ?';
    const [ rows ] = await conn.query( query, [ token ]);
    return rows;
}

const getUserIdFromAuthToken = async (token: string):Promise<any> => {
    Logger.info(`Getting id from user auth token ${token}`);

    const conn = await getPool().getConnection();
    const query = 'select id from user where auth_token = ?';
    const [ rows ] = await conn.query( query, [ token ]);
    return rows;
}

const checkEmailFromToken = async (token: string):Promise<any> => {
    Logger.info(`Getting id from user auth token ${token}`);

    const conn = await getPool().getConnection();
    const query = 'select email from user where auth_token = ?';
    const [ rows ] = await conn.query( query, [ token ]);

    if (rows.length === 0) {
        return null;
    }
    return rows[0].email;
}

const checkTokenExists = async (token: string):Promise<any> => {
    Logger.info(`Getting id from user auth token ${token}`);

    const conn = await getPool().getConnection();
    const query = 'select auth_token from user where auth_token = ?';
    const [ rows ] = await conn.query( query, [ token ]);
    if (rows.length === 0) {
        return null;
    }
    return rows[0].auth_token;
}

export { checkTokenExists, removeUserAuthToken, updatePassword, registerUser, getOne, getHashedPasswordFromEmail,
    checkIfEmailExists, alterUserWithoutPassword, getPasswordFromId, updateUserToken, getUserIdAndTokenFromEmail,
    getUserAuthToken, getUserIdFromAuthToken, checkEmailFromToken }

