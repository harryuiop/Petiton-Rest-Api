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

export { getAllPetitionFromSearchUnfilterd, getFullPetitionSupportTable }




