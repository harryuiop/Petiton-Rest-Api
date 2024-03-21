import {getPool} from "../../config/db";
import Logger from "../../config/logger";
import {ResultSetHeader} from "mysql2";

const getProfileImageFileNameFromPetitionId = async (id: number): Promise<any> => {
    Logger.info(`Getting image from user ${id}`);

    const conn = await getPool().getConnection();
    const query = 'select image_filename from petition where id = ?';
    const [ rows ] = await conn.query( query, [ id ] );
    await conn.release();
    return rows;
}

const checkPetitonHasProfileImage = async (id: number): Promise<any> => {
    Logger.info(`Checking if petition ${id} has a profile photo in the database`);

    const conn = await getPool().getConnection();
    const query = 'select image_filename from petition where id = ?';
    const [ rows ] = await conn.query( query, [ id ] );
    await conn.release();
    return rows;
}

const updateUserProfileImage = async (filename: string, id: number): Promise <any> => {
    Logger.info(`Updating petition ${id}'s profile image in the database`);

    const conn = await getPool().getConnection();
    const query = 'update petition set image_filename = ? where id = ?'
    const [ rows ] = await conn.query( query, [ filename, id ] );
    await conn.release();
    return rows;
}

export {getProfileImageFileNameFromPetitionId, checkPetitonHasProfileImage}