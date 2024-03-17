import {getPool} from "../../config/db";
import Logger from "../../config/logger";
import {ResultSetHeader} from "mysql2";

const getProfileImageFileNameFromId = async (id: string): Promise<any> => {
    Logger.info(`Getting image from user ${id}`);

    const conn = await getPool().getConnection();
    const query = 'select image_filename from user where id = ?';
    const [ rows ] = await conn.query( query, [ id ] );
    await conn.release();
    return rows;
}

const checkUserHasProfileImage = async (id: number): Promise<boolean> => {
    Logger.info(`Checking if user ${id} has a profile photo in the database`);

    const conn = await getPool().getConnection();
    const query = 'select image_filename from user where id = ?';
    const [ rows ] = await conn.query( query, [ id ] );
    await conn.release();

    return rows.length > 0;
}

const updateUserProfileImage = async (filename: string, id: number): Promise <any> => {
    Logger.info(`Updating user ${id}'s profile image in the database`);

    const conn = await getPool().getConnection();
    const query = 'update user set image_filename = ? where id = ?'
    const [ rows ] = await conn.query( query, [ filename, id ] );
    await conn.release();
    return rows;
}

export {getProfileImageFileNameFromId, checkUserHasProfileImage, updateUserProfileImage}