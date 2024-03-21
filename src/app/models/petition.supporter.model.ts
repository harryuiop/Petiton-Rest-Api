import {getPool} from "../../config/db";
import Logger from "../../config/logger";
import {ResultSetHeader} from "mysql2";

const getAll = async (petitionId: number):Promise<any> => {
    Logger.info('Getting information on all supporters of a sepcific petition');

    const conn = await getPool().getConnection();
    const query= `
                SELECT
                      s.id                 AS supportId,
                      s.support_tier_id AS supportTierId,
                      s.message         AS message,
                      u.id              AS supporterId,
                      u.first_name      AS supporterFirstName,
                      u.last_name       AS supporterLastName,
                      s.timestamp AS timestamp
                FROM
                   supporter s
                   JOIN
                   support_tier st
                ON s.support_tier_id = st.id
                   JOIN
                   \`user\` u ON s.user_id = u.id
                WHERE
                   s.petition_id = ?`;
    const [ rows ] = await conn.query( query, [ petitionId ] );
    await conn.release();
    return rows;
}

const getAllSupportersAtTier = async (petitionId: number, tierId: number):Promise<any> => {
    Logger.info('Getting information on all supporters of a sepcific petition');

    const conn = await getPool().getConnection();
    const query= `SELECT user_id FROM supporter WHERE petition_id = ? AND support_tier_id = ?`;
    const [ rows ] = await conn.query( query, [ petitionId, tierId ] );
    await conn.release();
    return rows;
}

const checkSupporterTierExists = async (petitionId: number, tierId: number):Promise<any> => {
    Logger.info('Getting information on all supporters of a sepcific petition');

    const conn = await getPool().getConnection();
    const query= `SELECT id FROM support_tier WHERE petition_id = ? AND id = ?`;
    const [ rows ] = await conn.query( query, [ petitionId, tierId ] );
    await conn.release();
    return rows;
}

const createSupporter = async (petitionId: number, tierId: number, userId: number, message: string, time: string): Promise<void> => {
    Logger.info('Creating petition in the database');

    const conn = await getPool().getConnection();
    const query = `INSERT INTO supporter
                       (petition_id, support_tier_id, user_id, message, timestamp)
                   VALUES (?, ?, ?, ?, ?)`;
    const [rows] = await conn.query(query, [petitionId, tierId, userId, message, time]);
    await conn.release();
    return;
}

export { getAll, getAllSupportersAtTier, checkSupporterTierExists, createSupporter}