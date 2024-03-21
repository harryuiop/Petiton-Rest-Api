import {getPool} from "../../config/db";
import Logger from "../../config/logger";
import {ResultSetHeader} from "mysql2";

const checkPetitionExists = async (petitionId: number):Promise<any> => {
    Logger.info(`Checking if petition ${petitionId} exists`);

    const conn = await getPool().getConnection();
    const query = `SELECT id FROM petition WHERE id = ?`;
    const [ rows ] = await conn.query( query, [ petitionId ] );
    await conn.release();
    return rows;
}

const getSupportTierInfo = async (petitionId: number, tierId: number):Promise<any> => {
    Logger.info(`Creating support tier for petition ${petitionId}`);

    const conn = await getPool().getConnection();
    const query = `select title, description, cost from support_tier where petition_id = ? and id = ?`;
    const [ rows ] = await conn.query( query, [ petitionId, tierId ] );
    await conn.release();
    return rows;
}

const updateSupportTier = async (tierId: number, title: string, description: string, cost: number, petitionId: number):Promise<void> => {
    Logger.info(`Creating support tier for petition ${tierId}`);

    const conn = await getPool().getConnection();
    const query = `UPDATE support_tier SET
                                            title = ?, description = ?, cost = ?
                                            WHERE petition_id = ? and id = ?`;
    const [ rows ] = await conn.query( query, [ title, description, cost, petitionId, tierId ] );
    await conn.release();
    return;
}

export { checkPetitionExists, updateSupportTier, getSupportTierInfo }