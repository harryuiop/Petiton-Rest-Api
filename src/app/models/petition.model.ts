import {getPool} from "../../config/db";
import Logger from "../../config/logger";
import {ResultSetHeader} from "mysql2";

const getAllPetitionFromSearchUnfilterd = async (): Promise<any> => {
    Logger.info("Returning the entire unfilterd table for all petitions");

    const conn = await getPool().getConnection();
    const query = `
        SELECT
            petition.id AS petitionId,
            petition.title AS title,
            petition.description AS description,
            petition.category_id AS categoryId,
            petition.owner_id AS ownerId,
            user.first_name AS ownerFirstName,
            user.last_name AS ownerLastName,
            petition_count AS numberOfSupporters,
            petition.creation_date AS creationDate,
            totalcost AS supportingCost,
            support_counts.id AS supporterId
        FROM
            petition
        LEFT JOIN
            user ON user.id = petition.owner_id
        LEFT JOIN
            (SELECT
                id,
                petition_id,
                COUNT(*) AS petition_count
            FROM
                supporter
            GROUP BY
                petition_id) AS support_counts ON petition.id = support_counts.petition_id
        LEFT JOIN
            (SELECT
                petition_id,
                MIN(cost) AS totalcost
            FROM
                support_tier
            GROUP BY
                petition_id) AS costs ON petition.id = costs.petition_id`;
    const [ rows ] = await conn.query( query );
    await conn.release();
    return rows;
};

const getFullPetitionSupportTable = async (): Promise<any> => {
    Logger.info(`Getting full petition supporter table`);

    const conn = await getPool().getConnection();
    const query = 'SELECT user_id, petition_id FROM `supporter` ORDER BY user_id'
    const [ rows ] = await conn.query( query );
    await conn.release();
    return rows;
}

const checkCategoryValid = async (categoryId: number): Promise<boolean> => {
    Logger.info(`Checking if the categoryId reference is an existing category`);

    const conn = await getPool().getConnection();
    const query = 'SELECT id FROM petition WHERE category_id = ?'
    const [ rows ] = await conn.query( query, [ categoryId ] );
    await conn.release();
    return rows.length === 0;
}

const checkTitleUnique = async (title: string):Promise<boolean> => {
    Logger.info(`Checking if the title in unique`);

    const conn = await getPool().getConnection();
    const query = 'SELECT title FROM petition WHERE title = ?'
    const [ rows ] = await conn.query( query, [ title ] );
    await conn.release();
    return rows.length === 0;
}

const createPeition = async (title: string, description: string, formattedDate: string, userId: number, categoryId: number): Promise<ResultSetHeader> => {
    Logger.info('Creating petition in the database');

    const conn = await getPool().getConnection();
    const query = `INSERT INTO petition
                                            (title, description, creation_date, owner_id, category_id)
                                            VALUES ( ?, ?, ?, ?, ? )`;
    const [ rows ] = await conn.query( query, [ title, description, formattedDate, userId, categoryId ] );
    await conn.release();
    return rows;
}

const createSupportTier = async (petitionId: number, title: string, description: string, cost: number): Promise<any> => {
    Logger.info('Creating support tier in the datbase');

    const conn = await getPool().getConnection();
    const query = `INSERT INTO support_tier
                                             (petition_id, title, description, cost)
                                            VALUES ( ?, ?, ?, ? )`;
    const [ rows ] = await conn.query( query, [ petitionId, title, description, cost ] );
    await conn.release();
    return rows;
}
const getIdFromAuthToken = async (token: string):Promise<any> => {
    Logger.info('Getting userId from authentication token');

    const conn = await getPool().getConnection();
    const query = `SELECT id FROM user WHERE auth_token = ?`;
    const [ rows ] = await conn.query( query, [ token ] );
    await conn.release();
    return rows;
}

const getAllTitlesOfTier = async (petitionId: number):Promise<any> => {
    Logger.info(`Getting all of the titles of supporter tiers from petition ${petitionId}`);

    const conn = await getPool().getConnection();
    const query = `SELECT title FROM support_tier WHERE petition_id = ?`;
    const [ rows ] = await conn.query( query, [ petitionId ] );
    await conn.release();
    return rows;
}



export { getAllPetitionFromSearchUnfilterd, getAllTitlesOfTier, checkTitleUnique, getFullPetitionSupportTable, createPeition, getIdFromAuthToken, createSupportTier, checkCategoryValid }




